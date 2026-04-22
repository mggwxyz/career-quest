import { sql } from 'drizzle-orm'
import {
  boolean, char, index, integer, jsonb, pgTable, smallint, text,
  timestamp, unique, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'

export const careerRecommendations = pgTable('career_recommendations', {
  id: uuid().primaryKey()
    .defaultRandom(),
  runId: uuid('run_id').notNull()
    .references(() => recommendationRuns.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  rank: smallint().notNull(),
  onetId: text('onet_id').notNull(),
  slug: text('slug'),
  title: text().notNull(),
  description: text().notNull(),
  whyItMatches: text('why_it_matches').notNull(),
  jobGrowth: text('job_growth'),
  salaryRange: text('salary_range'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, t => [
  index('career_recommendations_user_run_idx').on(t.userId, t.runId),
])

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
  index('assessment_sessions_user_completed_idx')
    .on(t.userId, t.completedAt)
    .where(sql`${t.completedAt} IS NOT NULL`),
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
  index('recommendation_runs_session_idx').on(t.sessionId),
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

export const onetOccupations = pgTable('onet_occupations', {
  code: text().primaryKey(),
  slug: text().notNull()
    .unique(),
  title: text().notNull(),
  shortTitle: text('short_title'),
  description: text(),
  shortDescription: text('short_description'),
  jobZone: integer('job_zone').notNull(),
  brightOutlook: boolean('bright_outlook').notNull()
    .default(false),
  riasecPrimary: char('riasec_primary', { length: 1 }),
  riasecAll: text('riasec_all').array()
    .notNull()
    .default([]),
  salaryAnnualMedian: integer('salary_annual_median'),
  salaryHourlyMedian: integer('salary_hourly_median'),
  outlookCategory: text('outlook_category'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, table => [
  index('onet_occupations_job_zone_idx').on(table.jobZone),
  index('onet_occupations_bright_idx').on(table.brightOutlook)
    .where(sql`${table.brightOutlook}`),
  index('onet_occupations_riasec_idx').using('gin', table.riasecAll),
  index('onet_occupations_title_trgm').using('gin', sql`${table.title} gin_trgm_ops`),
])
