import { pgTable, pgPolicy, serial, smallint, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: text()
    .primaryKey()
    .default(sql`auth.uid()`),
  email: text(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  interests: text().array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, () => [
  pgPolicy('users_select', { as: 'permissive', for: 'select', to: ['authenticated', 'anon'], using: sql`auth.uid() = id` }),
  pgPolicy('users_insert', { as: 'permissive', for: 'insert', to: ['authenticated', 'anon'], withCheck: sql`auth.uid() = id` }),
  pgPolicy('users_update', { as: 'permissive', for: 'update', to: ['authenticated', 'anon'], using: sql`auth.uid() = id` }),
])

export const quizAnswers = pgTable('quiz_answers', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull(),
  selectedOption: smallint('selected_option'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, table => [
  unique('quiz_answers_user_question_unique').on(table.userId, table.questionId),
  pgPolicy('quiz_answers_select', { as: 'permissive', for: 'select', to: ['authenticated', 'anon'], using: sql`auth.uid() = ${table.userId}` }),
  pgPolicy('quiz_answers_insert', { as: 'permissive', for: 'insert', to: ['authenticated', 'anon'], withCheck: sql`auth.uid() = ${table.userId}` }),
  pgPolicy('quiz_answers_update', { as: 'permissive', for: 'update', to: ['authenticated', 'anon'], using: sql`auth.uid() = ${table.userId}` }),
])

export const careerRecommendations = pgTable('career_recommendations', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  onetId: text('onet_id').notNull(),
  title: text().notNull(),
  description: text().notNull(),
  whyItMatches: text('why_it_matches').notNull(),
  jobGrowth: text('job_growth').notNull(),
  salaryRange: text('salary_range').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, () => [
  pgPolicy('career_recommendations_select', { as: 'permissive', for: 'select', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
  pgPolicy('career_recommendations_insert', { as: 'permissive', for: 'insert', to: ['authenticated', 'anon'], withCheck: sql`auth.uid() = user_id` }),
  pgPolicy('career_recommendations_update', { as: 'permissive', for: 'update', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
  pgPolicy('career_recommendations_delete', { as: 'permissive', for: 'delete', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
])
