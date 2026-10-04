import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getGuestPrincipal, clearGuestCookie } from '@/lib/guest/principal'
import { mergeGuestDataIntoUser } from '@/lib/guest/merge'

export async function POST() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const guest = await getGuestPrincipal({ create: false })
  if (!guest) {
    return NextResponse.json({ merged: false })
  }

  const result = await mergeGuestDataIntoUser({
    guestUserId: guest.userId,
    userId: session.user.id,
  })
  await clearGuestCookie()

  return NextResponse.json(result)
}
