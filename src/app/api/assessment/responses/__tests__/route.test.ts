import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as DrizzleOrm from 'drizzle-orm'
import { items } from '@/app/_data/items'
import { assessmentResponses, assessmentSessions } from '@/db/schema'

const drizzleMocks = vi.hoisted(() => ({
  and: vi.fn((...conditions) => ({ op: 'and', conditions })),
  desc: vi.fn(column => ({ op: 'desc', column })),
  eq: vi.fn((left, right) => ({ op: 'eq', left, right })),
  isNotNull: vi.fn(column => ({ op: 'isNotNull', column })),
}))

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}))
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof DrizzleOrm>()
  return {
    ...actual,
    and: drizzleMocks.and,
    desc: drizzleMocks.desc,
    eq: drizzleMocks.eq,
    isNotNull: drizzleMocks.isNotNull,
  }
})

import { GET } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'

type Mock = ReturnType<typeof vi.fn>

function optionSnapshot(option: typeof items[number]['option1']) {
  return {
    id: option.id,
    text: option.text,
    imageUrl: option.imageUrl,
  }
}

describe('GET /api/assessment/responses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
  })

  it('serves a guest identity with an empty payload when no completed session exists', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValueOnce({ id: 'guest_abc', isGuest: true })
    const sessionChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as Mock).mockReturnValueOnce(sessionChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ sessionId: null, responses: [] })
    expect(getOrCreateUserId).toHaveBeenCalledTimes(1)
    expect(db.select).toHaveBeenCalledTimes(1)
    expect(drizzleMocks.eq).toHaveBeenCalledWith(assessmentSessions.userId, 'guest_abc')
    expect(drizzleMocks.isNotNull).toHaveBeenCalledWith(assessmentSessions.completedAt)
    expect(sessionChain.where).toHaveBeenCalledWith(drizzleMocks.and.mock.results[0].value)
  })

  it('returns only answered known items with client-safe option fields', async () => {
    const [firstItem, secondItem, skippedItem] = items
    const respondedAt = new Date('2026-07-21T10:00:00.000Z')
    const sessionChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'session_1' }]),
    }
    const responsesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { itemId: firstItem.id, position: 1, choice: 1, respondedAt },
        { itemId: secondItem.id, position: 2, choice: null, respondedAt },
        { itemId: skippedItem.id, position: 3, choice: 2, respondedAt: null },
        { itemId: 'retired-item', position: 4, choice: 2, respondedAt },
      ]),
    }
    ;(db.select as Mock)
      .mockReturnValueOnce(sessionChain)
      .mockReturnValueOnce(responsesChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      sessionId: 'session_1',
      responses: [
        {
          position: 1,
          choice: 1,
          item: {
            id: firstItem.id,
            option1: optionSnapshot(firstItem.option1),
            option2: optionSnapshot(firstItem.option2),
          },
        },
        {
          position: 2,
          choice: null,
          item: {
            id: secondItem.id,
            option1: optionSnapshot(secondItem.option1),
            option2: optionSnapshot(secondItem.option2),
          },
        },
      ],
    })
    expect(body.responses[0].item.option1).not.toHaveProperty('prompt')
    expect(body.responses[0].item.option1).not.toHaveProperty('loadings')
    expect(body.responses[0].item.option1).not.toHaveProperty('desirability')
    expect(drizzleMocks.eq).toHaveBeenNthCalledWith(1, assessmentSessions.userId, 'u1')
    expect(drizzleMocks.isNotNull).toHaveBeenCalledWith(assessmentSessions.completedAt)
    expect(sessionChain.where).toHaveBeenCalledWith(drizzleMocks.and.mock.results[0].value)
    expect(drizzleMocks.eq).toHaveBeenNthCalledWith(2, assessmentResponses.sessionId, 'session_1')
    expect(responsesChain.where).toHaveBeenCalledWith(drizzleMocks.eq.mock.results[1].value)
  })

  it('returns a 500 response when response lookup fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const sessionChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'session_1' }]),
    }
    const responsesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockRejectedValue(new Error('database unavailable')),
    }
    ;(db.select as Mock)
      .mockReturnValueOnce(sessionChain)
      .mockReturnValueOnce(responsesChain)

    try {
      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body).toEqual({ error: 'Failed to load responses' })
      expect(consoleError).toHaveBeenCalledWith(
        '[api/assessment/responses] GET failed:',
        expect.any(Error),
      )
    }
    finally {
      consoleError.mockRestore()
    }
  })
})
