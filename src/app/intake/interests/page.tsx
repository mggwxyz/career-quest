import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userInfo } from '@/db/schema'
import { eq } from 'drizzle-orm'
import InterestsClient from './_components/InterestsClient'

async function getUserInterests(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return []
    }

    // Fetch user data from database
    const userData = await db.select().from(userInfo)
      .where(eq(userInfo.id, user.id))
      .limit(1)

    if (!userData || userData.length === 0) {
      return []
    }

    console.log('userData', userData)

    return userData[0].interests || []
  }
  catch (error) {
    console.error('Error fetching user interests:', error)
    return []
  }
}

export default async function InterestsPage() {
  const initialInterests = await getUserInterests()

  return <InterestsClient initialInterests={initialInterests} />
}
