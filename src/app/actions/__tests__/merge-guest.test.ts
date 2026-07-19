import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth/merge-guest-data', () => ({ reassignGuestData: vi.fn() }))
vi.mock('@/db', () => ({ db: { kind: 'mock-db' } }))

import { cookies } from 'next/headers'
import { db } from '@/db'
import { mergeGuestAction } from '../merge-guest'
import { getSession } from '@/lib/auth/get-session'
import { GUEST_COOKIE, signGuestCookie } from '@/lib/auth/guest'
import { reassignGuestData } from '@/lib/auth/merge-guest-data'

const GUEST_ID = 'guest_11111111-1111-1111-1111-111111111111'
const REAL_ID = 'user_22222222-2222-2222-2222-222222222222'

function sessionFor(userId: string): Awaited<ReturnType<typeof getSession>> {
  return { user: { id: userId } } as Awaited<ReturnType<typeof getSession>>
}

function mockCookies(value?: string) {
  const store = {
    get: vi.fn().mockReturnValue(value ? { value } : undefined),
    delete: vi.fn(),
  }

  vi.mocked(cookies).mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>)
  return store
}

beforeAll(() => {
  process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-for-merge-action'
})

describe('mergeGuestAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(reassignGuestData).mockResolvedValue(undefined)
  })

  it('keeps the guest cookie when auth has not produced a real session yet', async () => {
    const store = mockCookies(signGuestCookie(GUEST_ID))
    vi.mocked(getSession).mockResolvedValue(null)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(store.get).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(reassignGuestData).not.toHaveBeenCalled()
    expect(store.delete).not.toHaveBeenCalled()
  })

  it('reassigns guest data and deletes the cookie after a successful merge', async () => {
    const store = mockCookies(signGuestCookie(GUEST_ID))
    vi.mocked(getSession).mockResolvedValue(sessionFor(REAL_ID))

    await expect(mergeGuestAction()).resolves.toEqual({ merged: true })

    expect(reassignGuestData).toHaveBeenCalledWith(db, GUEST_ID, REAL_ID)
    expect(store.delete).toHaveBeenCalledWith(GUEST_COOKIE)
  })

  it('keeps the guest cookie when reassignment fails so a later load can retry', async () => {
    const store = mockCookies(signGuestCookie(GUEST_ID))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
    })
    vi.mocked(getSession).mockResolvedValue(sessionFor(REAL_ID))
    vi.mocked(reassignGuestData).mockRejectedValue(new Error('db unavailable'))

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(reassignGuestData).toHaveBeenCalledWith(db, GUEST_ID, REAL_ID)
    expect(store.delete).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('deletes the cookie without reassigning when the guest and real ids match', async () => {
    const store = mockCookies(signGuestCookie(GUEST_ID))
    vi.mocked(getSession).mockResolvedValue(sessionFor(GUEST_ID))

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(reassignGuestData).not.toHaveBeenCalled()
    expect(store.delete).toHaveBeenCalledWith(GUEST_COOKIE)
  })
})
