import 'server-only'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/get-session'
import {
  GUEST_COOKIE, GUEST_COOKIE_MAX_AGE,
  newGuestId, parseGuestCookie, signGuestCookie,
} from '@/lib/auth/guest'

export interface Identity {
  id: string
  isGuest: boolean
}

/**
 * Resolve the current visitor to a stable user id — a real Neon Auth user when
 * signed in, otherwise a signed guest id read from the cookie. Read-only: never
 * mints a cookie, so it is safe to call during React Server Component render
 * (where setting cookies throws). Returns null when there is neither a session
 * nor a guest cookie yet.
 */
export async function getUserId(): Promise<Identity | null> {
  const session = await getSession()
  if (session?.user) return { id: session.user.id, isGuest: false }

  const store = await cookies()
  const guestId = parseGuestCookie(store.get(GUEST_COOKIE)?.value)
  return guestId ? { id: guestId, isGuest: true } : null
}

/**
 * Like {@link getUserId} but mints and sets a signed guest cookie when the
 * visitor has neither a session nor an existing guest id. Only call from Route
 * Handlers or Server Actions — Server Components cannot set cookies.
 * Pass an already-resolved session (including null) to reuse an auth lookup.
 */
export async function getOrCreateUserId(
  session?: Awaited<ReturnType<typeof getSession>>,
): Promise<Identity> {
  const currentSession = session === undefined ? await getSession() : session
  if (currentSession?.user) return { id: currentSession.user.id, isGuest: false }

  const store = await cookies()
  const existing = parseGuestCookie(store.get(GUEST_COOKIE)?.value)
  if (existing) return { id: existing, isGuest: true }

  const id = newGuestId()
  store.set(GUEST_COOKIE, signGuestCookie(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_COOKIE_MAX_AGE,
  })
  return { id, isGuest: true }
}
