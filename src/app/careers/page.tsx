import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import CareersClient from './_components/CareersClient'
import { CareerRecommendation } from '@/lib/schemas/career'

async function getUserCareers(): Promise<CareerRecommendation[]> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return []
    }
    const user = session.user

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
  catch (error) {
    // Let Next.js handle its dynamic-rendering probe — re-throw so
    // static analysis can mark the route as dynamic without surfacing
    // a phantom error in build logs.
    if ((error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    console.error('[careers/page] getUserCareers failed:', error)
    return []
  }
}

export default async function CareersPage() {
  const initialCareers = await getUserCareers()

  return <CareersClient initialCareers={initialCareers} />
}
