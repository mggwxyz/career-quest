import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}))

import { POST } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'

describe('POST /api/assessment/session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'middle' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a session and returns the first item', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })

    // Mock abandon-existing to no-op
    const setChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) }
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(setChain)

    const returningChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'sess-1' }]),
    }
    ;(db.insert as ReturnType<typeof vi.fn>).mockReturnValue(returningChain)

    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'middle' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sessionId).toBe('sess-1')
    expect(body.item).toBeDefined()
    expect(body.item.option1).toBeDefined()
    expect(body.itemsAnswered).toBe(0)
  })

  it('rejects unknown gradeBand values', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'kindergarten' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
