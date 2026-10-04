import 'server-only'
import { cookies } from 'next/headers'
import {
  createGuestCookieValue,
  guestTokenToUserId,
  parseGuestCookieValue,
  GUEST_COOKIE_NAME,
} from './token'

export type Principal =
  | { kind: 'user', userId: string }
  | { kind: 'guest', userId: string }

const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90

export async function getGuestPrincipal(options: { create: boolean }): Promise<Principal | null> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(GUEST_COOKIE_NAME)?.value
  const existingToken = parseGuestCookieValue(existing)
  if (existingToken) {
    return { kind: 'guest', userId: guestTokenToUserId(existingToken) }
  }

  if (!options.create) return null

  const value = createGuestCookieValue()
  const token = parseGuestCookieValue(value)
  if (!token) {
    throw new Error('Generated invalid guest cookie')
  }
  cookieStore.set(GUEST_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
  })
  return { kind: 'guest', userId: guestTokenToUserId(token) }
}

export async function clearGuestCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(GUEST_COOKIE_NAME)
}
