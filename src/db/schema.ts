import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  role: text('role').default('user').notNull(),
  gdprConsent: boolean('gdpr_consent').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  authorName: text('author_name').notNull(),
  authorAvatar: text('author_avatar'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  mediaUrl: text('media_url').notNull(),
  mediaType: text('media_type').default('photo').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  locationName: text('location_name').notNull(),
  continent: text('continent').notNull(),
  country: text('country').notNull(),
  category: text('category').notNull(),
  cameraExif: text('camera_exif'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    userUid: text('user_uid').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('likes_post_user_idx').on(table.postId, table.userUid)]
);

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  userUid: text('user_uid').notNull(),
  authorName: text('author_name').notNull(),
  authorAvatar: text('author_avatar'),
  parentId: integer('parent_id'),
  content: text('content').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  targetType: text('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  reporterUid: text('reporter_uid').notNull(),
  reporterName: text('reporter_name').notNull(),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const species = pgTable('species', {
  id: serial('id').primaryKey(),
  scientificName: text('scientific_name').notNull().unique(),
  commonName: text('common_name').notNull(),
  kingdom: text('kingdom').notNull(),
  iucnStatus: text('iucn_status').notNull(),
  populationTrend: text('population_trend').notNull(),
  populationEstimate: text('population_estimate').notNull(),
  continent: text('continent').notNull(),
  habitat: text('habitat').notNull(),
  threats: text('threats').notNull(),
  conservationActions: text('conservation_actions').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conservationArticles = pgTable('conservation_articles', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  pillar: text('pillar').notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull(),
  readTimeMinutes: integer('read_time_minutes').notNull(),
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  impactMetric: text('impact_metric').notNull(),
  publishedAt: text('published_at').notNull(),
});

export const postsRelations = relations(posts, ({ many }) => ({
  likes: many(likes),
  comments: many(comments),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));
