import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

import { POST } from '../route'
import { getSession } from '@/lib/auth/get-session'

describe('POST /api/assessment/response', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects invalid choice values', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 3 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
