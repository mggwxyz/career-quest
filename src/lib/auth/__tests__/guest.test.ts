import { beforeAll, describe, expect, it } from 'vitest'
import {
  GUEST_PREFIX, isGuestId, newGuestId, parseGuestCookie, signGuestCookie,
} from '@/lib/auth/guest'

// The guest cookie is the isolation boundary for G01: a visitor may only ever
// present a guest id we signed for them, so it can never claim another
// visitor's data. These tests are that guarantee.
beforeAll(() => {
  process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-for-guest-signing'
})

describe('guest cookie', () => {
  it('round-trips a signed id', () => {
    const id = newGuestId()
    expect(isGuestId(id)).toBe(true)
    expect(parseGuestCookie(signGuestCookie(id))).toBe(id)
  })

  it('mints unique ids', () => {
    expect(newGuestId()).not.toBe(newGuestId())
  })

  it('rejects a tampered id (signature no longer matches)', () => {
    const id = newGuestId()
    const cookie = signGuestCookie(id)
    const sig = cookie.slice(cookie.lastIndexOf('.'))
    // Attacker swaps in a different guest id but keeps a valid-looking signature.
    const forged = `${GUEST_PREFIX}00000000-0000-0000-0000-000000000000${sig}`
    expect(parseGuestCookie(forged)).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const cookie = signGuestCookie(newGuestId())
    const id = cookie.slice(0, cookie.lastIndexOf('.'))
    expect(parseGuestCookie(`${id}.deadbeef`)).toBeNull()
  })

  it('rejects a value signed with a different secret', () => {
    const cookie = signGuestCookie(newGuestId())
    process.env.NEON_AUTH_COOKIE_SECRET = 'a-different-secret'
    expect(parseGuestCookie(cookie)).toBeNull()
    process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-for-guest-signing'
  })

  it('rejects non-guest ids even when correctly signed shape', () => {
    // A real Neon Auth user id must never be accepted as a guest id.
    expect(parseGuestCookie('user-123.whatever')).toBeNull()
  })

  it('rejects malformed / empty values', () => {
    expect(parseGuestCookie(undefined)).toBeNull()
    expect(parseGuestCookie(null)).toBeNull()
    expect(parseGuestCookie('')).toBeNull()
    expect(parseGuestCookie('no-dot')).toBeNull()
    expect(parseGuestCookie('.sigonly')).toBeNull()
  })
})
