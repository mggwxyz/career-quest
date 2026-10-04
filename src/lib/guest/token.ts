import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto'

export const GUEST_COOKIE_NAME = 'cq_guest'
export const GUEST_USER_ID_PREFIX = 'guest:'

const COOKIE_VERSION = 'v1'

function getGuestCookieSecret(): string {
  const secret = process.env.GUEST_COOKIE_SECRET ?? process.env.NEON_AUTH_COOKIE_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing guest cookie secret')
  }
  return 'career-quest-local-guest-cookie-secret'
}

function signGuestToken(token: string): string {
  return createHmac('sha256', getGuestCookieSecret())
    .update(token)
    .digest('base64url')
}

function verifySignature(token: string, signature: string): boolean {
  const expected = signGuestToken(token)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}

export function createGuestCookieValue(token = randomUUID()): string {
  return `${COOKIE_VERSION}.${token}.${signGuestToken(token)}`
}

export function parseGuestCookieValue(value: string | undefined): string | null {
  if (!value) return null
  const [version, token, signature] = value.split('.')
  if (version !== COOKIE_VERSION || !token || !signature) return null
  if (!verifySignature(token, signature)) return null
  return token
}

export function guestTokenToUserId(token: string): string {
  const digest = createHash('sha256').update(token)
    .digest('hex')
  return `${GUEST_USER_ID_PREFIX}${digest}`
}

export function guestCookieValueToUserId(value: string | undefined): string | null {
  const token = parseGuestCookieValue(value)
  return token ? guestTokenToUserId(token) : null
}

export function isGuestUserId(userId: string): boolean {
  return userId.startsWith(GUEST_USER_ID_PREFIX)
}
