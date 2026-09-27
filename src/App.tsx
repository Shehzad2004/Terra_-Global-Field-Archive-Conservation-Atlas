import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Heart,
  MessageSquare,
  MapPin,
  Search,
  Plus,
  Compass,
  ArrowUpRight,
  LogOut,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import {
  CATEGORIES,
  CONTINENTS,
  CommentItem,
  ConservationArticle,
  IUCN_LABELS,
  PostItem,
  SpeciesItem,
} from './types.ts';
import { MediaImage } from './components/MediaImage.tsx';
import { UserAvatar } from './components/UserAvatar.tsx';
import { CONTINENT_CENTERS, ExplorerMap } from './components/InteractiveMap.tsx';
import { PostDetailModal } from './components/PostDetailModal.tsx';
import { UploadPostModal } from './components/UploadPostModal.tsx';
import { SpeciesSection } from './components/SpeciesSection.tsx';
import { ConservationSection } from './components/ConservationSection.tsx';
import { ProfileAndModerationSection } from './components/ProfileAndModerationSection.tsx';

type NavSection = 'gallery' | 'continents' | 'species' | 'conservation' | 'profile';

function TerraApplication() {
  const { firebaseUser, profile, signInWithGoogle, logout, authFetch } = useAuth();

  const [activeNav, setActiveNav] = useState<NavSection>('gallery');

  // Gallery & Map Filter State
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [selectedContinent, setSelectedContinent] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [gallerySearch, setGallerySearch] = useState<string>('');

  // Species State
  const [speciesList, setSpeciesList] = useState<SpeciesItem[]>([]);
  const [allRealmSpecies, setAllRealmSpecies] = useState<SpeciesItem[]>([]);
  const [realmLifeformFilter, setRealmLifeformFilter] = useState<string>('All');
  const [loadingSpecies, setLoadingSpecies] = useState(false);
  const [speciesKingdom, setSpeciesKingdom] = useState<string>('All');
  const [speciesStatus, setSpeciesStatus] = useState<string>('All');
  const [speciesContinent, setSpeciesContinent] = useState<string>('All');
  const [speciesSearch, setSpeciesSearch] = useState<string>('');

  // Conservation Articles State
  const [articles, setArticles] = useState<ConservationArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // Modals & Inspected States
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [inspectedUid, setInspectedUid] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Dynamic SEO Page Titles
  useEffect(() => {
    const titles: Record<NavSection, string> = {
      gallery: 'Terra — Global Field Archive & Nature Photography Gallery',
      continents: 'Continents Biosphere Explorer — Terra Global Field Archive',
      species: 'IUCN Red List Endangered & Extinct Species Database — Terra',
      conservation: 'Conservation Monographs & Citizen Science Protocols — Terra',
      profile: 'Field Naturalist Dossier & Curatorial Desk — Terra',
    };
    document.title = titles[activeNav];
  }, [activeNav]);

  // Fetch Gallery Posts
  const fetchPosts = useCallback(
    async (pageNum = 1, append = false) => {
      setLoadingPosts(true);
      try {
        const params = new URLSearchParams();
        if (selectedContinent !== 'All') params.set('continent', selectedContinent);
        if (selectedCountry !== 'All') params.set('country', selectedCountry);
        if (selectedCategory !== 'All') params.set('category', selectedCategory);
        if (gallerySearch.trim()) params.set('search', gallerySearch.trim());
        params.set('page', String(pageNum));
        params.set('limit', '12');

        const res = await authFetch(`/api/posts?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setPosts((prev) => {
            if (!append) return data.posts || [];
            const existingIds = new Set(prev.map((p) => p.id));
            const incoming = (data.posts || []).filter(
              (p: PostItem) => !existingIds.has(p.id)
            );
            return [...prev, ...incoming];
          });
          setTotalPosts(data.total || 0);
          setPage(pageNum);
          setHasMore(Boolean(data.hasMore));
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    },
    [selectedContinent, selectedCountry, selectedCategory, gallerySearch, authFetch]
  );

  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  // Fetch Species
  const fetchSpecies = useCallback(async () => {
    setLoadingSpecies(true);
    try {
      const params = new URLSearchParams();
      if (speciesKingdom !== 'All') params.set('kingdom', speciesKingdom);
      if (speciesStatus !== 'All') params.set('iucnStatus', speciesStatus);
      if (speciesContinent !== 'All') params.set('continent', speciesContinent);
      if (speciesSearch.trim()) params.set('search', speciesSearch.trim());

      const res = await fetch(`/api/species?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSpeciesList(data.species || []);
      }
    } catch (err) {
      console.error('Failed to fetch species:', err);
    } finally {
      setLoadingSpecies(false);
    }
  }, [speciesKingdom, speciesStatus, speciesContinent, speciesSearch]);

  useEffect(() => {
    fetchSpecies();
  }, [fetchSpecies]);

  // Load full species catalog for Biogeographic Realm Explorer & Map markers
  useEffect(() => {
    fetch('/api/species')
      .then((r) => r.json())
      .then((data) => {
        if (data.species) {
          setAllRealmSpecies(data.species);
        }
      })
      .catch((err) => console.error('Failed to load realm species:', err));
  }, [speciesList.length]);

  // Fetch Conservation Articles
  useEffect(() => {
    let mounted = true;
    setLoadingArticles(true);
    fetch('/api/conservation')
      .then((r) => r.json())
      .then((data) => {
        if (mounted && data.articles) {
          setArticles(data.articles);
        }
      })
      .catch((err) => console.error('Failed to fetch conservation articles:', err))
      .finally(() => {
        if (mounted) setLoadingArticles(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Real-Time WebSocket Connection with Idempotent Event Reconciliation
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'post:created') {
            const newPost = msg.payload as PostItem;
            setPosts((prev) => {
              if (prev.some((p) => p.id === newPost.id)) return prev;
              return [newPost, ...prev];
            });
            setTotalPosts((t) => t + 1);
          } else if (msg.type === 'like:toggled') {
            const { postId, likeCount, actorUid, liked } = msg.payload as {
              postId: number;
              likeCount: number;
              actorUid: string;
              liked: boolean;
            };
            setPosts((prev) =>
              prev.map((p) => {
                if (p.id !== postId) return p;
                return {
                  ...p,
                  likeCount,
                  likedByMe:
                    firebaseUser && firebaseUser.uid === actorUid ? liked : p.likedByMe,
                };
              })
            );
          } else if (msg.type === 'comment:created') {
            const { postId, comment } = msg.payload as {
              postId: number;
              comment: CommentItem;
            };
            setPosts((prev) =>
              prev.map((p) => {
                if (p.id !== postId) return p;
                const existingComments = p.comments || [];
                if (existingComments.some((c) => c.id === comment.id)) return p;
                const updatedComments = [...existingComments, comment];
                return {
                  ...p,
                  comments: updatedComments,
                  commentCount: updatedComments.length,
                };
              })
            );
          } else if (msg.type === 'profile:updated') {
            const { uid, displayName, avatarUrl } = msg.payload as {
              uid: string;
              displayName: string;
              avatarUrl: string | null;
            };
            setPosts((prev) =>
              prev.map((p) => {
                const updatedComments = (p.comments || []).map((c) =>
                  c.userUid === uid
                    ? { ...c, authorName: displayName, authorAvatar: avatarUrl }
                    : c
                );
                if (p.userUid === uid) {
                  return {
                    ...p,
                    authorName: displayName,
                    authorAvatar: avatarUrl,
                    comments: updatedComments,
                  };
                }
                return { ...p, comments: updatedComments };
              })
            );
          } else if (msg.type === 'moderation:updated') {
            fetchPosts(1, false);
          }
        } catch {
          // Ignore malformed WS frames
        }
      };

      socket.onclose = () => {
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connectWs, 3000);
        }
      };
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [firebaseUser, fetchPosts]);

  // Handlers
  const handleToggleLike = async (postId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.likedByMe;
        return {
          ...p,
          likedByMe: nextLiked,
          likeCount: Math.max(0, p.likeCount + (nextLiked ? 1 : -1)),
        };
      })
    );

    try {
      const res = await authFetch(`/api/posts/${postId}/like`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Could not toggle endorsement');
        await fetchPosts(1, false);
      } else {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likedByMe: data.liked, likeCount: data.likeCount }
              : p
          )
        );
      }
    } catch {
      await fetchPosts(1, false);
    }
  };

  const handleAddComment = async (
    postId: number,
    content: string,
    parentId?: number | null
  ) => {
    const res = await authFetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add comment');
    }
    const newComment = data.comment as CommentItem;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const current = p.comments || [];
        if (current.some((c) => c.id === newComment.id)) return p;
        const updated = [...current, newComment];
        return { ...p, comments: updated, commentCount: updated.length };
      })
    );
  };

  const handleCreatePost = async (payload: {
    title: string;
    description: string;
    mediaUrl: string;
    mediaType: 'photo' | 'video';
    latitude: number;
    longitude: number;
    locationName: string;
    continent: string;
    country: string;
    category: string;
    cameraExif: string;
  }) => {
    const res = await authFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to publish observation');
    }
    const created = data.post as PostItem;
    setPosts((prev) => {
      if (prev.some((p) => p.id === created.id)) return prev;
      return [created, ...prev];
    });
    showToast('Field observation published to the global archive.');
  };

  const handleReport = async (
    targetType: 'post' | 'comment',
    targetId: number,
    reason: string,
    details: string
  ) => {
    const res = await authFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, reason, details }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Report submission failed');
      return;
    }
    showToast('Flag submitted to Curatorial Moderation Desk.');
  };

  const handleLiveSpeciesLookup = async (taxonQuery: string) => {
    const res = await authFetch('/api/species/live-lookup', {
      method: 'POST',
      body: JSON.stringify({ query: taxonQuery }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Taxon lookup failed');
    }
    await fetchSpecies();
  };

  const activePost = posts.find((p) => p.id === activePostId) || null;
  const uniqueCountries = Array.from(new Set(posts.map((p) => p.country))).sort();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#1C1917]">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-[#F7F4EE]/95 backdrop-blur-xs border-b border-[#D6CEBE] px-4 sm:px-8 py-4 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#gallery"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('gallery');
          }}
          className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1917]"
        >
          Terra
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]">
          <button
            type="button"
            onClick={() => setActiveNav('gallery')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'gallery'
                ? 'text-[#1C1917] border-b-2 border-[#C85A32]'
                : 'hover:text-[#1C1917]'
            }`}
          >
            Gallery
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('continents')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'continents'
                ? 'text-[#1C1917] border-b-2 border-[#C85A32]'
                : 'hover:text-[#1C1917]'
            }`}
          >
            Continents
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('species')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'species'
                ? 'text-[#1C1917] border-b-2 border-[#C85A32]'
                : 'hover:text-[#1C1917]'
            }`}
          >
            Species
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('conservation')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'conservation'
                ? 'text-[#1C1917] border-b-2 border-[#C85A32]'
                : 'hover:text-[#1C1917]'
            }`}
          >
            Conservation
          </button>
          <button
            type="button"
            onClick={() => {
              setInspectedUid(null);
              setActiveNav('profile');
            }}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'profile'
                ? 'text-[#1C1917] border-b-2 border-[#C85A32]'
                : 'hover:text-[#1C1917]'
            }`}
          >
            Naturalist
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              if (!firebaseUser) {
                await signInWithGoogle();
              }
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#F7F4EE] bg-[#1B3B2B] rounded-lg hover:bg-[#142C20] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Observation</span>
          </button>

          {firebaseUser ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInspectedUid(firebaseUser.uid);
                  setActiveNav('profile');
                }}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-[#1C1917] bg-[#EBE6DF] border border-[#D6CEBE] rounded-lg hover:bg-[#E0D9CE] transition-colors whitespace-nowrap"
              >
                <UserAvatar
                  src={profile?.avatarUrl || firebaseUser.photoURL}
                  name={profile?.displayName || firebaseUser.displayName || 'Naturalist'}
                  size="xs"
                />
                <span className="truncate max-w-[115px]">
                  {profile?.displayName || firebaseUser.displayName || 'Dossier'}
                </span>
              </button>
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-2 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#EBE6DF] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="px-3.5 py-2 text-xs font-medium text-[#1C1917] bg-[#EBE6DF] border border-[#D6CEBE] rounded-lg hover:bg-[#E0D9CE] transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Mobile Secondary Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-b border-[#D6CEBE] bg-[#EBE6DF] px-2 py-2 text-xs font-medium">
        {(['gallery', 'continents', 'species', 'conservation', 'profile'] as NavSection[]).map(
          (tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveNav(tab)}
              className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap ${
                activeNav === tab ? 'bg-[#1B3B2B] text-[#F7F4EE]' : 'text-[#44403C]'
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1B3B2B] text-[#F7F4EE] px-4 py-3 rounded-xl shadow-lg border border-[#2C523E] text-xs font-medium">
          {toastMessage}
        </div>
      )}

      {/* MAIN CONTENT ROUTER */}
      <main className="flex-1">
        {activeNav === 'gallery' && (
          <div>
            {/* Editorial Split-Screen Hero */}
            <section className="border-b border-[#D6CEBE] bg-[#EBE6DF]/45">
              <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="text-xs uppercase tracking-widest text-[#57534E]">
                    01. Global Biosphere &amp; Documentary Field Archive
                  </div>
                  <h1 className="font-editorial text-4xl sm:text-6xl font-medium text-[#1C1917] leading-[1.08]">
                    Bearing Witness to Earth’s Living Canopies, Oceans &amp; Arid Realms
                  </h1>
                  <p className="text-base text-[#44403C] leading-relaxed max-w-xl">
                    Terra is an open, geotagged natural history repository where field
                    biologists, documentary photographers, and citizen naturalists chronicle
                    fragile ecosystems and track IUCN Red List endangered taxa in real time.
                  </p>

                  {/* Quantitative Rigor Strip (Unboxed Typography) */}
                  <div className="pt-2 border-t border-[#D6CEBE] grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="font-mono-tabular text-xl sm:text-2xl font-semibold text-[#1B3B2B]">
                        7 Realms
                      </div>
                      <div className="text-[#57534E] mt-0.5">
                        Geotagged Continental Biomes
                      </div>
                    </div>
                    <div>
                      <div className="font-mono-tabular text-xl sm:text-2xl font-semibold text-[#1B3B2B]">
                        {speciesList.length} Taxa
                      </div>
                      <div className="text-[#57534E] mt-0.5">
                        IUCN Red List Monitored
                      </div>
                    </div>
                    <div>
                      <div className="font-mono-tabular text-xl sm:text-2xl font-semibold text-[#C85A32]">
                        100% Live
                      </div>
                      <div className="text-[#57534E] mt-0.5">
                        Postgres &amp; WebSocket Sync
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveNav('continents')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C85A32] text-[#F7F4EE] text-xs font-medium hover:bg-[#B04B25] transition-colors whitespace-nowrap"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Explore Interactive World Atlas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNav('species')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#F7F4EE] border border-[#D6CEBE] text-xs font-medium text-[#1C1917] hover:bg-[#E6E1D6] transition-colors whitespace-nowrap"
                    >
                      <span>Inspect Endangered Species Ledger</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right Side Hero Plate */}
                <div className="lg:col-span-6">
                  <div
                    onClick={() => {
                      if (posts[0]) setActivePostId(posts[0].id);
                    }}
                    className="group cursor-pointer relative rounded-2xl overflow-hidden border border-[#D6CEBE] bg-[#1C1917] aspect-[16/10]"
                  >
                    <MediaImage
                      src="/src/assets/images/terra_hero_forest_1790430384043.jpg"
                      alt="Cathedral Light in the Hoh Temperate Rainforest"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-6 text-[#F7F4EE]">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#D6CEBE]">
                        <span>Featured Plate</span>
                        <span aria-hidden="true">·</span>
                        <span>North America · United States</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">47.8609° N, 123.9348° W</span>
                      </div>
                      <h2 className="font-editorial text-2xl sm:text-3xl font-medium mt-1">
                        Cathedral Light in the Hoh Temperate Rainforest
                      </h2>
                      <p className="text-xs text-[#D6CEBE]/90 mt-1">
                        Photographed by Dr. Elena Vance · Leica SL2 · 35mm Summicron f/2.8
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Public Gallery Filter Controls & Media-First Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-8">
              <div className="space-y-4 border-b border-[#D6CEBE] pb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-editorial text-3xl font-semibold text-[#1C1917]">
                      Public Field Dispatches ({totalPosts})
                    </h2>
                    <p className="text-xs text-[#57534E]">
                      Filter geotagged photography and field video clips by biome category,
                      continent, or country.
                    </p>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full lg:w-72">
                    <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={gallerySearch}
                      onChange={(e) => setGallerySearch(e.target.value)}
                      placeholder="Search habitat, species, reserve..."
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg bg-[#EBE6DF] border border-[#D6CEBE] text-[#1C1917] focus:outline-none focus:border-[#1B3B2B]"
                    />
                  </div>
                </div>

                {/* Biome Category Segmented Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EBE6DF] rounded-lg border border-[#D6CEBE]">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                            : 'text-[#44403C] hover:text-[#1C1917]'
                        }`}
                      >
                        {cat === 'All' ? 'All Biomes' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Continent & Country Selectors */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#57534E]">Continent:</span>
                      <select
                        value={selectedContinent}
                        onChange={(e) => {
                          setSelectedContinent(e.target.value);
                          setSelectedCountry('All');
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[#EBE6DF] border border-[#D6CEBE] text-[#1C1917]"
                      >
                        {CONTINENTS.map((cont) => (
                          <option key={cont} value={cont}>
                            {cont === 'All' ? 'All Continents' : cont}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#57534E]">Country:</span>
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[#EBE6DF] border border-[#D6CEBE] text-[#1C1917]"
                      >
                        <option value="All">All Countries</option>
                        {uniqueCountries.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(selectedContinent !== 'All' ||
                      selectedCountry !== 'All' ||
                      selectedCategory !== 'All' ||
                      gallerySearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContinent('All');
                          setSelectedCountry('All');
                          setSelectedCategory('All');
                          setGallerySearch('');
                        }}
                        className="text-xs text-[#C85A32] font-medium hover:underline whitespace-nowrap"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Gallery Grid */}
              {loadingPosts && posts.length === 0 ? (
                <div className="py-20 text-center text-sm text-[#57534E]">
                  Retrieving geotagged field plates from PostgreSQL...
                </div>
              ) : posts.length === 0 ? (
                <div className="py-16 text-center border border-[#D6CEBE] rounded-2xl bg-[#EBE6DF]/40 space-y-3">
                  <p className="font-editorial text-2xl text-[#1C1917]">
                    No field dispatches match this regional filter
                  </p>
                  <p className="text-xs text-[#57534E]">
                    Try clearing the filters or log the first observation for this biome.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {posts.map((post, idx) => {
                    const isLeadFeature = idx === 0 && page === 1 && selectedCategory === 'All';
                    return (
                      <article
                        key={post.id}
                        onClick={() => setActivePostId(post.id)}
                        className={`group cursor-pointer bg-[#EBE6DF]/55 border border-[#D6CEBE] rounded-2xl overflow-hidden flex flex-col justify-between transition-colors hover:border-[#B8AFA0] ${
                          isLeadFeature ? 'md:col-span-2' : ''
                        }`}
                      >
                        <div>
                          <div
                            className={`w-full overflow-hidden bg-[#1C1917] ${
                              isLeadFeature ? 'aspect-[16/9]' : 'aspect-[4/3]'
                            }`}
                          >
                            <MediaImage
                              src={post.mediaUrl}
                              alt={post.title}
                              mediaType={post.mediaType}
                              subtitle={`${post.locationName} · ${post.country}`}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                            />
                          </div>

                          <div className="p-6 space-y-2.5">
                            {/* Zero-Pill Metadata Line */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#57534E]">
                              <span className="font-medium text-[#1B3B2B]">
                                {post.category}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{post.continent}</span>
                              <span aria-hidden="true">·</span>
                              <span>{post.country}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">
                                {post.latitude.toFixed(2)}°, {post.longitude.toFixed(2)}°
                              </span>
                            </div>

                            <h3
                              className={`font-editorial font-semibold text-[#1C1917] group-hover:text-[#C85A32] transition-colors leading-snug ${
                                isLeadFeature ? 'text-2xl sm:text-3xl' : 'text-2xl'
                              }`}
                            >
                              {post.title}
                            </h3>

                            <p className="text-sm text-[#44403C] line-clamp-2 leading-relaxed">
                              {post.description}
                            </p>
                          </div>
                        </div>

                        <div className="px-6 py-3.5 border-t border-[#D6CEBE] bg-[#E6E1D6]/50 flex items-center justify-between text-xs text-[#57534E]">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <UserAvatar
                              src={post.authorAvatar}
                              name={post.authorName}
                              size="xs"
                            />
                            <span className="font-medium text-[#1C1917] truncate">
                              {post.authorName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <MapPin className="w-3 h-3 text-[#C85A32] shrink-0" />
                            <span className="truncate">{post.locationName}</span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleToggleLike(post.id, e)}
                              className={`inline-flex items-center gap-1 font-mono-tabular transition-colors ${
                                post.likedByMe
                                  ? 'text-[#C85A32] font-semibold'
                                  : 'hover:text-[#1C1917]'
                              }`}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  post.likedByMe ? 'fill-current' : ''
                                }`}
                              />
                              <span>{post.likeCount}</span>
                            </button>

                            <span className="inline-flex items-center gap-1 font-mono-tabular">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{post.commentCount}</span>
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Pagination / Load More */}
              {hasMore && (
                <div className="pt-6 text-center">
                  <button
                    type="button"
                    onClick={() => fetchPosts(page + 1, true)}
                    className="px-6 py-2.5 rounded-lg bg-[#EBE6DF] border border-[#D6CEBE] text-xs font-medium text-[#1C1917] hover:bg-[#DFD8CE] transition-colors"
                  >
                    Load Additional Field Records
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* CONTINENTS EXPLORER PAGE */}
        {activeNav === 'continents' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#D6CEBE] pb-8">
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-[#57534E]">
                  02. Interactive Cartographic Atlas
                </div>
                <h1 className="font-editorial text-4xl sm:text-5xl font-medium text-[#1C1917]">
                  Continental Biosphere Explorer
                </h1>
                <p className="text-base text-[#44403C] max-w-2xl leading-relaxed">
                  Select any continental node or geotagged observation marker on the world
                  map below to filter field dispatches to that geographic realm or country.
                </p>
              </div>

              {/* Continent Quick-Switch Bar */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EBE6DF] rounded-lg border border-[#D6CEBE]">
                {CONTINENTS.map((cont) => (
                  <button
                    key={cont}
                    type="button"
                    onClick={() => {
                      setSelectedContinent(cont);
                      setSelectedCountry('All');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      selectedContinent === cont
                        ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                        : 'text-[#44403C] hover:text-[#1C1917]'
                    }`}
                  >
                    {cont}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Leaflet World Map */}
            <ExplorerMap
              posts={posts}
              speciesList={allRealmSpecies}
              selectedContinent={selectedContinent}
              onSelectContinent={(cont) => {
                setSelectedContinent(cont);
                setSelectedCountry('All');
              }}
              onSelectCountry={(country) => {
                setSelectedCountry(country);
              }}
              onOpenPost={(p) => setActivePostId(p.id)}
              onInspectSpecies={(sp) => {
                setSpeciesContinent(sp.continent);
                setSpeciesKingdom('All');
                setSpeciesStatus('All');
                setSpeciesSearch(sp.commonName);
                setActiveNav('species');
              }}
            />

            {/* Continental Biogeographic Realm Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {CONTINENT_CENTERS.map((realm) => {
                const isSelected = selectedContinent === realm.name;
                const realmSpeciesCount = allRealmSpecies.filter(
                  (s) => s.continent === realm.name
                ).length;
                return (
                  <button
                    key={realm.name}
                    type="button"
                    onClick={() => {
                      setSelectedContinent(isSelected ? 'All' : realm.name);
                      setSelectedCountry('All');
                    }}
                    className={`text-left p-5 rounded-xl border transition-colors flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#1B3B2B] text-[#F7F4EE] border-[#1B3B2B]'
                        : 'bg-[#EBE6DF]/60 text-[#1C1917] border-[#D6CEBE] hover:bg-[#EBE6DF]'
                    }`}
                  >
                    <div>
                      <div
                        className={`text-[11px] font-mono-tabular mb-1 ${
                          isSelected ? 'text-[#D6CEBE]' : 'text-[#57534E]'
                        }`}
                      >
                        {realm.realmTitle} · {realmSpeciesCount} Unique Taxa
                      </div>
                      <h3 className="font-editorial text-2xl font-semibold mb-1.5">
                        {realm.name}
                      </h3>
                      <p
                        className={`text-xs leading-relaxed mb-3 ${
                          isSelected ? 'text-[#E6E1D6]' : 'text-[#44403C]'
                        }`}
                      >
                        {realm.biomeSummary}
                      </p>
                    </div>

                    <div
                      className={`pt-3 border-t text-[11px] space-y-1 ${
                        isSelected
                          ? 'border-[#2C523E] text-[#D6CEBE]'
                          : 'border-[#D6CEBE] text-[#57534E]'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-semibold">Fauna:</span>{' '}
                        {realm.famousHighlights.animals}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold">Birds:</span>{' '}
                        {realm.famousHighlights.birds}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold">Flora:</span>{' '}
                        {realm.famousHighlights.treesAndPlants}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold">Aquatic:</span>{' '}
                        {realm.famousHighlights.aquaticLife}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* FAMOUS & UNIQUE NATURE OF THE BIOGEOGRAPHIC REALM */}
            <div className="space-y-6 pt-6 border-t border-[#D6CEBE]">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs uppercase tracking-widest text-[#1B3B2B] font-semibold">
                    Biogeographic Endemism &amp; Iconic Lifeforms
                  </div>
                  <h2 className="font-editorial text-3xl font-semibold text-[#1C1917]">
                    Famous &amp; Unique Nature:{' '}
                    {selectedContinent === 'All'
                      ? 'All 7 Biogeographic Realms'
                      : `${selectedContinent} (${
                          CONTINENT_CENTERS.find((c) => c.name === selectedContinent)
                            ?.realmTitle || ''
                        })`}
                  </h2>
                  <p className="text-xs text-[#57534E]">
                    Explore iconic terrestrial mammals, rare birds, ancient trees, living-fossil
                    plants, and freshwater/marine aquatic animals native to this realm.
                  </p>
                </div>

                {/* Lifeform Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EBE6DF] rounded-lg border border-[#D6CEBE]">
                  {[
                    { id: 'All', label: 'All Lifeforms' },
                    { id: 'Animalia', label: 'Animals' },
                    { id: 'Aves', label: 'Birds' },
                    { id: 'Plantae', label: 'Trees & Plants' },
                    { id: 'Marine', label: 'Aquatic & Marine' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRealmLifeformFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        realmLifeformFilter === tab.id
                          ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                          : 'text-[#44403C] hover:text-[#1C1917]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {allRealmSpecies
                  .filter(
                    (sp) =>
                      (selectedContinent === 'All' ||
                        sp.continent === selectedContinent) &&
                      (realmLifeformFilter === 'All' ||
                        sp.kingdom === realmLifeformFilter)
                  )
                  .map((sp) => {
                    const statusInfo = IUCN_LABELS[sp.iucnStatus] || {
                      label: sp.iucnStatus,
                      full: sp.iucnStatus,
                      tone: 'text-[#1B3B2B]',
                    };
                    const lifeformTag =
                      sp.kingdom === 'Plantae'
                        ? 'Tree / Unique Plant'
                        : sp.kingdom === 'Aves'
                          ? 'Bird (Avian)'
                          : sp.kingdom === 'Marine'
                            ? 'Aquatic / Marine'
                            : 'Terrestrial Animal';

                    return (
                      <article
                        key={sp.id}
                        className="bg-[#EBE6DF]/55 border border-[#D6CEBE] rounded-xl overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-[4/3] w-full overflow-hidden bg-[#1C1917]">
                            <MediaImage
                              src={sp.imageUrl}
                              alt={sp.commonName}
                              subtitle={sp.scientificName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#57534E]">
                              <span className="font-semibold text-[#1B3B2B]">
                                {lifeformTag}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{sp.continent}</span>
                              <span aria-hidden="true">·</span>
                              <span className={`font-semibold ${statusInfo.tone}`}>
                                IUCN {sp.iucnStatus}
                              </span>
                            </div>

                            <div>
                              <h3 className="font-editorial text-xl font-semibold text-[#1C1917] leading-snug">
                                {sp.commonName}
                              </h3>
                              <p className="font-editorial italic text-sm text-[#57534E]">
                                {sp.scientificName}
                              </p>
                            </div>

                            <p className="text-xs text-[#292524] leading-relaxed line-clamp-3">
                              {sp.description}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-3 border-t border-[#D6CEBE] bg-[#E6E1D6]/55 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[#57534E] truncate max-w-[140px]">
                            {sp.populationEstimate}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSpeciesContinent(sp.continent);
                              setSpeciesKingdom(sp.kingdom);
                              setSpeciesStatus('All');
                              setSpeciesSearch('');
                              setActiveNav('species');
                            }}
                            className="inline-flex items-center gap-1 font-medium text-[#1B3B2B] hover:text-[#C85A32] whitespace-nowrap"
                          >
                            <span>Full Dossier</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
            </div>

            {/* Filtered Regional Gallery Results */}
            <div className="space-y-6 pt-4 border-t border-[#D6CEBE]">
              <div className="flex items-center justify-between">
                <h2 className="font-editorial text-3xl font-semibold text-[#1C1917]">
                  Regional Field Dispatches:{' '}
                  {selectedContinent === 'All' ? 'Global' : selectedContinent}
                  {selectedCountry !== 'All' ? ` · ${selectedCountry}` : ''} ({posts.length})
                </h2>
                {(selectedContinent !== 'All' || selectedCountry !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedContinent('All');
                      setSelectedCountry('All');
                    }}
                    className="text-xs text-[#C85A32] font-medium hover:underline"
                  >
                    Show All Continents
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => setActivePostId(post.id)}
                    className="group cursor-pointer bg-[#EBE6DF]/55 border border-[#D6CEBE] rounded-xl overflow-hidden flex flex-col justify-between"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-[#1C1917]">
                      <MediaImage
                        src={post.mediaUrl}
                        alt={post.title}
                        mediaType={post.mediaType}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
                        <span>{post.continent}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.country}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.category}</span>
                      </div>
                      <h3 className="font-editorial text-xl font-semibold text-[#1C1917] group-hover:text-[#C85A32] transition-colors">
                        {post.title}
                      </h3>
                      <div className="pt-2 flex items-center justify-between text-xs text-[#57534E]">
                        <div className="flex items-center gap-2 truncate">
                          <UserAvatar
                            src={post.authorAvatar}
                            name={post.authorName}
                            size="xs"
                          />
                          <span className="font-medium text-[#1C1917] truncate">
                            {post.authorName}
                          </span>
                        </div>
                        <span className="font-mono-tabular text-[11px]">
                          {post.latitude.toFixed(2)}°, {post.longitude.toFixed(2)}°
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ENDANGERED SPECIES DATABASE PAGE */}
        {activeNav === 'species' && (
          <SpeciesSection
            speciesList={speciesList}
            loading={loadingSpecies}
            selectedKingdom={speciesKingdom}
            onSelectKingdom={setSpeciesKingdom}
            selectedStatus={speciesStatus}
            onSelectStatus={setSpeciesStatus}
            selectedContinent={speciesContinent}
            onSelectContinent={setSpeciesContinent}
            searchQuery={speciesSearch}
            onSearchChange={setSpeciesSearch}
            onLiveLookup={handleLiveSpeciesLookup}
          />
        )}

        {/* CONSERVATION EDITORIAL SECTION */}
        {activeNav === 'conservation' && (
          <ConservationSection articles={articles} loading={loadingArticles} />
        )}

        {/* USER PROFILE & MODERATION DASHBOARD */}
        {activeNav === 'profile' && (
          <ProfileAndModerationSection
            inspectedUid={inspectedUid}
            onOpenPost={(p) => setActivePostId(p.id)}
            onRefreshGallery={() => fetchPosts(1, false)}
          />
        )}
      </main>

      {/* Lightbox Modal for Post Detail & Threaded Comments */}
      {activePost && (
        <PostDetailModal
          post={activePost}
          onClose={() => setActivePostId(null)}
          onToggleLike={(postId) => handleToggleLike(postId)}
          onAddComment={handleAddComment}
          onReport={handleReport}
          onSelectAuthor={(uid) => {
            setInspectedUid(uid);
            setActiveNav('profile');
          }}
        />
      )}

      {/* Upload Observation Modal */}
      {showUploadModal && (
        <UploadPostModal
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleCreatePost}
        />
      )}

      {/* Clean Institutional Footer */}
      <footer className="border-t border-[#D6CEBE] bg-[#EBE6DF]/60 px-4 sm:px-8 py-10 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-[#57534E]">
          <div className="space-y-1">
            <div className="font-editorial text-xl font-semibold text-[#1C1917]">
              Terra — Global Field Archive &amp; Conservation Atlas
            </div>
            <p>
              Dedicated to open ecological documentation, IUCN Red List literacy, and
              GDPR-compliant citizen science.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveNav('gallery')}
              className="hover:text-[#1C1917]"
            >
              Field Gallery
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('continents')}
              className="hover:text-[#1C1917]"
            >
              Continents Atlas
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('species')}
              className="hover:text-[#1C1917]"
            >
              IUCN Red List
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('conservation')}
              className="hover:text-[#1C1917]"
            >
              Conservation
            </button>
            <button
              type="button"
              onClick={() => {
                setInspectedUid(null);
                setActiveNav('profile');
              }}
              className="hover:text-[#1C1917]"
            >
              GDPR Data &amp; Moderation
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TerraApplication />
    </AuthProvider>
  );
}
