import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
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

    const rows = await db.select().from(careerRecommendations)
      .where(eq(careerRecommendations.userId, user.id))

    return rows.map(row => ({
      title: row.title,
      description: row.description,
      onetId: row.onetId,
      whyItMatches: row.whyItMatches,
      jobGrowth: row.jobGrowth,
      salaryRange: row.salaryRange,
    }))
  }
  catch {
    return []
  }
}

export default async function CareersPage() {
  const initialCareers = await getUserCareers()

  return <CareersClient initialCareers={initialCareers} />
}
