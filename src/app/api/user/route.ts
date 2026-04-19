import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { userInterests } from '@/db/schema'

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const user = session.user
  const rows = await db.select({ interest: userInterests.interest })
    .from(userInterests)
    .where(eq(userInterests.userId, user.id))
    .orderBy(userInterests.createdAt)
  return NextResponse.json({
    email: user.email ?? null,
    firstName: user.name?.split(' ')[0] ?? null,
    lastName: user.name?.split(' ').slice(1)
      .join(' ') || null,
    interests: rows.map(r => r.interest),
  })
}
