import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth/merge-guest-data', () => ({ reassignGuestData: vi.fn() }))
vi.mock('@/db', () => ({ db: { test: 'db' } }))

import { cookies } from 'next/headers'
import { db } from '@/db'
import { mergeGuestAction } from '@/app/actions/merge-guest'
import { getSession } from '@/lib/auth/get-session'
import { GUEST_COOKIE, newGuestId, signGuestCookie } from '@/lib/auth/guest'
import { reassignGuestData } from '@/lib/auth/merge-guest-data'

type Mock = ReturnType<typeof vi.fn>

function mockCookieStore(value?: string) {
  const deleteCookie = vi.fn()
  const getCookie = vi.fn().mockReturnValue(value ? { value } : undefined)
  ;(cookies as Mock).mockResolvedValue({
    get: getCookie,
    delete: deleteCookie,
  })

  return { deleteCookie, getCookie }
}

beforeAll(() => {
  process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-for-guest-signing'
})

beforeEach(() => {
  vi.clearAllMocks()
  ;(getSession as Mock).mockResolvedValue(null)
})

describe('mergeGuestAction', () => {
  it('no-ops when there is no guest cookie', async () => {
    const { deleteCookie, getCookie } = mockCookieStore()

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(getCookie).toHaveBeenCalledWith(GUEST_COOKIE)
    expect(getSession).not.toHaveBeenCalled()
    expect(reassignGuestData).not.toHaveBeenCalled()
    expect(deleteCookie).not.toHaveBeenCalled()
  })

  it('keeps a valid guest cookie when the signed-in session is not ready yet', async () => {
    const { deleteCookie } = mockCookieStore(signGuestCookie(newGuestId()))

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(getSession).toHaveBeenCalledTimes(1)
    expect(reassignGuestData).not.toHaveBeenCalled()
    expect(deleteCookie).not.toHaveBeenCalled()
  })

  it('clears the cookie without reassigning when the target user matches the guest id', async () => {
    const guestId = newGuestId()
    const { deleteCookie } = mockCookieStore(signGuestCookie(guestId))
    ;(getSession as Mock).mockResolvedValue({ user: { id: guestId } })

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(reassignGuestData).not.toHaveBeenCalled()
    expect(deleteCookie).toHaveBeenCalledWith(GUEST_COOKIE)
  })

  it('reassigns guest data and clears the cookie after a successful merge', async () => {
    const guestId = newGuestId()
    const { deleteCookie } = mockCookieStore(signGuestCookie(guestId))
    ;(getSession as Mock).mockResolvedValue({ user: { id: 'real-user-42' } })
    ;(reassignGuestData as Mock).mockResolvedValue(undefined)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: true })

    expect(reassignGuestData).toHaveBeenCalledWith(db, guestId, 'real-user-42')
    expect(deleteCookie).toHaveBeenCalledWith(GUEST_COOKIE)
  })

  it('keeps the cookie for a later retry when reassigning guest data fails', async () => {
    const reassignError = new Error('batch failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { deleteCookie } = mockCookieStore(signGuestCookie(newGuestId()))
    ;(getSession as Mock).mockResolvedValue({ user: { id: 'real-user-42' } })
    ;(reassignGuestData as Mock).mockRejectedValue(reassignError)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(consoleError).toHaveBeenCalledWith('[mergeGuestAction] reassign failed:', reassignError)
    expect(deleteCookie).not.toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
