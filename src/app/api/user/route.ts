import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const { user } = session
  return NextResponse.json({
    email: user.email ?? null,
    firstName: user.name?.split(' ')[0] ?? null,
    lastName: user.name?.split(' ').slice(1)
      .join(' ') || null,
    interests: [], // moved to client-side Zustand state
  })
}
