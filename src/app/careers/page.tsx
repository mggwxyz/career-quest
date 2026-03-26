import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userInfo } from '@/db/schema'
import { eq } from 'drizzle-orm'
import CareersClient from './_components/CareersClient'
import { CareerRecommendation } from '@/lib/schemas/career'

async function getUserCareers(): Promise<CareerRecommendation[]> {
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

    return quizResults as CareerRecommendation[]
  }
  catch {
    return []
  }
}

export default async function CareersPage() {
  const initialCareers = await getUserCareers()

  return <CareersClient initialCareers={initialCareers} />
}
