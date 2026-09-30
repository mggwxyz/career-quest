import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}))

import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { GET } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { items } from '@/app/_data/items'

function makeSelectChain<T>(terminal: T) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(terminal),
  }
}

function makeRowsChain<T>(terminal: T) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(terminal),
  }
}

describe('GET /api/assessment/responses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns an empty response list when the user has no completed session', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const sessionSelectChain = makeSelectChain([])
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(sessionSelectChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ sessionId: null, responses: [] })
    expect(db.select).toHaveBeenCalledTimes(1)
    expect(sessionSelectChain.where).toHaveBeenCalledWith(and(
      eq(assessmentSessions.userId, 'u1'),
      isNotNull(assessmentSessions.completedAt),
    ))
    expect(sessionSelectChain.orderBy).toHaveBeenCalledWith(desc(assessmentSessions.completedAt))
    expect(sessionSelectChain.limit).toHaveBeenCalledWith(1)
  })

  it('returns answered and skipped known items from the latest completed session with safe option fields only', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const [answeredItem, skippedItem, queuedItem] = items
    const sessionSelectChain = makeSelectChain([{ id: 'sess-latest' }])
    const responseRowsChain = makeRowsChain([
      {
        sessionId: 'sess-latest',
        itemId: answeredItem.id,
        position: 1,
        choice: 1,
        respondedAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        sessionId: 'sess-latest',
        itemId: skippedItem.id,
        position: 2,
        choice: null,
        respondedAt: new Date('2026-01-01T00:00:30Z'),
      },
      {
        sessionId: 'sess-latest',
        itemId: queuedItem.id,
        position: 3,
        choice: null,
        respondedAt: null,
      },
      {
        sessionId: 'sess-latest',
        itemId: 'stale-item-id',
        position: 4,
        choice: 2,
        respondedAt: new Date('2026-01-01T00:01:00Z'),
      },
    ])
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(responseRowsChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(responseRowsChain.where).toHaveBeenCalledWith(eq(assessmentResponses.sessionId, 'sess-latest'))
    expect(responseRowsChain.orderBy).toHaveBeenCalledWith(assessmentResponses.position)
    expect(body).toEqual({
      sessionId: 'sess-latest',
      responses: [
        {
          position: 1,
          choice: 1,
          item: {
            id: answeredItem.id,
            option1: {
              id: answeredItem.option1.id,
              text: answeredItem.option1.text,
              imageUrl: answeredItem.option1.imageUrl,
            },
            option2: {
              id: answeredItem.option2.id,
              text: answeredItem.option2.text,
              imageUrl: answeredItem.option2.imageUrl,
            },
          },
        },
        {
          position: 2,
          choice: null,
          item: {
            id: skippedItem.id,
            option1: {
              id: skippedItem.option1.id,
              text: skippedItem.option1.text,
              imageUrl: skippedItem.option1.imageUrl,
            },
            option2: {
              id: skippedItem.option2.id,
              text: skippedItem.option2.text,
              imageUrl: skippedItem.option2.imageUrl,
            },
          },
        },
      ],
    })
    expect(body.responses[0].item.option1).not.toHaveProperty('prompt')
    expect(body.responses[0].item.option1).not.toHaveProperty('loadings')
    expect(body.responses[0].item.option1).not.toHaveProperty('desirability')
  })

  it('returns a 500 response when the lookup fails', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('database unavailable')),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(sessionSelectChain)

    try {
      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body).toEqual({ error: 'Failed to load responses' })
    }
    finally {
      error.mockRestore()
    }
  })
})
