import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/principal', () => ({ getCurrentPrincipal: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

import { POST } from '../route'
import { getCurrentPrincipal } from '@/lib/auth/principal'
import { db } from '@/db'

describe('POST /api/assessment/response', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getCurrentPrincipal as ReturnType<typeof vi.fn>).mockResolvedValue({ kind: 'user', userId: 'u1' })
  })

  it('uses a guest principal when not authenticated', async () => {
    ;(getCurrentPrincipal as ReturnType<typeof vi.fn>).mockResolvedValue({ kind: 'guest', userId: 'guest:abc' })
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain)

    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(selectChain.where).toHaveBeenCalled()
  })

  it('rejects invalid choice values', async () => {
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
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
