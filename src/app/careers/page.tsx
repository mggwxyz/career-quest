import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userInfo } from '@/db/schema'
import { eq } from 'drizzle-orm'
import CareersClient from './_components/CareersClient'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

async function getUserCareers(): Promise<Career[]> {
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

    const quizResults = userData[0].quizResults as unknown
    if (!quizResults || !Array.isArray(quizResults)) {
      return []
    }

    return quizResults as Career[]
  }
  catch (error) {
    console.error('Error fetching user careers:', error)
    return []
  }
}

export default async function CareersPage() {
  const initialCareers = await getUserCareers()

  return <CareersClient initialCareers={initialCareers} />
}
