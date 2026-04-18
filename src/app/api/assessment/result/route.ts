import { NextResponse } from 'next/server'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { assessmentSessions } from '@/db/schema'
import { AssessmentResult } from '@/lib/assessment'

export async function GET() {
  try {
    const auth = await getSession()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const [row] = await db.select({ result: assessmentSessions.result })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.userId, auth.user.id),
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
