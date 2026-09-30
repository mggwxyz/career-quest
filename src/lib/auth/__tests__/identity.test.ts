import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/get-session'
import {
  GUEST_COOKIE, GUEST_COOKIE_MAX_AGE,
  parseGuestCookie, signGuestCookie,
} from '@/lib/auth/guest'
import { getOrCreateUserId, getUserId } from '@/lib/auth/identity'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/auth/get-session', () => ({
  getSession: vi.fn(),
}))

type Mock = ReturnType<typeof vi.fn>

function mockCookieStore(cookieValue?: string) {
  const store = {
    get: vi.fn((name: string) => (
      name === GUEST_COOKIE && cookieValue
        ? { name, value: cookieValue }
        : undefined
    )),
    set: vi.fn(),
  }

  ;(cookies as Mock).mockResolvedValue(store)
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-for-identity'
  ;(getSession as Mock).mockResolvedValue(null)
})

describe('getUserId', () => {
  it('returns the signed-in account user without reading guest cookies', async () => {
    ;(getSession as Mock).mockResolvedValueOnce({ user: { id: 'user_123' } })
    mockCookieStore(signGuestCookie('guest_existing'))

    await expect(getUserId()).resolves.toEqual({ id: 'user_123', isGuest: false })
    expect(cookies).not.toHaveBeenCalled()
  })

  it('returns an existing signed guest id without mutating cookies', async () => {
    const guestId = 'guest_existing'
    const store = mockCookieStore(signGuestCookie(guestId))

    await expect(getUserId()).resolves.toEqual({ id: guestId, isGuest: true })
    expect(store.set).not.toHaveBeenCalled()
  })

  it('returns null when there is no signed-in account or valid guest cookie', async () => {
    mockCookieStore('guest_existing.tampered')

    await expect(getUserId()).resolves.toBeNull()
  })
})

describe('getOrCreateUserId', () => {
  it('returns the signed-in account user without reading or writing guest cookies', async () => {
    ;(getSession as Mock).mockResolvedValueOnce({ user: { id: 'user_123' } })
    mockCookieStore(signGuestCookie('guest_existing'))

    await expect(getOrCreateUserId()).resolves.toEqual({ id: 'user_123', isGuest: false })
    expect(cookies).not.toHaveBeenCalled()
  })

  it('reuses an existing signed guest cookie without minting a new id', async () => {
    const guestId = 'guest_existing'
    const store = mockCookieStore(signGuestCookie(guestId))

    await expect(getOrCreateUserId()).resolves.toEqual({ id: guestId, isGuest: true })
    expect(store.set).not.toHaveBeenCalled()
  })

  it('mints and persists a signed guest cookie when no identity exists', async () => {
    const store = mockCookieStore()

    const identity = await getOrCreateUserId()

    expect(identity).toEqual({ id: expect.stringMatching(/^guest_/), isGuest: true })
    expect(store.set).toHaveBeenCalledTimes(1)
    const [name, value, options] = store.set.mock.calls[0]
    expect(name).toBe(GUEST_COOKIE)
    expect(value).toEqual(expect.stringContaining(`${identity.id}.`))
    expect(parseGuestCookie(value)).toBe(identity.id)
    expect(options).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: GUEST_COOKIE_MAX_AGE,
    })
  })
})
