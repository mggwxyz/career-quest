import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ onetId: string }> },
) {
  try {
    const { onetId } = await params

    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = session.user

    const rows = await db.select().from(careerRecommendations)
      .where(and(
        eq(careerRecommendations.userId, user.id),
        eq(careerRecommendations.onetId, onetId),
      ))
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Career not found' },
        { status: 404 },
      )
    }

    const row = rows[0]
    return NextResponse.json({
      career: {
        title: row.title,
        description: row.description,
        onetId: row.onetId,
        whyItMatches: row.whyItMatches,
        jobGrowth: row.jobGrowth,
        salaryRange: row.salaryRange,
      },
    })
  }
  catch (error) {
    console.error('[api/careers/[onetId]] GET failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
