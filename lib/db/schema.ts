import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
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

// ─── Relations ────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  betters: many(betters),
  votes: many(votes),
  likes: many(likes),
  comments: many(comments),
}))

export const bettersRelations = relations(betters, ({ one, many }) => ({
  user: one(users, { fields: [betters.userId], references: [users.id] }),
  votes: many(votes),
  likes: many(likes),
  comments: many(comments),
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
