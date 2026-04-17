import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import InterestsClient from './_components/InterestsClient'

async function getUserInterests(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return []
    }

    const userData = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!userData || userData.length === 0) {
      return []
    }

    return userData[0].interests || []
  }
  catch (error) {
    // Let Next.js handle its dynamic-rendering probe — re-throw so
    // static analysis can mark the route as dynamic without surfacing
    // a phantom error in build logs.
    if ((error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    console.error('[discover/interests/page] getUserInterests failed:', error)
    return []
  }
}

export default async function InterestsPage() {
  const initialInterests = await getUserInterests()

  return <InterestsClient initialInterests={initialInterests} />
}
