import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  comments,
  conservationArticles,
  likes,
  posts,
  reports,
  species,
  users,
} from './schema.ts';

const ADMIN_EMAILS = new Set(['fk166494@gmail.com', 'elena.vance@terra-archive.org']);

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Failed to load user record.', { cause: error });
  }
}

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, params.uid));
    if (existing.length > 0) {
      const current = existing[0];
      const nextAvatar =
        current.avatarUrl ||
        params.avatarUrl ||
        '/src/assets/images/avatar_botanical_fern_1790431457091.jpg';
      if (current.email !== params.email || current.avatarUrl !== nextAvatar) {
        const updated = await db
          .update(users)
          .set({ email: params.email, avatarUrl: nextAvatar })
          .where(eq(users.uid, params.uid))
          .returning();
        return updated[0];
      }
      return current;
    }

    const role = ADMIN_EMAILS.has(params.email.toLowerCase()) ? 'admin' : 'user';
    const displayName =
      params.displayName || params.email.split('@')[0] || 'Field Naturalist';
    const defaultAvatar =
      params.avatarUrl || '/src/assets/images/avatar_botanical_fern_1790431457091.jpg';

    const result = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        displayName,
        avatarUrl: defaultAvatar,
        role,
        gdprConsent: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: params.email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    avatarUrl?: string | null;
    bio?: string;
    gdprConsent?: boolean;
    role?: string;
  }
) {
  try {
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.uid, uid))
      .returning();
    const updatedUser = result[0];

    if (updatedUser) {
      const postUpdates: { authorName?: string; authorAvatar?: string | null } = {};
      if (updates.displayName !== undefined) {
        postUpdates.authorName = updatedUser.displayName;
      }
      if (updates.avatarUrl !== undefined) {
        postUpdates.authorAvatar = updatedUser.avatarUrl;
      }

      if (Object.keys(postUpdates).length > 0) {
        await db.update(posts).set(postUpdates).where(eq(posts.userUid, uid));
        await db.update(comments).set(postUpdates).where(eq(comments.userUid, uid));
      }
    }

    return updatedUser;
  } catch (error) {
    console.error('Database query failed in updateUserProfile:', error);
    throw new Error('Failed to update user profile.', { cause: error });
  }
}

export async function deleteUserDataGdpr(uid: string) {
  try {
    await db.delete(likes).where(eq(likes.userUid, uid));
    await db.delete(comments).where(eq(comments.userUid, uid));
    await db.delete(posts).where(eq(posts.userUid, uid));
    await db.delete(users).where(eq(users.uid, uid));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deleteUserDataGdpr:', error);
    throw new Error('Failed to delete user personal data.', { cause: error });
  }
}

export async function getUserProfileWithActivity(uid: string) {
  try {
    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    const user = userRows[0] || null;

    const uploadedPosts = await db
      .select()
      .from(posts)
      .where(and(eq(posts.userUid, uid), eq(posts.status, 'active')))
      .orderBy(desc(posts.createdAt));

    const likedRows = await db
      .select({
        post: posts,
      })
      .from(likes)
      .innerJoin(posts, eq(likes.postId, posts.id))
      .where(and(eq(likes.userUid, uid), eq(posts.status, 'active')))
      .orderBy(desc(likes.createdAt));

    return {
      user,
      uploadedPosts,
      likedPosts: likedRows.map((r) => r.post),
    };
  } catch (error) {
    console.error('Database query failed in getUserProfileWithActivity:', error);
    throw new Error('Failed to load user profile and field archive.', { cause: error });
  }
}

export async function listPosts(filters: {
  continent?: string;
  country?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  viewerUid?: string;
}) {
  try {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 12));
    const offset = (page - 1) * limit;

    const conditions = [eq(posts.status, 'active')];

    if (filters.continent && filters.continent !== 'All') {
      conditions.push(eq(posts.continent, filters.continent));
    }
    if (filters.country && filters.country !== 'All') {
      conditions.push(ilike(posts.country, `%${filters.country}%`));
    }
    if (filters.category && filters.category !== 'All') {
      conditions.push(eq(posts.category, filters.category));
    }
    if (filters.search && filters.search.trim() !== '') {
      const q = `%${filters.search.trim()}%`;
      const searchCond = or(
        ilike(posts.title, q),
        ilike(posts.description, q),
        ilike(posts.locationName, q),
        ilike(posts.country, q)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = and(...conditions);

    const rows = await db
      .select()
      .from(posts)
      .where(whereClause)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const allLikes = await db.select().from(likes);
    const allComments = await db
      .select()
      .from(comments)
      .where(eq(comments.status, 'active'))
      .orderBy(comments.createdAt);

    const enrichedPosts = rows.map((post) => {
      const postLikes = allLikes.filter((l) => l.postId === post.id);
      const postComments = allComments.filter((c) => c.postId === post.id);
      return {
        ...post,
        likeCount: postLikes.length,
        likedByMe: filters.viewerUid
          ? postLikes.some((l) => l.userUid === filters.viewerUid)
          : false,
        commentCount: postComments.length,
        comments: postComments,
      };
    });

    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(whereClause);
    const total = Number(totalRows[0]?.count || 0);

    return {
      posts: enrichedPosts,
      total,
      page,
      limit,
      hasMore: offset + rows.length < total,
    };
  } catch (error) {
    console.error('Database query failed in listPosts:', error);
    throw new Error('Failed to load gallery posts.', { cause: error });
  }
}

export async function createPost(input: {
  userUid: string;
  authorName: string;
  authorAvatar?: string | null;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: string;
  latitude: number;
  longitude: number;
  locationName: string;
  continent: string;
  country: string;
  category: string;
  cameraExif?: string | null;
}) {
  try {
    const result = await db
      .insert(posts)
      .values({
        userUid: input.userUid,
        authorName: input.authorName,
        authorAvatar: input.authorAvatar || null,
        title: input.title,
        description: input.description,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType || 'photo',
        latitude: input.latitude,
        longitude: input.longitude,
        locationName: input.locationName,
        continent: input.continent,
        country: input.country,
        category: input.category,
        cameraExif: input.cameraExif || null,
        status: 'active',
      })
      .returning();

    return {
      ...result[0],
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
      comments: [],
    };
  } catch (error) {
    console.error('Database query failed in createPost:', error);
    throw new Error('Failed to publish field observation.', { cause: error });
  }
}

export async function togglePostLike(postId: number, userUid: string) {
  try {
    const existing = await db
      .select()
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userUid, userUid)));

    let liked = false;
    if (existing.length > 0) {
      await db
        .delete(likes)
        .where(and(eq(likes.postId, postId), eq(likes.userUid, userUid)));
      liked = false;
    } else {
      await db.insert(likes).values({ postId, userUid });
      liked = true;
    }

    const updatedLikes = await db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId));

    return {
      postId,
      liked,
      likeCount: updatedLikes.length,
      actorUid: userUid,
    };
  } catch (error) {
    console.error('Database query failed in togglePostLike:', error);
    throw new Error('Failed to toggle like on post.', { cause: error });
  }
}

export async function addPostComment(input: {
  postId: number;
  userUid: string;
  authorName: string;
  authorAvatar?: string | null;
  parentId?: number | null;
  content: string;
}) {
  try {
    const result = await db
      .insert(comments)
      .values({
        postId: input.postId,
        userUid: input.userUid,
        authorName: input.authorName,
        authorAvatar: input.authorAvatar || null,
        parentId: input.parentId || null,
        content: input.content,
        status: 'active',
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in addPostComment:', error);
    throw new Error('Failed to post comment.', { cause: error });
  }
}

export async function listSpecies(filters: {
  kingdom?: string;
  iucnStatus?: string;
  continent?: string;
  search?: string;
}) {
  try {
    const conditions = [];

    if (filters.kingdom && filters.kingdom !== 'All') {
      conditions.push(eq(species.kingdom, filters.kingdom));
    }
    if (filters.iucnStatus && filters.iucnStatus !== 'All') {
      conditions.push(eq(species.iucnStatus, filters.iucnStatus));
    }
    if (filters.continent && filters.continent !== 'All') {
      conditions.push(eq(species.continent, filters.continent));
    }
    if (filters.search && filters.search.trim() !== '') {
      const q = `%${filters.search.trim()}%`;
      const searchCond = or(
        ilike(species.commonName, q),
        ilike(species.scientificName, q),
        ilike(species.habitat, q),
        ilike(species.threats, q)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(species)
            .where(and(...conditions))
            .orderBy(species.commonName)
        : await db.select().from(species).orderBy(species.commonName);

    return rows;
  } catch (error) {
    console.error('Database query failed in listSpecies:', error);
    throw new Error('Failed to query endangered species database.', { cause: error });
  }
}

export async function upsertSpeciesRecord(input: {
  scientificName: string;
  commonName: string;
  kingdom: string;
  iucnStatus: string;
  populationTrend: string;
  populationEstimate: string;
  continent: string;
  habitat: string;
  threats: string;
  conservationActions: string;
  description: string;
  imageUrl?: string | null;
}) {
  try {
    const result = await db
      .insert(species)
      .values({
        scientificName: input.scientificName,
        commonName: input.commonName,
        kingdom: input.kingdom,
        iucnStatus: input.iucnStatus,
        populationTrend: input.populationTrend,
        populationEstimate: input.populationEstimate,
        continent: input.continent,
        habitat: input.habitat,
        threats: input.threats,
        conservationActions: input.conservationActions,
        description: input.description,
        imageUrl: input.imageUrl || null,
      })
      .onConflictDoUpdate({
        target: species.scientificName,
        set: {
          commonName: input.commonName,
          kingdom: input.kingdom,
          iucnStatus: input.iucnStatus,
          populationTrend: input.populationTrend,
          populationEstimate: input.populationEstimate,
          continent: input.continent,
          habitat: input.habitat,
          threats: input.threats,
          conservationActions: input.conservationActions,
          description: input.description,
          imageUrl: input.imageUrl || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertSpeciesRecord:', error);
    throw new Error('Failed to save species record.', { cause: error });
  }
}

export async function listConservationArticles(pillar?: string) {
  try {
    if (pillar && pillar !== 'All') {
      return await db
        .select()
        .from(conservationArticles)
        .where(eq(conservationArticles.pillar, pillar))
        .orderBy(conservationArticles.id);
    }
    return await db.select().from(conservationArticles).orderBy(conservationArticles.id);
  } catch (error) {
    console.error('Database query failed in listConservationArticles:', error);
    throw new Error('Failed to load conservation articles.', { cause: error });
  }
}

export async function createReport(input: {
  targetType: 'post' | 'comment';
  targetId: number;
  reporterUid: string;
  reporterName: string;
  reason: string;
  details?: string;
}) {
  try {
    const result = await db
      .insert(reports)
      .values({
        targetType: input.targetType,
        targetId: input.targetId,
        reporterUid: input.reporterUid,
        reporterName: input.reporterName,
        reason: input.reason,
        details: input.details || null,
        status: 'pending',
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in createReport:', error);
    throw new Error('Failed to submit moderation report.', { cause: error });
  }
}

export async function listModerationReports() {
  try {
    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const allPosts = await db.select().from(posts);
    const allComments = await db.select().from(comments);

    return allReports.map((rep) => {
      if (rep.targetType === 'post') {
        const targetPost = allPosts.find((p) => p.id === rep.targetId);
        return {
          ...rep,
          targetSummary: targetPost
            ? `${targetPost.title} (by ${targetPost.authorName})`
            : `Post #${rep.targetId}`,
          targetStatus: targetPost?.status || 'deleted',
        };
      } else {
        const targetComment = allComments.find((c) => c.id === rep.targetId);
        return {
          ...rep,
          targetSummary: targetComment
            ? `"${targetComment.content.slice(0, 80)}" (by ${targetComment.authorName})`
            : `Comment #${rep.targetId}`,
          targetStatus: targetComment?.status || 'deleted',
        };
      }
    });
  } catch (error) {
    console.error('Database query failed in listModerationReports:', error);
    throw new Error('Failed to fetch moderation reports.', { cause: error });
  }
}

export async function resolveModerationReport(input: {
  reportId: number;
  action: 'dismiss' | 'hide_target' | 'restore_target';
}) {
  try {
    const existingRows = await db
      .select()
      .from(reports)
      .where(eq(reports.id, input.reportId));
    const report = existingRows[0];
    if (!report) {
      throw new Error('Report not found');
    }

    if (input.action === 'hide_target') {
      if (report.targetType === 'post') {
        await db
          .update(posts)
          .set({ status: 'hidden' })
          .where(eq(posts.id, report.targetId));
      } else {
        await db
          .update(comments)
          .set({ status: 'hidden' })
          .where(eq(comments.id, report.targetId));
      }
      await db
        .update(reports)
        .set({ status: 'resolved' })
        .where(eq(reports.id, input.reportId));
    } else if (input.action === 'restore_target') {
      if (report.targetType === 'post') {
        await db
          .update(posts)
          .set({ status: 'active' })
          .where(eq(posts.id, report.targetId));
      } else {
        await db
          .update(comments)
          .set({ status: 'active' })
          .where(eq(comments.id, report.targetId));
      }
      await db
        .update(reports)
        .set({ status: 'resolved' })
        .where(eq(reports.id, input.reportId));
    } else {
      await db
        .update(reports)
        .set({ status: 'dismissed' })
        .where(eq(reports.id, input.reportId));
    }

    return {
      reportId: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      action: input.action,
    };
  } catch (error) {
    console.error('Database query failed in resolveModerationReport:', error);
    throw new Error('Failed to update moderation status.', { cause: error });
  }
}
