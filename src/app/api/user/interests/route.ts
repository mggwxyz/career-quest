import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getCurrentPrincipal } from '@/lib/auth/principal'
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
  const principal = await getCurrentPrincipal({ createGuest: true })
  if (!principal) return NextResponse.json({ error: 'Unable to load interests owner' }, { status: 500 })
  const rows = await db.select({ interest: userInterests.interest })
    .from(userInterests)
    .where(eq(userInterests.userId, principal.userId))
    .orderBy(userInterests.createdAt)
  return NextResponse.json({ interests: rows.map(r => r.interest) })
}

export async function POST(request: Request) {
  const principal = await getCurrentPrincipal({ createGuest: true })
  if (!principal) return NextResponse.json({ error: 'Unable to save interests owner' }, { status: 500 })
  const body = await request.json().catch(() => ({}))
  const interests = normalize((body as { interests?: unknown }).interests)
  const userId = principal.userId

  // The neon-http driver is stateless and has no interactive transaction
  // support (`db.transaction(...)` throws "No transactions support in
  // neon-http driver"). `db.batch([...])` runs the statements in a single
  // atomic HTTP request, which is all the atomicity these two
  // independent statements need.
  const clear = db.delete(userInterests).where(eq(userInterests.userId, userId))
  if (interests.length > 0) {
    await db.batch([
      clear,
      db.insert(userInterests).values(
        interests.map(interest => ({ userId, interest, source: 'manual' })),
      ),
    ])
  }
  else {
    await clear
  }

  return NextResponse.json({ interests })
}
