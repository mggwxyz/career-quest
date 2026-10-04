import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/principal', () => ({ getCurrentPrincipal: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}))

import { GET } from '../route'
import { getCurrentPrincipal } from '@/lib/auth/principal'
import { db } from '@/db'

describe('GET /api/assessment/result', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getCurrentPrincipal as ReturnType<typeof vi.fn>).mockResolvedValue({ kind: 'user', userId: 'u1' })
  })

  it('returns a guest result when not authenticated', async () => {
    ;(getCurrentPrincipal as ReturnType<typeof vi.fn>).mockResolvedValue({ kind: 'guest', userId: 'guest:abc' })
    const mockResult = { hollandCode: 'RIA' }
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ result: mockResult }]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.result).toEqual(mockResult)
  })

  it('returns { result: null } when no completed session', async () => {
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
