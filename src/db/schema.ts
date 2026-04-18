import { sql } from 'drizzle-orm'
import {
  boolean, index, integer, jsonb, pgTable, serial, smallint, text,
  timestamp, unique, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'

export const quizAnswers = pgTable('quiz_answers', {
  id: serial().primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  selectedOption: smallint('selected_option'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, table => [
  unique('quiz_answers_user_question_unique').on(table.userId, table.questionId),
])

export const careerRecommendations = pgTable('career_recommendations', {
  id: serial().primaryKey(),
  userId: text('user_id').notNull(),
  onetId: text('onet_id').notNull(),
  title: text().notNull(),
  description: text().notNull(),
  whyItMatches: text('why_it_matches').notNull(),
  jobGrowth: text('job_growth').notNull(),
  salaryRange: text('salary_range').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
})

export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey(),
  gradeBand: text('grade_band'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
})

export const userInterests = pgTable('user_interests', {
  id: uuid().primaryKey()
    .defaultRandom(),
  userId: text('user_id').notNull(),
  interest: text().notNull(),
  source: text().notNull()
    .default('manual'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, t => [
  unique('user_interests_user_interest_unique').on(t.userId, t.interest),
  index('user_interests_user_idx').on(t.userId),
])

export const assessmentSessions = pgTable('assessment_sessions', {
  id: uuid().primaryKey()
    .defaultRandom(),
  userId: text('user_id').notNull(),
  gradeBand: text('grade_band'),
  engineVersion: text('engine_version').notNull(),
  posterior: jsonb().notNull(),
  result: jsonb(),
  inconsistency: boolean().notNull()
    .default(false),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow()
    .notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  abandonedAt: timestamp('abandoned_at', { withTimezone: true }),
}, t => [
  index('assessment_sessions_user_started_idx').on(t.userId, t.startedAt),
  uniqueIndex('assessment_sessions_one_active_per_user')
    .on(t.userId)
    .where(sql`${t.completedAt} IS NULL AND ${t.abandonedAt} IS NULL`),
])

export const assessmentResponses = pgTable('assessment_responses', {
  id: uuid().primaryKey()
    .defaultRandom(),
  sessionId: uuid('session_id').notNull()
    .references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  position: smallint().notNull(),
  shownAt: timestamp('shown_at', { withTimezone: true }).defaultNow()
    .notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  choice: smallint(),
  responseMs: integer('response_ms'),
}, t => [
  unique('assessment_responses_session_position_unique').on(t.sessionId, t.position),
  index('assessment_responses_item_idx').on(t.itemId),
])

export const recommendationRuns = pgTable('recommendation_runs', {
  id: uuid().primaryKey()
    .defaultRandom(),
  userId: text('user_id').notNull(),
  sessionId: uuid('session_id').notNull()
    .references(() => assessmentSessions.id),
  interestsSnapshot: text('interests_snapshot').array()
    .notNull(),
  prompt: text().notNull(),
  model: text().notNull(),
  engineVersion: text('engine_version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  durationMs: integer('duration_ms'),
  error: text(),
}, t => [
  index('recommendation_runs_user_created_idx').on(t.userId, t.createdAt),
])

export const careerUserActions = pgTable('career_user_actions', {
  id: uuid().primaryKey()
    .defaultRandom(),
  userId: text('user_id').notNull(),
  onetId: text('onet_id').notNull(),
  action: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, t => [
  index('career_user_actions_user_onet_idx').on(t.userId, t.onetId),
  index('career_user_actions_user_action_idx').on(t.userId, t.action, t.createdAt),
])
