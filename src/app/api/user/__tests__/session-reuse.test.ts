import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  cookies: vi.fn(),
  select: vi.fn(),
}))

vi.mock('@/lib/auth/get-session', () => ({ getSession: mocks.getSession }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/db', () => ({ db: { select: mocks.select } }))

import { GET } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { GUEST_COOKIE, newGuestId, parseGuestCookie, signGuestCookie } from '@/lib/auth/guest'

const cookieStore = { get: vi.fn(), set: vi.fn() }
const query = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([]),
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'session-reuse-test-secret')
  mocks.cookies.mockResolvedValue(cookieStore)
  mocks.select.mockReturnValue(query)
  query.from.mockReturnThis()
  query.where.mockReturnThis()
  query.orderBy.mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/user auth session reuse', () => {
  it('uses one auth result for both identity and account details', async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { id: 'account-123', email: 'member@example.com', name: 'Test Member' },
    }).mockResolvedValueOnce(null)

    const response = await GET()

    expect(mocks.getSession).toHaveBeenCalledTimes(1)
    expect(mocks.cookies).not.toHaveBeenCalled()
    expect(new PgDialect().sqlToQuery(query.where.mock.calls[0][0]).params).toEqual(['account-123'])
    expect(await response.json()).toMatchObject({
      isGuest: false,
      email: 'member@example.com',
      firstName: 'Test',
      lastName: 'Member',
    })
  })

  it('reuses a null auth result when creating a guest', async () => {
    mocks.getSession.mockResolvedValue(null)
    cookieStore.get.mockReturnValue(undefined)

    const response = await GET()

    expect(mocks.getSession).toHaveBeenCalledTimes(1)
    expect(cookieStore.set).toHaveBeenCalledTimes(1)
    const [name, value] = cookieStore.set.mock.calls[0]
    expect(name).toBe(GUEST_COOKIE)
    const guestId = parseGuestCookie(value)
    expect(guestId).toMatch(/^guest_/)
    expect(new PgDialect().sqlToQuery(query.where.mock.calls[0][0]).params).toEqual([guestId])
    expect(await response.json()).toEqual({
      isGuest: true, email: null, firstName: null, lastName: null, interests: [],
    })
  })

  it('reuses an existing guest identity without another lookup or cookie write', async () => {
    const guestId = newGuestId()
    mocks.getSession.mockResolvedValue(null)
    cookieStore.get.mockReturnValue({ value: signGuestCookie(guestId) })

    const response = await GET()

    expect(mocks.getSession).toHaveBeenCalledTimes(1)
    expect(cookieStore.set).not.toHaveBeenCalled()
    expect(new PgDialect().sqlToQuery(query.where.mock.calls[0][0]).params).toEqual([guestId])
    expect(await response.json()).toEqual({
      isGuest: true, email: null, firstName: null, lastName: null, interests: [],
    })
  })

  it('preserves auth resolution for callers that do not pass a session', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'default-caller-account' } })

    expect(await getOrCreateUserId()).toEqual({ id: 'default-caller-account', isGuest: false })
    expect(mocks.getSession).toHaveBeenCalledTimes(1)
    expect(mocks.cookies).not.toHaveBeenCalled()
  })
})
