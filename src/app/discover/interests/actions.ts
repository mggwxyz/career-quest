'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export async function saveInterestsAction(interests: string[]) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: 'Authentication required' }
  }

  const existingUser = await db.select().from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (existingUser.length > 0) {
    await db.update(users)
      .set({
        interests,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
  }
  else {
    await db.insert(users).values({
      id: user.id,
      email: user.email,
      interests,
    })
  }

  return { success: true }
}

export async function saveInterestsAndRedirect(interests: string[]) {
  await saveInterestsAction(interests)
  redirect('/discover/preferences')
}
