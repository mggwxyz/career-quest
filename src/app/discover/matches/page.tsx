import { and, desc, eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations, recommendationRuns } from '@/db/schema'
import CareersClient from './_components/CareersClient'
import { CareerRecommendation } from '@/lib/schemas/career'
import { getOccupationsByCodes } from '@/lib/onet/occupations'
import { mergeCareerWithOnet } from '@/lib/career/recommendation-onet'
import { hasScene } from '@/lib/scenes'

async function getUserCareers(): Promise<CareerRecommendation[]> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return []
    }
    const user = session.user

    const [latestRun] = await db.select({ id: recommendationRuns.id })
      .from(recommendationRuns)
      .where(eq(recommendationRuns.userId, user.id))
      .orderBy(desc(recommendationRuns.createdAt))
      .limit(1)
    if (!latestRun) {
      return []
    }

    const rows = await db.select()
      .from(careerRecommendations)
      .where(and(
        eq(careerRecommendations.userId, user.id),
        eq(careerRecommendations.runId, latestRun.id),
      ))
      .orderBy(careerRecommendations.rank)

    // Enrich from the O*NET mirror at render time so short_title /
    // short_description, salary, outlook, slug, and RIASEC codes reflect the
    // current mirror rather than whatever was stored when the run was
    // generated. Stored fields act as fallbacks.
    const onetByCode = await getOccupationsByCodes(rows.map(r => r.onetId))
    return rows.map((row) => {
      const merged = mergeCareerWithOnet(
        {
          title: row.title,
          description: row.description,
          onetId: row.onetId,
          whyItMatches: row.whyItMatches,
          jobGrowth: row.jobGrowth ?? undefined,
          salaryRange: row.salaryRange ?? undefined,
          slug: row.slug,
        },
        onetByCode.get(row.onetId),
      )
      return { ...merged, hasScene: hasScene(merged.onetId) }
    })
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
