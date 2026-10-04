import 'server-only'
import { getSession } from '@/lib/auth/get-session'
import { getGuestPrincipal, type Principal } from '@/lib/guest/principal'

export async function getCurrentPrincipal(
  options: { createGuest: boolean } = { createGuest: true },
): Promise<Principal | null> {
  const session = await getSession()
  if (session?.user) {
    return { kind: 'user', userId: session.user.id }
  }
  return getGuestPrincipal({ create: options.createGuest })
}
