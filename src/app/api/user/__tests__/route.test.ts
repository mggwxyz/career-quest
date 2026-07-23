import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { eq } from 'drizzle-orm'
import { GET } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { userInterests } from '@/db/schema'

type Mock = ReturnType<typeof vi.fn>

function mockSavedInterests(interests: string[]) {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(interests.map(interest => ({ interest }))),
  }
  ;(db.select as Mock).mockReturnValueOnce(selectChain)
  return selectChain
}

describe('GET /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'account-user', isGuest: false })
    ;(getSession as Mock).mockResolvedValue({
      user: {
        id: 'account-user',
        email: 'student@example.com',
        name: 'Ada Lovelace',
      },
    })
  })

  it('returns guest profile shape with saved interests without requiring an account session', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValueOnce({ id: 'guest_abc', isGuest: true })
    const selectChain = mockSavedInterests(['Robotics', 'Music'])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      isGuest: true,
      email: null,
      firstName: null,
      lastName: null,
      interests: ['Robotics', 'Music'],
    })
    expect(getSession).not.toHaveBeenCalled()
    expect(selectChain.where).toHaveBeenCalledWith(eq(userInterests.userId, 'guest_abc'))
  })

  it('returns account profile details while reading interests for the resolved identity', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValueOnce({ id: 'account-user', isGuest: false })
    ;(getSession as Mock).mockResolvedValueOnce({
      user: {
        id: 'session-user',
        email: 'student@example.com',
        name: 'Ada Lovelace Byron',
      },
    })
    const selectChain = mockSavedInterests(['Healthcare'])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      isGuest: false,
      email: 'student@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace Byron',
      interests: ['Healthcare'],
    })
    expect(getSession).toHaveBeenCalledTimes(1)
    expect(selectChain.where).toHaveBeenCalledWith(eq(userInterests.userId, 'account-user'))
  })
})
