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
  const userId = auth.user.id

  // The neon-http driver is stateless and has no interactive transaction
  // support (`db.transaction(...)` throws "No transactions support in
  // neon-http driver"). `db.batch([...])` is the supported atomic primitive:
  // per Drizzle's Batch API docs (https://orm.drizzle.team/docs/batch-api) the
  // statements run "in an implicit transaction ... If any of the statements
  // fail, the entire transaction is rolled back and no changes are made."
  // So if the INSERT fails the preceding DELETE is rolled back — no silent
  // wipe of the user's interests.
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
