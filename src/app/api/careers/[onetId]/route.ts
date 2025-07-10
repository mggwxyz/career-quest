import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userInfo } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ onetId: string }> },
) {
  console.log('GET request received')
  console.log('params', params)
  try {
    const { onetId } = await params

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    // Get the user's career recommendations from user_info
    const userData = await db.select().from(userInfo)
      .where(eq(userInfo.id, user.id))
      .limit(1)

    if (!userData || userData.length === 0) {
      return NextResponse.json(
        { error: 'No user data found' },
        { status: 404 },
      )
    }

    const quizResults = userData[0].quizResults as unknown
    if (!quizResults || !Array.isArray(quizResults)) {
      return NextResponse.json(
        { error: 'No career recommendations found' },
        { status: 404 },
      )
    }

    // Find the career with the matching onetId
    const career = quizResults.find((c: unknown) => {
      return typeof c === 'object' && c !== null && 'onetId' in c && (c as { onetId: string }).onetId === onetId
    })

    if (!career) {
      return NextResponse.json(
        { error: 'Career not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ career })
  }
  catch (error) {
    console.error('Error in career details API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
