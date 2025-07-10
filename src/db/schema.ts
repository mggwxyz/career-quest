import { pgTable, pgPolicy, timestamp, json, text } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'

export const userInfo = pgTable('user_info', {
  id: text()
    .primaryKey()
    .default(sql`(auth.jwt() ->> 'sub'::text)`),
  email: text(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  interests: text().array(),
  quizAnswers: json('quiz_answers'),
  quizResults: json('quiz_results'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, table => [
  pgPolicy('Users can only access their own data', { as: 'permissive', for: 'select', to: ['authenticated'], using: sql`(( SELECT (auth.jwt() ->> 'sub'::text)) = id)` }),
  pgPolicy('Users can insert their own data', { as: 'permissive', for: 'insert', to: ['authenticated'], withCheck: sql`(( SELECT (auth.jwt() ->> 'sub'::text)) = id)` }),
  pgPolicy('Users can update their own data', { as: 'permissive', for: 'update', to: ['authenticated'], using: sql`(( SELECT (auth.jwt() ->> 'sub'::text)) = id)` }),
])
