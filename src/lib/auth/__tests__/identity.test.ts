import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/get-session'
import { getOrCreateUserId, getUserId } from '@/lib/auth/identity'
import {
  GUEST_COOKIE,
  GUEST_COOKIE_MAX_AGE,
  GUEST_PREFIX,
  parseGuestCookie,
  signGuestCookie,
} from '@/lib/auth/guest'

const { cookiesMock, getSessionMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getSessionMock: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/lib/auth/get-session', () => ({ getSession: getSessionMock }))

type Mock = ReturnType<typeof vi.fn>

interface MockCookieStore {
  get: Mock
  set: Mock
}

function mockCookieStore(value?: string): MockCookieStore {
  const store = {
    get: vi.fn((name: string) => (name === GUEST_COOKIE && value ? { value } : undefined)),
    set: vi.fn(),
  }
  ;(cookies as Mock).mockResolvedValue(store)
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-for-identity'
  ;(getSession as Mock).mockResolvedValue(null)
  mockCookieStore()
})

describe('getUserId', () => {
  it('prefers an account session without reading guest cookies', async () => {
    ;(getSession as Mock).mockResolvedValueOnce({ user: { id: 'user-1' } })

    await expect(getUserId()).resolves.toEqual({ id: 'user-1', isGuest: false })

    expect(cookies).not.toHaveBeenCalled()
  })

  it('returns a signed guest identity without minting a cookie', async () => {
    const cookie = signGuestCookie(`${GUEST_PREFIX}existing`)
    const store = mockCookieStore(cookie)

    await expect(getUserId()).resolves.toEqual({ id: `${GUEST_PREFIX}existing`, isGuest: true })

    expect(store.get).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(store.set).not.toHaveBeenCalled()
  })

  it('returns null for a missing or invalid guest cookie', async () => {
    const store = mockCookieStore('guest_existing.invalid-signature')

    await expect(getUserId()).resolves.toBeNull()

    expect(store.set).not.toHaveBeenCalled()
  })
})

describe('getOrCreateUserId', () => {
  it('prefers an account session without minting a guest cookie', async () => {
    ;(getSession as Mock).mockResolvedValueOnce({ user: { id: 'user-1' } })

    await expect(getOrCreateUserId()).resolves.toEqual({ id: 'user-1', isGuest: false })

    expect(cookies).not.toHaveBeenCalled()
  })

  it('reuses a signed guest cookie', async () => {
    const cookie = signGuestCookie(`${GUEST_PREFIX}existing`)
    const store = mockCookieStore(cookie)

    await expect(getOrCreateUserId()).resolves.toEqual({ id: `${GUEST_PREFIX}existing`, isGuest: true })

    expect(store.get).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(store.set).not.toHaveBeenCalled()
  })

  it('mints and stores a signed guest cookie when no identity exists', async () => {
    const store = mockCookieStore()

    const identity = await getOrCreateUserId()

    expect(identity.id).toMatch(new RegExp(`^${GUEST_PREFIX}`))
    expect(identity.isGuest).toBe(true)
    expect(store.set).toHaveBeenCalledTimes(1)
    const [name, value, options] = store.set.mock.calls[0]
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
