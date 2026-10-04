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

const getUser = getOrCreateUserId as ReturnType<typeof vi.fn>
const select = db.select as ReturnType<typeof vi.fn>

describe('GET /api/assessment/responses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns an empty response list when the user has no completed sessions', async () => {
    getUser.mockResolvedValue({ id: 'u1', isGuest: false })
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    select.mockReturnValue(sessionSelectChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ sessionId: null, responses: [] })
    expect(select).toHaveBeenCalledTimes(1)
    expect(select).toHaveBeenCalledWith({ id: assessmentSessions.id })
    expect(sessionSelectChain.where).toHaveBeenCalledWith(and(
      eq(assessmentSessions.userId, 'u1'),
      isNotNull(assessmentSessions.completedAt),
    ))
    expect(sessionSelectChain.orderBy).toHaveBeenCalledWith(desc(assessmentSessions.completedAt))
  })

  it('returns safe answered item data from the latest completed session only', async () => {
    getUser.mockResolvedValue({ id: 'u1', isGuest: false })
    const answeredItem = items[0]
    const skippedItem = items[1]
    const unansweredItem = items[2]
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'completed-new' }]),
    }
    const responsesSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          sessionId: 'completed-new',
          itemId: answeredItem.id,
          position: 2,
          choice: 1,
          respondedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          sessionId: 'completed-new',
          itemId: skippedItem.id,
          position: 3,
          choice: null,
          respondedAt: new Date('2026-01-01T00:01:00Z'),
        },
        {
          sessionId: 'completed-new',
          itemId: unansweredItem.id,
          position: 4,
          choice: null,
          respondedAt: null,
        },
        {
          sessionId: 'completed-new',
          itemId: 'retired-item',
          position: 5,
          choice: 2,
          respondedAt: new Date('2026-01-01T00:02:00Z'),
        },
      ]),
    }
    select
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(responsesSelectChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      sessionId: 'completed-new',
      responses: [
        {
          position: 2,
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
          position: 3,
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
    expect(select).toHaveBeenNthCalledWith(1, { id: assessmentSessions.id })
    expect(select).toHaveBeenNthCalledWith(2)
    expect(responsesSelectChain.where).toHaveBeenCalledWith(eq(assessmentResponses.sessionId, 'completed-new'))
    expect(responsesSelectChain.orderBy).toHaveBeenCalledWith(assessmentResponses.position)
    expect(body.responses[0].item.option1).not.toHaveProperty('prompt')
    expect(body.responses[0].item.option1).not.toHaveProperty('loadings')
    expect(body.responses[0].item.option1).not.toHaveProperty('desirability')
  })

  it('returns 500 when responses cannot be loaded', async () => {
    getUser.mockResolvedValue({ id: 'u1', isGuest: false })
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('database unavailable')),
    }
    select.mockReturnValue(sessionSelectChain)

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
