import { NextResponse } from 'next/server'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { items } from '@/app/_data/items'

export async function GET() {
  try {
    const auth = await getSession()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const [session] = await db.select({ id: assessmentSessions.id })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.userId, auth.user.id),
        isNotNull(assessmentSessions.completedAt),
      ))
      .orderBy(desc(assessmentSessions.completedAt))
      .limit(1)

    if (!session) {
      return NextResponse.json({ sessionId: null, responses: [] })
    }

    const rows = await db.select().from(assessmentResponses)
      .where(eq(assessmentResponses.sessionId, session.id))
      .orderBy(assessmentResponses.position)

    const answered = rows.filter(r => r.respondedAt !== null)
    const responses = answered.map((r) => {
      const item = items.find(i => i.id === r.itemId)
      if (!item) return null
      const pick = ({ id, text, imageUrl }: typeof item.option1) => ({ id, text, imageUrl })
      return {
        position: r.position,
        choice: r.choice as 1 | 2 | null,
        item: { id: item.id, option1: pick(item.option1), option2: pick(item.option2) },
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null)

    return NextResponse.json({ sessionId: session.id, responses })
  }
  catch (err) {
    console.error('[api/assessment/responses] GET failed:', err)
    return NextResponse.json({ error: 'Failed to load responses' }, { status: 500 })
  }
}
