import { pgTable, serial, smallint, text, timestamp, unique } from 'drizzle-orm/pg-core'

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
