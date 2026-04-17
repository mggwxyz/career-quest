import 'server-only'
import { auth } from '@/lib/auth/server'

export async function getSession() {
  const { data, error } = await auth.getSession()
  if (error) {
    console.error('[getSession] auth error:', error.message, error.status)
  }
  // `data` is typed non-undefined in the current SDK; `??` guards against
  // upstream drift where an absent session might come back as undefined.
  return data ?? null
}
