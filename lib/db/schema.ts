import { pgTable, uuid, text, timestamp, pgEnum, integer, numeric, smallint, primaryKey, boolean, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const voteChoiceEnum = pgEnum('vote_choice', ['A', 'B'])
export const betterCategoryEnum = pgEnum('better_category', ['fashion', 'appearance', 'love', 'shopping', 'food', 'it', 'decision'])

// ─── 테이블 ───────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  country: text('country'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const betters = pgTable('betters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  imageAUrl: text('image_a_url').notNull(),
  imageADescription: text('image_a_description'),
  imageBUrl: text('image_b_url').notNull(),
  imageBDescription: text('image_b_description'),
  imageAText: text('image_a_text'),
  imageBText: text('image_b_text'),
  isTextOnly: boolean('is_text_only').default(false).notNull(),
  category: betterCategoryEnum('category').notNull().default('decision'),
  winner: voteChoiceEnum('winner'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
})

export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  betterId: uuid('better_id')
    .notNull()
    .references(() => betters.id, { onDelete: 'cascade' }),
  voterId: uuid('voter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  choice: voteChoiceEnum('choice').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  betterId: uuid('better_id')
    .notNull()
    .references(() => betters.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const userStats = pgTable('user_stats', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  totalVotes: integer('total_votes').notNull().default(0),
  correctVotes: integer('correct_votes').notNull().default(0),
  accuracyRate: numeric('accuracy_rate', { precision: 5, scale: 1 }).notNull().default('0'),
  level: smallint('level').notNull().default(1),
  levelName: text('level_name').notNull().default('아이언'),
  fashionAccuracy: numeric('fashion_accuracy', { precision: 5, scale: 1 }),
  appearanceAccuracy: numeric('appearance_accuracy', { precision: 5, scale: 1 }),
  loveAccuracy: numeric('love_accuracy', { precision: 5, scale: 1 }),
  shoppingAccuracy: numeric('shopping_accuracy', { precision: 5, scale: 1 }),
  foodAccuracy: numeric('food_accuracy', { precision: 5, scale: 1 }),
  itAccuracy: numeric('it_accuracy', { precision: 5, scale: 1 }),
  decisionAccuracy: numeric('decision_accuracy', { precision: 5, scale: 1 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  betterId: uuid('better_id')
    .notNull()
    .references(() => betters.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  count: integer('count').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const betterTags = pgTable('better_tags', {
  betterId: uuid('better_id').notNull().references(() => betters.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.betterId, t.tagId] })])

// SQL migration (run in Supabase SQL Editor):
// CREATE TABLE follows (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   follower_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
//   following_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
//   created_at timestamptz DEFAULT NOW() NOT NULL,
//   UNIQUE(follower_id, following_id)
// );
// ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "follows_public_read" ON follows FOR SELECT USING (true);
// CREATE POLICY "follows_auth_insert" ON follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
// CREATE POLICY "follows_auth_delete" ON follows FOR DELETE USING (follower_id = auth.uid());

export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [uniqueIndex('follows_follower_following_unique').on(t.followerId, t.followingId)])

// ─── Relations ────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  betters: many(betters),
  votes: many(votes),
  likes: many(likes),
  comments: many(comments),
  stats: one(userStats, { fields: [users.id], references: [userStats.userId] }),
  followers: many(follows, { relationName: 'follows_following' }),
  following: many(follows, { relationName: 'follows_follower' }),
}))

export const bettersRelations = relations(betters, ({ one, many }) => ({
  user: one(users, { fields: [betters.userId], references: [users.id] }),
  votes: many(votes),
  likes: many(likes),
  comments: many(comments),
  betterTags: many(betterTags),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  betterTags: many(betterTags),
}))

export const betterTagsRelations = relations(betterTags, ({ one }) => ({
  better: one(betters, { fields: [betterTags.betterId], references: [betters.id] }),
  tag: one(tags, { fields: [betterTags.tagId], references: [tags.id] }),
}))

export const votesRelations = relations(votes, ({ one }) => ({
  better: one(betters, { fields: [votes.betterId], references: [betters.id] }),
  voter: one(users, { fields: [votes.voterId], references: [users.id] }),
}))

export const likesRelations = relations(likes, ({ one }) => ({
  better: one(betters, { fields: [likes.betterId], references: [betters.id] }),
  user: one(users, { fields: [likes.userId], references: [users.id] }),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  better: one(betters, { fields: [comments.betterId], references: [betters.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}))

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, { fields: [userStats.userId], references: [users.id] }),
}))

export const followsRelations = relations(follows, ({ one }) => ({
  followerUser: one(users, { fields: [follows.followerId], references: [users.id], relationName: 'follows_follower' }),
  followingUser: one(users, { fields: [follows.followingId], references: [users.id], relationName: 'follows_following' }),
}))

// ─── Types ────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type Better = typeof betters.$inferSelect
export type Vote = typeof votes.$inferSelect
export type Like = typeof likes.$inferSelect
export type Comment = typeof comments.$inferSelect
export type NewBetter = typeof betters.$inferInsert
export type NewVote = typeof votes.$inferInsert
export type NewLike = typeof likes.$inferInsert
export type NewComment = typeof comments.$inferInsert
export type UserStats = typeof userStats.$inferSelect
export type Tag = typeof tags.$inferSelect
export type Follow = typeof follows.$inferSelect
