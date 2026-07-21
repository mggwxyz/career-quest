import { beforeEach, describe, expect, it, vi } from 'vitest'
import { items } from '@/app/_data/items'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}))

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
  })

  it('returns only answered known items with client-safe option fields', async () => {
    const [firstItem, secondItem] = items
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
        { itemId: secondItem.id, position: 2, choice: null, respondedAt: null },
        { itemId: 'retired-item', position: 3, choice: 2, respondedAt },
        { itemId: secondItem.id, position: 4, choice: 2, respondedAt },
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
          position: 4,
          choice: 2,
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
  })

  it('returns a 500 response when response lookup fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
    })
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

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to load responses' })
    expect(consoleError).toHaveBeenCalledWith(
      '[api/assessment/responses] GET failed:',
      expect.any(Error),
    )
    consoleError.mockRestore()
  })
})
