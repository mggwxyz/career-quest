import { and, desc, eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations, recommendationRuns } from '@/db/schema'
import CareersClient from './_components/CareersClient'
import { CareerRecommendation } from '@/lib/schemas/career'
import { getOccupationsByCodes } from '@/lib/onet/occupations'
import { mergeCareerWithOnet } from '@/lib/career/recommendation-onet'
import { getLaborMarketContextForUser, getLaborMarketSummariesForOnetCodes } from '@/lib/labor-market/summary'
import type { LaborMarketRegion, LaborMarketSummary } from '@/lib/labor-market/types'

interface MatchesPageData {
  careers: CareerRecommendation[]
  laborMarketByOnetId: Record<string, LaborMarketSummary>
  laborMarketContext: {
    regions: LaborMarketRegion[]
    selectedRegion: LaborMarketRegion
  } | null
}

async function getUserCareers(): Promise<MatchesPageData> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { careers: [], laborMarketByOnetId: {}, laborMarketContext: null }
    }
    const user = session.user

    const [latestRun] = await db.select({ id: recommendationRuns.id })
      .from(recommendationRuns)
      .where(eq(recommendationRuns.userId, user.id))
      .orderBy(desc(recommendationRuns.createdAt))
      .limit(1)
    if (!latestRun) {
      const laborMarketContext = await getLaborMarketContextForUser(user.id)
      return { careers: [], laborMarketByOnetId: {}, laborMarketContext }
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
    const careers = rows.map(row => mergeCareerWithOnet(
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
    ))
    const [laborMarketContext, laborMarketSummaries] = await Promise.all([
      getLaborMarketContextForUser(user.id),
      getLaborMarketSummariesForOnetCodes(careers.map(c => c.onetId), user.id, onetByCode),
    ])

    return {
      careers,
      laborMarketContext,
      laborMarketByOnetId: Object.fromEntries(laborMarketSummaries),
    }
  }
  catch (error) {
    // Let Next.js handle its dynamic-rendering probe — re-throw so
    // static analysis can mark the route as dynamic without surfacing
    // a phantom error in build logs.
    if ((error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    console.error('[careers/page] getUserCareers failed:', error)
    return { careers: [], laborMarketByOnetId: {}, laborMarketContext: null }
  }
}

export default async function CareersPage() {
  const { careers, laborMarketByOnetId, laborMarketContext } = await getUserCareers()

  return (
    <CareersClient
      initialCareers={careers}
      initialLaborMarketByOnetId={laborMarketByOnetId}
      laborMarketContext={laborMarketContext}
    />
  )
}
