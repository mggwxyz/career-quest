'use server'

import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/get-session'
import { GUEST_COOKIE, parseGuestCookie } from '@/lib/auth/guest'
import { reassignGuestData } from '@/lib/auth/merge-guest-data'
import { db } from '@/db'

/**
 * Claim a guest's data for the now-signed-in user. Called from the client the
 * moment auth flips to logged-in (covers both email and OAuth returns). The
 * guest id is read from the httpOnly signed cookie and verified server-side, so
 * the caller can only ever merge its own guest data. Idempotent: clears the
 * cookie on completion so repeat invocations no-op.
 */
export async function mergeGuestAction(): Promise<{ merged: boolean }> {
  const store = await cookies()
  const guestId = parseGuestCookie(store.get(GUEST_COOKIE)?.value)
  if (!guestId) return { merged: false }

  const session = await getSession()
  const realId = session?.user?.id
  // Not signed in yet (e.g. OAuth still in flight): keep the cookie and let a
  // later invocation retry. A tampered cookie already returned null above.
  if (!realId) return { merged: false }

  // realId === guestId should be impossible (real ids aren't guest-prefixed),
  // but guard anyway so we never reassign a user's rows onto themselves.
  if (realId === guestId) {
    store.delete(GUEST_COOKIE)
    return { merged: false }
  }

  try {
    await reassignGuestData(db, guestId, realId)
  }
  catch (err) {
    // Leave the cookie in place so the merge is retried on the next load.
    console.error('[mergeGuestAction] reassign failed:', err)
    return { merged: false }
  }

  store.delete(GUEST_COOKIE)
  return { merged: true }
}
