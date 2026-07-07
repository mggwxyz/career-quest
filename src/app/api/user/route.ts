import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { userInterests } from '@/db/schema'

export async function GET() {
  const { id: userId, isGuest } = await getOrCreateUserId()
  // Guests have no account details, only saved interests.
  const user = isGuest ? null : (await getSession())?.user ?? null
  const rows = await db.select({ interest: userInterests.interest })
    .from(userInterests)
    .where(eq(userInterests.userId, userId))
    .orderBy(userInterests.createdAt)
  return NextResponse.json({
    isGuest,
    email: user?.email ?? null,
    firstName: user?.name?.split(' ')[0] ?? null,
    lastName: user?.name?.split(' ').slice(1)
      .join(' ') || null,
    interests: rows.map(r => r.interest),
  })
}
