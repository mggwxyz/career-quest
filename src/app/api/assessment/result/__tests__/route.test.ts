import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}))

import { GET } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'

describe('GET /api/assessment/result', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns { result: null } when no completed session', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.result).toBeNull()
  })

  it('returns the result blob when completed', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const mockResult = { hollandCode: 'SAE' }
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ result: mockResult }]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain)
    const res = await GET()
    const body = await res.json()
    expect(body.result).toEqual(mockResult)
  })
})
