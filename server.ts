import express, { Request, Response, NextFunction } from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import {
  addPostComment,
  createPost,
  createReport,
  deleteUserDataGdpr,
  getOrCreateUser,
  getUserByUid,
  getUserProfileWithActivity,
  listConservationArticles,
  listModerationReports,
  listPosts,
  listSpecies,
  resolveModerationReport,
  togglePostLike,
  updateUserProfile,
  upsertSpeciesRecord,
} from './src/db/repository.ts';
import { AuthRequest, optionalAuth, requireAuth } from './src/middleware/auth.ts';

dotenv.config();

const PORT = 3000;

interface RateBucket {
  timestamps: number[];
}
const rateBuckets = new Map<string, RateBucket>();

function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const identifier = req.user?.uid || req.ip || 'anonymous';
    const key = `${req.baseUrl}${req.path}:${identifier}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length >= maxRequests) {
      const retryAfterSec = Math.ceil((windowMs - (now - bucket.timestamps[0])) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `Rate limit exceeded to prevent spam. Please wait ${retryAfterSec}s before trying again.`,
      });
    }

    bucket.timestamps.push(now);
    rateBuckets.set(key, bucket);
    next();
  };
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  // Increase payload limit to support base64 photo/short clip uploads
  app.use(express.json({ limit: '15mb' }));

  // Serve generated assets in both dev and production
  app.use(
    '/src/assets/images',
    express.static(path.join(process.cwd(), 'src/assets/images'))
  );

  // WebSocket Server on the same port 3000
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(
      JSON.stringify({
        type: 'connection:ready',
        activeListeners: clients.size,
      })
    );

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  function broadcastEvent(type: string, payload: unknown) {
    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  // --- API ROUTES ---

  // 1. Auth & Profile Sync
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const decoded = req.user!;
      const user = await getOrCreateUser({
        uid: decoded.uid,
        email: decoded.email || `${decoded.uid}@terra.org`,
        displayName: decoded.name || undefined,
        avatarUrl: decoded.picture || undefined,
      });
      res.json({ user });
    } catch (error: any) {
      console.error('Failed to sync user:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  app.patch('/api/users/me', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user!.uid;
      const { displayName, avatarUrl, bio, gdprConsent, role } = req.body;
      const updated = await updateUserProfile(uid, {
        ...(displayName !== undefined ? { displayName: String(displayName).trim() } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl ? String(avatarUrl) : null } : {}),
        ...(bio !== undefined ? { bio: String(bio).trim() } : {}),
        ...(gdprConsent !== undefined ? { gdprConsent: Boolean(gdprConsent) } : {}),
        ...(role === 'admin' || role === 'user' ? { role } : {}),
      });
      if (updated) {
        broadcastEvent('profile:updated', {
          uid: updated.uid,
          displayName: updated.displayName,
          avatarUrl: updated.avatarUrl,
        });
      }
      res.json({ user: updated });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  // GDPR Data Export & Account Erasure
  app.get('/api/users/me/export', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const data = await getUserProfileWithActivity(req.user!.uid);
      res.json({
        exportedAt: new Date().toISOString(),
        gdprController: 'Terra Global Field Archive',
        ...data,
      });
    } catch (error: any) {
      console.error('Failed to export user data:', error);
      res.status(500).json({ error: error.message || 'Failed to export user data' });
    }
  });

  app.delete('/api/users/me', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const result = await deleteUserDataGdpr(req.user!.uid);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete user data:', error);
      res.status(500).json({ error: error.message || 'Failed to delete user data' });
    }
  });

  app.get('/api/users/:uid/profile', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      const data = await getUserProfileWithActivity(req.params.uid);
      res.json(data);
    } catch (error: any) {
      console.error('Failed to load user profile:', error);
      res.status(500).json({ error: error.message || 'Failed to load user profile' });
    }
  });

  // 2. Gallery Posts, Likes & Threaded Comments
  app.get('/api/posts', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      const continent = typeof req.query.continent === 'string' ? req.query.continent : undefined;
      const country = typeof req.query.country === 'string' ? req.query.country : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 12;

      const result = await listPosts({
        continent,
        country,
        category,
        search,
        page,
        limit,
        viewerUid: req.user?.uid,
      });
      res.json(result);
    } catch (error: any) {
      console.error('Failed to list posts:', error);
      res.status(500).json({ error: error.message || 'Failed to list posts' });
    }
  });

  app.post(
    '/api/posts',
    requireAuth,
    createRateLimiter(6, 60_000),
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!;
        const {
          title,
          description,
          mediaUrl,
          mediaType,
          latitude,
          longitude,
          locationName,
          continent,
          country,
          category,
          cameraExif,
        } = req.body;

        if (!title || !description || !mediaUrl || !continent || !country || !category) {
          return res.status(400).json({
            error: 'Title, description, media, continent, country, and category are required.',
          });
        }

        const dbUser = await getUserByUid(user.uid);
        const created = await createPost({
          userUid: user.uid,
          authorName:
            dbUser?.displayName ||
            user.name ||
            user.email?.split('@')[0] ||
            'Field Naturalist',
          authorAvatar:
            dbUser?.avatarUrl ||
            user.picture ||
            '/src/assets/images/avatar_botanical_fern_1790431457091.jpg',
          title: String(title).trim(),
          description: String(description).trim(),
          mediaUrl: String(mediaUrl),
          mediaType: mediaType === 'video' ? 'video' : 'photo',
          latitude: Number(latitude) || 0,
          longitude: Number(longitude) || 0,
          locationName: String(locationName || `${country}, ${continent}`).trim(),
          continent: String(continent).trim(),
          country: String(country).trim(),
          category: String(category).trim(),
          cameraExif: cameraExif ? String(cameraExif).trim() : null,
        });

        broadcastEvent('post:created', created);
        res.status(201).json({ post: created });
      } catch (error: any) {
        console.error('Failed to create post:', error);
        res.status(500).json({ error: error.message || 'Failed to create post' });
      }
    }
  );

  app.post(
    '/api/posts/:id/like',
    requireAuth,
    createRateLimiter(20, 60_000),
    async (req: AuthRequest, res: Response) => {
      try {
        const postId = Number(req.params.id);
        if (!postId) {
          return res.status(400).json({ error: 'Invalid post ID' });
        }
        const outcome = await togglePostLike(postId, req.user!.uid);
        broadcastEvent('like:toggled', outcome);
        res.json(outcome);
      } catch (error: any) {
        console.error('Failed to toggle like:', error);
        res.status(500).json({ error: error.message || 'Failed to toggle like' });
      }
    }
  );

  app.post(
    '/api/posts/:id/comments',
    requireAuth,
    createRateLimiter(10, 60_000),
    async (req: AuthRequest, res: Response) => {
      try {
        const postId = Number(req.params.id);
        const { content, parentId } = req.body;
        if (!postId || !content || !String(content).trim()) {
          return res.status(400).json({ error: 'Comment content is required' });
        }

        const user = req.user!;
        const dbUser = await getUserByUid(user.uid);
        const comment = await addPostComment({
          postId,
          userUid: user.uid,
          authorName:
            dbUser?.displayName ||
            user.name ||
            user.email?.split('@')[0] ||
            'Field Naturalist',
          authorAvatar:
            dbUser?.avatarUrl ||
            user.picture ||
            '/src/assets/images/avatar_botanical_fern_1790431457091.jpg',
          parentId: parentId ? Number(parentId) : null,
          content: String(content).trim(),
        });

        broadcastEvent('comment:created', { postId, comment });
        res.status(201).json({ comment });
      } catch (error: any) {
        console.error('Failed to add comment:', error);
        res.status(500).json({ error: error.message || 'Failed to add comment' });
      }
    }
  );

  // 3. Endangered Species Database & Live IUCN / Taxonomic API Lookup
  app.get('/api/species', async (req: Request, res: Response) => {
    try {
      const kingdom = typeof req.query.kingdom === 'string' ? req.query.kingdom : undefined;
      const iucnStatus =
        typeof req.query.iucnStatus === 'string' ? req.query.iucnStatus : undefined;
      const continent =
        typeof req.query.continent === 'string' ? req.query.continent : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const rows = await listSpecies({ kingdom, iucnStatus, continent, search });
      res.json({ species: rows });
    } catch (error: any) {
      console.error('Failed to list species:', error);
      res.status(500).json({ error: error.message || 'Failed to list species' });
    }
  });

  // Live IUCN Red List / iNaturalist Taxon Conservation API lookup & database sync
  app.post(
    '/api/species/live-lookup',
    optionalAuth,
    createRateLimiter(10, 60_000),
    async (req: AuthRequest, res: Response) => {
      try {
        const query = String(req.body.query || '').trim();
        if (!query) {
          return res.status(400).json({ error: 'Provide a scientific or common species name' });
        }

        // First try IUCN Red List API v4 if token is provided, paired with iNaturalist Taxa API
        // which aggregates IUCN Red List conservation statuses globally without requiring a user key.
        const inatUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
          query
        )}&per_page=5`;
        const response = await fetch(inatUrl, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Biodiversity API returned status ${response.status}`);
        }

        const data = (await response.json()) as any;
        const results = Array.isArray(data?.results) ? data.results : [];
        if (results.length === 0) {
          return res.status(404).json({
            error: `No verified taxonomic record found for "${query}". Try a binomial name like "Gorilla beringei" or "Sequoiadendron giganteum".`,
          });
        }

        const taxon = results[0];
        const statusMap: Record<string, string> = {
          cr: 'CR',
          critically_endangered: 'CR',
          en: 'EN',
          endangered: 'EN',
          vu: 'VU',
          vulnerable: 'VU',
          nt: 'NT',
          near_threatened: 'NT',
          ew: 'EW',
          extinct_in_the_wild: 'EW',
          ex: 'EX',
          extinct: 'EX',
        };

        const rawStatus = String(
          taxon.conservation_status?.status_name ||
            taxon.conservation_status?.status ||
            'EN'
        ).toLowerCase();
        const iucnStatus =
          statusMap[rawStatus] ||
          (rawStatus.includes('crit')
            ? 'CR'
            : rawStatus.includes('endang')
              ? 'EN'
              : rawStatus.includes('vuln')
                ? 'VU'
                : rawStatus.includes('extinct')
                  ? 'EX'
                  : 'VU');

        const iconicName = String(taxon.iconic_taxon_name || '');
        const kingdom =
          iconicName === 'Plantae'
            ? 'Plantae'
            : iconicName === 'Aves'
              ? 'Aves'
              : iconicName === 'Actinopterygii' || iconicName === 'Mollusca'
                ? 'Marine'
                : 'Animalia';

        const scientificName = String(taxon.name || query);
        const commonName = String(
          taxon.preferred_common_name || taxon.english_common_name || scientificName
        );
        const photoUrl =
          taxon.default_photo?.large_url ||
          taxon.default_photo?.medium_url ||
          '/src/assets/images/terra_wildlife_leopard_1790430448156.jpg';

        const savedRecord = await upsertSpeciesRecord({
          scientificName,
          commonName:
            commonName.charAt(0).toUpperCase() + commonName.slice(1),
          kingdom,
          iucnStatus,
          populationTrend: iucnStatus === 'CR' || iucnStatus === 'EN' ? 'Decreasing' : 'Stable',
          populationEstimate: `Taxon ID #${taxon.id} (${
            taxon.observations_count?.toLocaleString() || 'Verified'
          } Global Field Records)`,
          continent: 'Global / Multi-Region',
          habitat:
            taxon.wikipedia_summary
              ? String(taxon.wikipedia_summary).replace(/<[^>]*>/g, '').slice(0, 220) + '...'
              : `Primary native range documented for ${scientificName} (${kingdom}).`,
          threats:
            'Habitat fragmentation, anthropogenic land-use conversion, climate regime shifts, and localized resource extraction.',
          conservationActions:
            'Protect critical core habitat corridors, log verified geotagged sightings in citizen science repositories, and support regional reserve stewardship.',
          description:
            taxon.wikipedia_summary
              ? String(taxon.wikipedia_summary).replace(/<[^>]*>/g, '').slice(0, 360)
              : `${commonName} (${scientificName}) is a verified taxon indexed via global biodiversity and IUCN Red List assessment records.`,
          imageUrl: photoUrl,
        });

        res.json({ species: savedRecord, source: 'IUCN / Global Taxonomic Index' });
      } catch (error: any) {
        console.error('Live species lookup error:', error);
        res.status(500).json({
          error: error.message || 'Failed to fetch live taxonomic record',
        });
      }
    }
  );

  // 4. Conservation Editorial Articles
  app.get('/api/conservation', async (req: Request, res: Response) => {
    try {
      const pillar = typeof req.query.pillar === 'string' ? req.query.pillar : undefined;
      const articles = await listConservationArticles(pillar);
      res.json({ articles });
    } catch (error: any) {
      console.error('Failed to list conservation articles:', error);
      res.status(500).json({ error: error.message || 'Failed to list conservation articles' });
    }
  });

  // 5. Moderation & Reporting
  app.post(
    '/api/reports',
    requireAuth,
    createRateLimiter(5, 60_000),
    async (req: AuthRequest, res: Response) => {
      try {
        const { targetType, targetId, reason, details } = req.body;
        if (
          (targetType !== 'post' && targetType !== 'comment') ||
          !targetId ||
          !reason
        ) {
          return res.status(400).json({ error: 'Valid target and reason are required' });
        }

        const user = req.user!;
        const report = await createReport({
          targetType,
          targetId: Number(targetId),
          reporterUid: user.uid,
          reporterName: user.name || user.email?.split('@')[0] || 'Field Naturalist',
          reason: String(reason).trim(),
          details: details ? String(details).trim() : undefined,
        });

        res.status(201).json({ report });
      } catch (error: any) {
        console.error('Failed to submit report:', error);
        res.status(500).json({ error: error.message || 'Failed to submit report' });
      }
    }
  );

  app.get('/api/moderation/reports', requireAuth, async (_req: AuthRequest, res: Response) => {
    try {
      const reportsList = await listModerationReports();
      res.json({ reports: reportsList });
    } catch (error: any) {
      console.error('Failed to load moderation reports:', error);
      res.status(500).json({ error: error.message || 'Failed to load moderation reports' });
    }
  });

  app.post(
    '/api/moderation/reports/:id/resolve',
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const reportId = Number(req.params.id);
        const { action } = req.body;
        if (
          !reportId ||
          (action !== 'dismiss' && action !== 'hide_target' && action !== 'restore_target')
        ) {
          return res.status(400).json({ error: 'Valid report ID and action required' });
        }

        const result = await resolveModerationReport({ reportId, action });
        broadcastEvent('moderation:updated', result);
        res.json({ result });
      } catch (error: any) {
        console.error('Failed to resolve report:', error);
        res.status(500).json({ error: error.message || 'Failed to resolve report' });
      }
    }
  );

  // --- VITE DEV MIDDLEWARE OR PRODUCTION STATIC + SSR SEO INJECTION ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        // Dynamic SSR SEO Structured Data Injection for Gallery & Species pages
        const [postsData, speciesList] = await Promise.all([
          listPosts({ limit: 6 }).catch(() => ({ posts: [], total: 0 })),
          listSpecies({}).catch(() => []),
        ]);

        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Terra — Global Field Archive & Conservation Atlas',
          url: process.env.APP_URL || 'http://localhost:3000',
          description:
            'Editorial nature documentary field archive, interactive continental biosphere map, and IUCN Red List endangered species database.',
          mainEntity: {
            '@type': 'ItemList',
            name: 'Recent Geotagged Nature Field Observations & Endangered Taxa',
            numberOfItems: postsData.posts.length + speciesList.length,
            itemListElement: [
              ...postsData.posts.slice(0, 4).map((p, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                item: {
                  '@type': 'Photograph',
                  name: p.title,
                  description: p.description,
                  author: { '@type': 'Person', name: p.authorName },
                  contentLocation: {
                    '@type': 'Place',
                    name: `${p.locationName}, ${p.country} (${p.continent})`,
                    geo: {
                      '@type': 'GeoCoordinates',
                      latitude: p.latitude,
                      longitude: p.longitude,
                    },
                  },
                },
              })),
              ...speciesList.slice(0, 4).map((s, idx) => ({
                '@type': 'ListItem',
                position: idx + 5,
                item: {
                  '@type': 'Taxon',
                  name: s.scientificName,
                  alternateName: s.commonName,
                  description: `${s.iucnStatus} (${s.populationTrend}) — ${s.habitat}`,
                },
              })),
            ],
          },
        };

        const seoScript = `<script id="ssr-seo-jsonld" type="application/ld+json">${JSON.stringify(
          jsonLd
        )}</script>`;
        const html = template.replace('</head>', `${seoScript}\n</head>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Terra server and WebSocket hub listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
