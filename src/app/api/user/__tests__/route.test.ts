import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    eq: vi.fn((column, value) => ({ column, value })),
  }
})
vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { GET } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { userInterests } from '@/db/schema'

type Mock = ReturnType<typeof vi.fn>

function mockInterestRows(rows: Array<{ interest: string }>) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn().mockResolvedValue(rows),
  }
  chain.from.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  ;(db.select as Mock).mockReturnValueOnce(chain)
  return chain
}

describe('GET /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'account_123', isGuest: false })
    ;(getSession as Mock).mockResolvedValue({
      user: {
        id: 'session_user_should_not_drive_query',
        email: 'alex@example.com',
        name: 'Alex Morgan Lee',
      },
    })
  })

  it('returns guest profile shape without fetching account session details', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValueOnce({ id: 'guest_123', isGuest: true })
    const chain = mockInterestRows([
      { interest: 'Robotics' },
      { interest: 'Illustration' },
    ])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      isGuest: true,
      email: null,
      firstName: null,
      lastName: null,
      interests: ['Robotics', 'Illustration'],
    })
    expect(getSession).not.toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith(userInterests.userId, 'guest_123')
    expect(chain.where).toHaveBeenCalledWith({
      column: userInterests.userId,
      value: 'guest_123',
    })
    expect(chain.orderBy).toHaveBeenCalledWith(userInterests.createdAt)
  })

  it('returns account profile details and saved interests for the resolved user id', async () => {
    const chain = mockInterestRows([
      { interest: 'Music' },
      { interest: 'Healthcare' },
    ])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      isGuest: false,
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Morgan Lee',
      interests: ['Music', 'Healthcare'],
    })
    expect(getSession).toHaveBeenCalledTimes(1)
    expect(eq).toHaveBeenCalledWith(userInterests.userId, 'account_123')
    expect(chain.where).toHaveBeenCalledWith({
      column: userInterests.userId,
      value: 'account_123',
    })
    expect(chain.orderBy).toHaveBeenCalledWith(userInterests.createdAt)
  })
})
