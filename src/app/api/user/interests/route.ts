import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { userInterests } from '@/db/schema'

const MAX_INTEREST_LENGTH = 64
const MAX_INTERESTS = 30

function normalize(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim().slice(0, MAX_INTEREST_LENGTH)
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
    if (out.length >= MAX_INTERESTS) break
  }
  return out
}

export async function GET() {
  const auth = await getSession()
  if (!auth?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const rows = await db.select({ interest: userInterests.interest })
    .from(userInterests)
    .where(eq(userInterests.userId, auth.user.id))
    .orderBy(userInterests.createdAt)
  return NextResponse.json({ interests: rows.map(r => r.interest) })
}

export async function POST(request: Request) {
  const auth = await getSession()
  if (!auth?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const interests = normalize((body as { interests?: unknown }).interests)

  await db.transaction(async (tx) => {
    await tx.delete(userInterests).where(eq(userInterests.userId, auth.user.id))
    if (interests.length > 0) {
      await tx.insert(userInterests).values(
        interests.map(interest => ({ userId: auth.user.id, interest, source: 'manual' })),
      )
    }
  })

  return NextResponse.json({ interests })
}
