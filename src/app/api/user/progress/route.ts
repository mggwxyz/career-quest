import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userInfo } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET: Fetch user's saved progress
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

    // Fetch user data from database
    const userData = await db.select().from(userInfo)
      .where(eq(userInfo.id, user.id))
      .limit(1)

    if (!userData || userData.length === 0) {
      return NextResponse.json({
        progress: null,
      })
    }

    const user_data = userData[0]
    const quizAnswers = user_data.quizAnswers as { answers: Record<string, number>, skippedQuestions: string[] } | null

    return NextResponse.json({
      progress: quizAnswers || null,
    })
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 },
    )
  }
}

// POST: Save user's progress
export async function POST(request: Request) {
  try {
    const { answers, skippedQuestions } = await request.json()

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const progressData = {
      answers,
      skippedQuestions: skippedQuestions || [],
    }

    // Check if user exists
    const existingUser = await db.select().from(userInfo)
      .where(eq(userInfo.id, user.id))
      .limit(1)

    if (existingUser.length > 0) {
      // Update existing user
      await db.update(userInfo)
        .set({
          quizAnswers: progressData,
          updatedAt: new Date(),
        })
        .where(eq(userInfo.id, user.id))
    }
    else {
      // Insert new user
      await db.insert(userInfo).values({
        id: user.id,
        email: user.email,
        quizAnswers: progressData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 },
    )
  }
}
