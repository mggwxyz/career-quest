import { NextResponse } from 'next/server'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { getCurrentPrincipal } from '@/lib/auth/principal'
import { db } from '@/db'
import { assessmentSessions } from '@/db/schema'
import { AssessmentResult } from '@/lib/assessment'

export async function GET() {
  try {
    const principal = await getCurrentPrincipal({ createGuest: true })
    if (!principal) return NextResponse.json({ error: 'Unable to load result owner' }, { status: 500 })
    const [row] = await db.select({ result: assessmentSessions.result })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.userId, principal.userId),
        isNotNull(assessmentSessions.completedAt),
      ))
      .orderBy(desc(assessmentSessions.completedAt))
      .limit(1)

    return NextResponse.json({ result: (row?.result as AssessmentResult | undefined) ?? null })
  }
  catch (err) {
    console.error('[api/assessment/result] GET failed:', err)
    return NextResponse.json({ error: 'Failed to load result' }, { status: 500 })
  }
}
