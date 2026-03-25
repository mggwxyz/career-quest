'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userInfo } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export async function saveInterestsAction(interests: string[]) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Authentication required')
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return { success: true }
  }
  catch {
    return { success: false, error: 'Failed to save interests' }
  }
}

export async function saveInterestsAndRedirect(interests: string[]) {
  // Try to save interests for logged-in users, but don't block guest users
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await saveInterestsAction(interests)
    }
  }
  catch {
    // Silent fail for guest users
  }

  // Always redirect to the next step
  redirect('/intake/would-you-rather')
}
