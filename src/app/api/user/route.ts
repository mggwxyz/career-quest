import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

    const userData = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!userData || userData.length === 0) {
      return NextResponse.json({
        interests: [],
        email: null,
        firstName: null,
        lastName: null,
      })
    }

    const row = userData[0]
    return NextResponse.json({
      interests: row.interests || [],
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
    })
  }
  catch (error) {
    console.error('[api/user] GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { interests } = await request.json()

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const existingUser = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (existingUser.length > 0) {
      await db.update(users)
        .set({
          interests: interests || existingUser[0].interests,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
    }
    else {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        interests: interests || [],
      })
    }

    return NextResponse.json({ success: true })
  }
  catch (error) {
    console.error('[api/user] POST failed:', error)
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500 },
    )
  }
}
