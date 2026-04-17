import { describe, it, expect } from 'vitest'
import { db } from '@/db'
import { quizAnswers } from '@/db/schema'
import { eq } from 'drizzle-orm'

describe('quiz_answers insert without auth.uid()', () => {
  it('inserts a row with a plain text user_id', async () => {
    const userId = `test-${crypto.randomUUID()}`
    await db.insert(quizAnswers).values({ userId, questionId: 'q-test', selectedOption: 1 })
    const [row] = await db.select().from(quizAnswers)
      .where(eq(quizAnswers.userId, userId))
    expect(row?.questionId).toBe('q-test')
    await db.delete(quizAnswers).where(eq(quizAnswers.userId, userId))
  })
})
