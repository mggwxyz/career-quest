import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}))

import { GET } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'

describe('GET /api/assessment/result', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns { result: null } when no completed session', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
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
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
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
