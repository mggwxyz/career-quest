import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth/guest', () => ({
  GUEST_COOKIE: 'career_quest_guest',
  parseGuestCookie: vi.fn(),
}))
vi.mock('@/lib/auth/merge-guest-data', () => ({ reassignGuestData: vi.fn() }))
vi.mock('@/db', () => ({ db: { marker: 'db' } }))

import { db } from '@/db'
import { cookies } from 'next/headers'
import { mergeGuestAction } from '../merge-guest'
import { getSession } from '@/lib/auth/get-session'
import { GUEST_COOKIE, parseGuestCookie } from '@/lib/auth/guest'
import { reassignGuestData } from '@/lib/auth/merge-guest-data'

type Mock = ReturnType<typeof vi.fn>

const RAW_COOKIE = 'signed-guest-cookie'
const GUEST_ID = 'guest_11111111-1111-1111-1111-111111111111'
const REAL_ID = 'real-user-42'

function mockCookieStore(rawValue?: string) {
  const store = {
    get: vi.fn((name: string) => {
      if (name !== GUEST_COOKIE || rawValue === undefined) return undefined
      return { name, value: rawValue }
    }),
    delete: vi.fn(),
  }
  ;(cookies as Mock).mockResolvedValue(store)
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(parseGuestCookie as Mock).mockImplementation((value?: string) =>
    value === RAW_COOKIE ? GUEST_ID : null,
  )
  ;(getSession as Mock).mockResolvedValue({ user: { id: REAL_ID } })
  ;(reassignGuestData as Mock).mockResolvedValue(undefined)
})

describe('mergeGuestAction', () => {
  it('does nothing when no signed guest cookie is present', async () => {
    const store = mockCookieStore()

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(parseGuestCookie).toHaveBeenCalledWith(undefined)
    expect(getSession).not.toHaveBeenCalled()
    expect(reassignGuestData).not.toHaveBeenCalled()
    expect(store.delete).not.toHaveBeenCalled()
  })

  it('claims guest data for the authenticated account and clears the retry cookie', async () => {
    const store = mockCookieStore(RAW_COOKIE)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: true })

    expect(reassignGuestData).toHaveBeenCalledOnce()
    expect(reassignGuestData).toHaveBeenCalledWith(db, GUEST_ID, REAL_ID)
    expect(store.delete).toHaveBeenCalledOnce()
    expect(store.delete).toHaveBeenCalledWith(GUEST_COOKIE)
  })

  it('keeps the guest cookie when authentication is still in flight', async () => {
    const store = mockCookieStore(RAW_COOKIE)
    ;(getSession as Mock).mockResolvedValueOnce(null)

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(reassignGuestData).not.toHaveBeenCalled()
    expect(store.delete).not.toHaveBeenCalled()
  })

  it('clears the guest cookie without reassigning when the account id matches the guest id', async () => {
    const store = mockCookieStore(RAW_COOKIE)
    ;(getSession as Mock).mockResolvedValueOnce({ user: { id: GUEST_ID } })

    await expect(mergeGuestAction()).resolves.toEqual({ merged: false })

    expect(reassignGuestData).not.toHaveBeenCalled()
    expect(store.delete).toHaveBeenCalledOnce()
    expect(store.delete).toHaveBeenCalledWith(GUEST_COOKIE)
  })

  it('preserves the guest cookie when reassignment fails so a later load can retry', async () => {
    const store = mockCookieStore(RAW_COOKIE)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    ;(reassignGuestData as Mock).mockRejectedValueOnce(new Error('database unavailable'))

    try {
      await expect(mergeGuestAction()).resolves.toEqual({ merged: false })
    }
    finally {
      consoleError.mockRestore()
    }

    expect(reassignGuestData).toHaveBeenCalledOnce()
    expect(reassignGuestData).toHaveBeenCalledWith(db, GUEST_ID, REAL_ID)
    expect(store.delete).not.toHaveBeenCalled()
  })
})
