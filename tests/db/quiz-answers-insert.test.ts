import { describe, it, expect } from 'vitest'

describe.skipIf(!process.env.DATABASE_URL)('quiz_answers insert without auth.uid()', () => {
  it('inserts a row with a plain text user_id', async () => {
    const [{ db }, { quizAnswers }, { eq }] = await Promise.all([
      import('@/db'),
      import('@/db/schema'),
      import('drizzle-orm'),
    ])

    const userId = `test-${crypto.randomUUID()}`
    try {
      await db.insert(quizAnswers).values({ userId, questionId: 'q-test', selectedOption: 1 })
      const [row] = await db.select().from(quizAnswers)
        .where(eq(quizAnswers.userId, userId))
      expect(row?.questionId).toBe('q-test')
    }
    finally {
      await db.delete(quizAnswers).where(eq(quizAnswers.userId, userId))
    }
  })
})
