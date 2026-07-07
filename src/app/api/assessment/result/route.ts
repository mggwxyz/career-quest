import { NextResponse } from 'next/server'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { assessmentSessions } from '@/db/schema'
import { AssessmentResult } from '@/lib/assessment'

export async function GET() {
  try {
    const { id: userId } = await getOrCreateUserId()
    const [row] = await db.select({ result: assessmentSessions.result })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.userId, userId),
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
