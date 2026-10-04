import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

// A guest identity is a signed cookie so an anonymous visitor can assess and
// browse with zero signup, then merge into a real account (G01). The value is
// `<guestId>.<hmac>`; the HMAC (keyed on the same secret Neon Auth uses for its
// session cookie) is what makes it unforgeable — a client can only ever present
// a guest id that WE issued to it, so it can never claim another visitor's data.
export const GUEST_COOKIE = 'cq_guest'
export const GUEST_PREFIX = 'guest_'
// 1 year — long enough that a returning student keeps their in-progress work.
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function secret(): string {
  const s = process.env.NEON_AUTH_COOKIE_SECRET
  if (!s) throw new Error('NEON_AUTH_COOKIE_SECRET is required to sign guest cookies')
  return s
}

function sign(id: string): string {
  return createHmac('sha256', secret()).update(id)
    .digest('base64url')
}

export function newGuestId(): string {
  return `${GUEST_PREFIX}${randomUUID()}`
}

export function isGuestId(id: string): boolean {
  return id.startsWith(GUEST_PREFIX)
}

export function signGuestCookie(id: string): string {
  return `${id}.${sign(id)}`
}

/**
 * Verify a guest cookie value and return the guest id, or null if the value is
 * missing, malformed, tampered with, or not a guest id. Timing-safe compare so
 * the HMAC can't be brute-forced by measuring response time.
 */
export function parseGuestCookie(value: string | undefined | null): string | null {
  if (!value) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const id = value.slice(0, dot)
  const providedSig = value.slice(dot + 1)
  if (!isGuestId(id)) return null
  const expectedSig = sign(id)
  const a = Buffer.from(providedSig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length) return null
  return timingSafeEqual(a, b) ? id : null
}
