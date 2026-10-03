import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

import { POST } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'

describe('POST /api/assessment/response', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects invalid choice values', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 3 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // isValidChoice predicate coverage — exercised via the POST body-validation gate.
  // For valid cases we assert "not 400" (downstream DB calls surface as 404/500 because
  // we deliberately keep mocks minimal); for invalid cases we assert a hard 400.
  it.each([1, 2, null])('accepts choice=%s (not 400)', async (choice) => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    // No session row returned → handler returns 404, proving we passed validation.
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain)

    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice }),
    })
    const res = await POST(req)
    expect(res.status).not.toBe(400)
  })

  it.each([0, 3, '1', 'abc'])('rejects choice=%s with 400', async (choice) => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects invalid response timing with 400', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 1, responseMs: -1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects stale submissions for items that already have a submitted response before mutating rows', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 's', userId: 'u1', gradeBand: null }]),
    }
    const existingRowsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          id: 'submitted-skip',
          sessionId: 's',
          itemId: 'stale-item',
          position: 1,
          choice: null,
          responseMs: 700,
          respondedAt: new Date('2026-10-03T00:00:00Z'),
        },
        {
          id: 'legacy-duplicate',
          sessionId: 's',
          itemId: 'stale-item',
          position: 2,
          choice: null,
          responseMs: null,
          respondedAt: null,
        },
      ]),
    }
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(existingRowsChain)

    const res = await POST(new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'stale-item', choice: 1, responseMs: 900 }),
    }))

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Item not outstanding in this session' })
    expect(db.select).toHaveBeenCalledTimes(2)
    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('returns an engine desync error when the recorded response log cannot be replayed', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const recordedAt = new Date('2026-10-03T00:00:00Z')
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 's', userId: 'u1', gradeBand: null }]),
    }
    const existingRowsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          id: 'row-1',
          sessionId: 's',
          itemId: 'unknown-item',
          position: 1,
          choice: null,
          responseMs: null,
          respondedAt: null,
        },
      ]),
    }
    const shownRowChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'row-1', sessionId: 's', itemId: 'unknown-item', respondedAt: null }]),
    }
    const allRowsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          id: 'row-1',
          sessionId: 's',
          itemId: 'unknown-item',
          position: 1,
          choice: 1,
          responseMs: 900,
          respondedAt: recordedAt,
        },
      ]),
    }
    const responseUpdateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'row-1' }]),
    }
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(existingRowsChain)
      .mockReturnValueOnce(shownRowChain)
      .mockReturnValueOnce(allRowsChain)
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(responseUpdateChain)

    try {
      const res = await POST(new Request('http://x/api/assessment/response', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 's', itemId: 'unknown-item', choice: 1, responseMs: 900 }),
      }))

      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'Engine desync: response log references unknown items' })
      expect(db.update).toHaveBeenCalledTimes(1)
      expect(responseUpdateChain.set).toHaveBeenCalledWith({
        choice: 1,
        respondedAt: expect.any(Date),
        responseMs: 900,
      })
      expect(db.insert).not.toHaveBeenCalled()
    }
    finally {
      error.mockRestore()
    }
  })
})
