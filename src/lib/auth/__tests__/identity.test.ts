import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GUEST_COOKIE, GUEST_COOKIE_MAX_AGE,
  parseGuestCookie, signGuestCookie,
} from '@/lib/auth/guest'

const mocks = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  }
  return {
    cookieStore,
    cookies: vi.fn(),
    getSession: vi.fn(),
  }
})

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}))

vi.mock('@/lib/auth/get-session', () => ({
  getSession: mocks.getSession,
}))

import { getOrCreateUserId, getUserId } from '../identity'

describe('identity resolution', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-for-identity'
    mocks.cookies.mockResolvedValue(mocks.cookieStore)
    mocks.cookieStore.get.mockReturnValue(undefined)
    mocks.getSession.mockResolvedValue(null)
  })

  it('prefers the authenticated session over any guest cookie', async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: 'user_123' } })
    mocks.cookieStore.get.mockReturnValueOnce({ value: signGuestCookie('guest_stale') })

    await expect(getUserId()).resolves.toEqual({ id: 'user_123', isGuest: false })

    expect(mocks.cookies).not.toHaveBeenCalled()
    expect(mocks.cookieStore.set).not.toHaveBeenCalled()
  })

  it('reads a signed guest cookie without minting a new one', async () => {
    const guestId = 'guest_existing'
    mocks.cookieStore.get.mockReturnValueOnce({ value: signGuestCookie(guestId) })

    await expect(getUserId()).resolves.toEqual({ id: guestId, isGuest: true })

    expect(mocks.cookieStore.get).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(mocks.cookieStore.set).not.toHaveBeenCalled()
  })

  it('returns null for anonymous render paths without setting cookies', async () => {
    await expect(getUserId()).resolves.toBeNull()

    expect(mocks.cookieStore.get).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(mocks.cookieStore.set).not.toHaveBeenCalled()
  })

  it('reuses an existing guest cookie in mutable request contexts', async () => {
    const guestId = 'guest_existing'
    mocks.cookieStore.get.mockReturnValueOnce({ value: signGuestCookie(guestId) })

    await expect(getOrCreateUserId()).resolves.toEqual({ id: guestId, isGuest: true })

    expect(mocks.cookieStore.set).not.toHaveBeenCalled()
  })

  it('mints a signed guest cookie with security attributes when no identity exists', async () => {
    const identity = await getOrCreateUserId()

    expect(identity).toEqual({ id: expect.stringMatching(/^guest_/), isGuest: true })
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      GUEST_COOKIE,
      expect.any(String),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: GUEST_COOKIE_MAX_AGE,
      },
    )

    const signedValue = mocks.cookieStore.set.mock.calls[0][1] as string
    expect(parseGuestCookie(signedValue)).toBe(identity.id)
  })
})
