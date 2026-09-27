export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  gdprConsent: boolean;
  createdAt: string;
}

export interface CommentItem {
  id: number;
  postId: number;
  userUid: string;
  authorName: string;
  authorAvatar: string | null;
  parentId: number | null;
  content: string;
  status: string;
  createdAt: string;
}

export interface PostItem {
  id: number;
  userUid: string;
  authorName: string;
  authorAvatar: string | null;
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
  cameraExif: string | null;
  status: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: CommentItem[];
}

export interface SpeciesItem {
  id: number;
  scientificName: string;
  commonName: string;
  kingdom: 'Animalia' | 'Aves' | 'Plantae' | 'Marine' | string;
  iucnStatus: 'CR' | 'EN' | 'VU' | 'NT' | 'EW' | 'EX' | string;
  populationTrend: 'Decreasing' | 'Stable' | 'Increasing' | 'Unknown' | string;
  populationEstimate: string;
  continent: string;
  habitat: string;
  threats: string;
  conservationActions: string;
  description: string;
  imageUrl: string | null;
  updatedAt: string;
}

export interface ConservationArticle {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  pillar: string;
  authorName: string;
  authorRole: string;
  readTimeMinutes: number;
  summary: string;
  content: string;
  impactMetric: string;
  publishedAt: string;
}

export interface ModerationReport {
  id: number;
  targetType: 'post' | 'comment';
  targetId: number;
  reporterUid: string;
  reporterName: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  targetSummary: string;
  targetStatus: string;
}

export const CONTINENTS = [
  'All',
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Asia',
  'Oceania',
  'Antarctica',
] as const;

export const CATEGORIES = [
  'All',
  'Forest',
  'Ocean',
  'Mountain',
  'Desert',
  'Wildlife',
  'Wetland',
  'Tundra',
] as const;

export const IUCN_LABELS: Record<string, { label: string; full: string; tone: string }> = {
  CR: {
    label: 'CR · Critically Endangered',
    full: 'Critically Endangered',
    tone: 'text-[#9A3412]',
  },
  EN: {
    label: 'EN · Endangered',
    full: 'Endangered',
    tone: 'text-[#B45309]',
  },
  VU: {
    label: 'VU · Vulnerable',
    full: 'Vulnerable',
    tone: 'text-[#854D0E]',
  },
  NT: {
    label: 'NT · Near Threatened',
    full: 'Near Threatened',
    tone: 'text-[#1B3B2B]',
  },
  EW: {
    label: 'EW · Extinct in the Wild',
    full: 'Extinct in the Wild',
    tone: 'text-[#57534E]',
  },
  EX: {
    label: 'EX · Extinct',
    full: 'Extinct',
    tone: 'text-[#292524]',
  },
};
