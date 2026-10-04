import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { getSession } from '@/lib/auth/get-session'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  cookies: vi.fn(),
}))

vi.mock('@/lib/auth/get-session', () => ({ getSession: mocks.getSession }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))

import { getOrCreateUserId, getUserId } from '../identity'
import {
  GUEST_COOKIE, GUEST_COOKIE_MAX_AGE,
  newGuestId, parseGuestCookie, signGuestCookie,
} from '../guest'

type AuthSession = Awaited<ReturnType<typeof getSession>>

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'identity-test-secret')
  mocks.cookies.mockResolvedValue(cookieStore)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getUserId', () => {
  it('prefers an account session without reading guest cookies', async () => {
    const guestId = newGuestId()
    mocks.getSession.mockResolvedValue({ user: { id: 'account-123' } })
    cookieStore.get.mockReturnValue({ value: signGuestCookie(guestId) })

    await expect(getUserId()).resolves.toEqual({ id: 'account-123', isGuest: false })

    expect(mocks.cookies).not.toHaveBeenCalled()
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('returns a signed guest cookie without minting a replacement', async () => {
    const guestId = newGuestId()
    mocks.getSession.mockResolvedValue(null)
    cookieStore.get.mockReturnValue({ value: signGuestCookie(guestId) })

    await expect(getUserId()).resolves.toEqual({ id: guestId, isGuest: true })

    expect(cookieStore.get).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('returns null instead of minting during read-only lookup', async () => {
    mocks.getSession.mockResolvedValue(null)
    cookieStore.get.mockReturnValue(undefined)

    await expect(getUserId()).resolves.toBeNull()

    expect(cookieStore.get).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
})

describe('getOrCreateUserId', () => {
  it('uses a supplied account session without another auth lookup', async () => {
    const session = { user: { id: 'account-123' } } as AuthSession

    await expect(getOrCreateUserId(session)).resolves.toEqual({ id: 'account-123', isGuest: false })

    expect(mocks.getSession).not.toHaveBeenCalled()
    expect(mocks.cookies).not.toHaveBeenCalled()
  })

  it('uses a supplied null session when minting a guest cookie', async () => {
    mocks.getSession.mockRejectedValue(new Error('unexpected auth lookup'))
    cookieStore.get.mockReturnValue(undefined)

    const identity = await getOrCreateUserId(null)

    expect(identity).toMatchObject({ isGuest: true })
    expect(identity.id).toMatch(/^guest_/)
    expect(mocks.getSession).not.toHaveBeenCalled()
    expect(cookieStore.set).toHaveBeenCalledTimes(1)

    const [name, value, options] = cookieStore.set.mock.calls[0]
    expect(name).toBe(GUEST_COOKIE)
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
