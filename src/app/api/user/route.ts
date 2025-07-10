import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userInfo } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET: Fetch user's existing data (interests and career recommendations)
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
      // Return empty data if user doesn't exist yet
      return NextResponse.json({
        interests: [],
        quizResults: null,
        quizAnswers: null,
      })
    }

    const user_data = userData[0]
    return NextResponse.json({
      interests: user_data.interests || [],
      quizResults: user_data.quizResults,
      quizAnswers: user_data.quizAnswers,
      email: user_data.email,
      firstName: user_data.firstName,
      lastName: user_data.lastName,
    })
  }
  catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 },
    )
  }
}

// POST: Save/update user interests and other data
export async function POST(request: Request) {
  try {
    const { interests, quizAnswers } = await request.json()

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    // Check if user exists
    const existingUser = await db.select().from(userInfo)
      .where(eq(userInfo.id, user.id))
      .limit(1)

    if (existingUser.length > 0) {
      // Update existing user
      await db.update(userInfo)
        .set({
          interests: interests || existingUser[0].interests,
          quizAnswers: quizAnswers || existingUser[0].quizAnswers,
          updatedAt: new Date(),
        })
        .where(eq(userInfo.id, user.id))
    }
    else {
      // Insert new user
      await db.insert(userInfo).values({
        id: user.id,
        email: user.email,
        interests: interests || [],
        quizAnswers: quizAnswers || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  }
  catch (error) {
    console.error('Error saving user data:', error)
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500 },
    )
  }
}
