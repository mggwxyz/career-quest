import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeGuestAction } from '@/app/actions/merge-guest'
import { GUEST_COOKIE, signGuestCookie } from '@/lib/auth/guest'

const {
  mockCookies,
  mockDb,
  mockGetSession,
  mockReassignGuestData,
} = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockDb: { id: 'mock-db' },
  mockGetSession: vi.fn(),
  mockReassignGuestData: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}))

vi.mock('@/db', () => ({
  db: mockDb,
}))

vi.mock('@/lib/auth/get-session', () => ({
  getSession: mockGetSession,
}))

vi.mock('@/lib/auth/merge-guest-data', () => ({
  reassignGuestData: mockReassignGuestData,
}))

const GUEST_ID = 'guest_11111111-1111-1111-1111-111111111111'
const REAL_ID = 'user-real-123'

function makeCookieStore(value?: string) {
  return {
    delete: vi.fn(),
    get: vi.fn((name: string) => {
      if (name !== GUEST_COOKIE || value === undefined) return undefined
      return { value }
    }),
  }
}

describe('mergeGuestAction', () => {
  beforeEach(() => {
    process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-for-guest-merge-action'
    mockCookies.mockReset()
    mockGetSession.mockReset()
    mockReassignGuestData.mockReset()
  })

  it('no-ops without a guest cookie', async () => {
    const store = makeCookieStore()
    mockCookies.mockResolvedValue(store)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(store.get).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(mockGetSession).not.toHaveBeenCalled()
    expect(mockReassignGuestData).not.toHaveBeenCalled()
    expect(store.delete).not.toHaveBeenCalled()
  })

  it('keeps the guest cookie when sign-in has not completed yet', async () => {
    const store = makeCookieStore(signGuestCookie(GUEST_ID))
    mockCookies.mockResolvedValue(store)
    mockGetSession.mockResolvedValue(null)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(mockGetSession).toHaveBeenCalledOnce()
    expect(mockReassignGuestData).not.toHaveBeenCalled()
    expect(store.delete).not.toHaveBeenCalled()
  })

  it('deletes the guest cookie instead of merging a user onto itself', async () => {
    const store = makeCookieStore(signGuestCookie(GUEST_ID))
    mockCookies.mockResolvedValue(store)
    mockGetSession.mockResolvedValue({ user: { id: GUEST_ID } })

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(mockReassignGuestData).not.toHaveBeenCalled()
    expect(store.delete).toHaveBeenCalledWith(GUEST_COOKIE)
  })

  it('retains the guest cookie when reassignment fails so a later load can retry', async () => {
    const store = makeCookieStore(signGuestCookie(GUEST_ID))
    const error = new Error('database unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCookies.mockResolvedValue(store)
    mockGetSession.mockResolvedValue({ user: { id: REAL_ID } })
    mockReassignGuestData.mockRejectedValue(error)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(mockReassignGuestData).toHaveBeenCalledWith(mockDb, GUEST_ID, REAL_ID)
    expect(store.delete).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('[mergeGuestAction] reassign failed:', error)

    consoleError.mockRestore()
  })

  it('reassigns guest data and deletes the cookie after a successful merge', async () => {
    const store = makeCookieStore(signGuestCookie(GUEST_ID))
    mockCookies.mockResolvedValue(store)
    mockGetSession.mockResolvedValue({ user: { id: REAL_ID } })
    mockReassignGuestData.mockResolvedValue(undefined)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: true })

    expect(mockReassignGuestData).toHaveBeenCalledWith(mockDb, GUEST_ID, REAL_ID)
    expect(store.delete).toHaveBeenCalledWith(GUEST_COOKIE)
  })
})
