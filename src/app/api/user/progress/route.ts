import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { quizAnswers } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const rows = await db.select().from(quizAnswers)
      .where(eq(quizAnswers.userId, user.id))

    const answers: Record<string, number> = {}
    const skippedQuestions: string[] = []

    for (const row of rows) {
      if (row.selectedOption === null) {
        skippedQuestions.push(row.questionId)
      }
      else {
        answers[row.questionId] = row.selectedOption
      }
    }

    return NextResponse.json({
      progress: rows.length > 0 ? { answers, skippedQuestions } : null,
    })
  }
  catch (error) {
    console.error('[api/user/progress] GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { answers, skippedQuestions } = await request.json() as {
      answers: Record<string, number>
      skippedQuestions: string[]
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const values: { userId: string, questionId: string, selectedOption: number | null }[] = []

    for (const [questionId, option] of Object.entries(answers)) {
      values.push({ userId: user.id, questionId, selectedOption: option })
    }

    for (const questionId of (skippedQuestions || [])) {
      if (!(questionId in answers)) {
        values.push({ userId: user.id, questionId, selectedOption: null })
      }
    }

    if (values.length > 0) {
      await db.insert(quizAnswers)
        .values(values)
        .onConflictDoUpdate({
          target: [quizAnswers.userId, quizAnswers.questionId],
          set: {
            selectedOption: sql`excluded.selected_option`,
            updatedAt: new Date(),
          },
        })
    }

    return NextResponse.json({ success: true })
  }
  catch (error) {
    console.error('[api/user/progress] POST failed:', error)
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 },
    )
  }
}
