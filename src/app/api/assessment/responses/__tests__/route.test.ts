import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}))

import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { GET } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { items } from '@/app/_data/items'
import { assessmentResponses, assessmentSessions } from '@/db/schema'

describe('GET /api/assessment/responses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns an empty response history when the user has no completed sessions', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(sessionSelectChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ sessionId: null, responses: [] })
    expect(sessionSelectChain.where).toHaveBeenCalledWith(and(
      eq(assessmentSessions.userId, 'u1'),
      isNotNull(assessmentSessions.completedAt),
    ))
    expect(sessionSelectChain.orderBy).toHaveBeenCalledWith(desc(assessmentSessions.completedAt))
  })

  it('returns only answered known-item responses for the latest completed session', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const item = items[0]
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'sess-completed' }]),
    }
    const responsesSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          itemId: item.id,
          position: 1,
          choice: null,
          respondedAt: null,
        },
        {
          itemId: item.id,
          position: 2,
          choice: 1,
          respondedAt: new Date('2026-07-27T10:00:00.000Z'),
        },
        {
          itemId: 'stale-item',
          position: 3,
          choice: 2,
          respondedAt: new Date('2026-07-27T10:01:00.000Z'),
        },
      ]),
    }
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(responsesSelectChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      sessionId: 'sess-completed',
      responses: [{
        position: 2,
        choice: 1,
        item: {
          id: item.id,
          option1: {
            id: item.option1.id,
            text: item.option1.text,
            imageUrl: item.option1.imageUrl,
          },
          option2: {
            id: item.option2.id,
            text: item.option2.text,
            imageUrl: item.option2.imageUrl,
          },
        },
      }],
    })
    expect(responsesSelectChain.where).toHaveBeenCalledWith(eq(assessmentResponses.sessionId, 'sess-completed'))
    expect(responsesSelectChain.orderBy).toHaveBeenCalledWith(assessmentResponses.position)
    expect(body.responses[0].item.option1).not.toHaveProperty('prompt')
    expect(body.responses[0].item.option1).not.toHaveProperty('loadings')
    expect(body.responses[0].item.option1).not.toHaveProperty('desirability')
  })
})
