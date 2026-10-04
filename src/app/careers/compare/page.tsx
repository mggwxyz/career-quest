import Link from 'next/link'
import { redirect } from 'next/navigation'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { careerRecommendations, recommendationRuns } from '@/db/schema'
import { containerClassName } from '@/app/_styles/classes'
import { getSession } from '@/lib/auth/get-session'
import { getOccupationsByCodes, type OccupationRow } from '@/lib/onet/occupations'
import { getLaborMarketContextForUser, getLaborMarketSummariesForOnetCodes } from '@/lib/labor-market/summary'
import { RegionSelector } from '@/components/labor-market/RegionSelector'
import { LocalLaborMarketCard } from '@/components/labor-market/LocalLaborMarketCard'

interface SearchParams {
  codes?: string
}

function parseCodes(raw: string | undefined): string[] {
  if (!raw) return []
  return [...new Set(raw.split(',').map(code => code.trim())
    .filter(Boolean))]
    .slice(0, 6)
}

async function latestRecommendationCodes(userId: string): Promise<string[]> {
  const [latestRun] = await db.select({ id: recommendationRuns.id })
    .from(recommendationRuns)
    .where(eq(recommendationRuns.userId, userId))
    .orderBy(desc(recommendationRuns.createdAt))
    .limit(1)
  if (!latestRun) return []

  const rows = await db.select({ onetId: careerRecommendations.onetId })
    .from(careerRecommendations)
    .where(and(
      eq(careerRecommendations.userId, userId),
      eq(careerRecommendations.runId, latestRun.id),
    ))
    .orderBy(careerRecommendations.rank)
    .limit(3)

  return rows.map(row => row.onetId)
}

export default async function CompareCareersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await getSession()
  if (!session?.user) redirect('/auth/login?redirect=/careers/compare')

  const params = await searchParams
  const requestedCodes = parseCodes(params.codes)
  const codes = requestedCodes.length > 0
    ? requestedCodes
    : await latestRecommendationCodes(session.user.id)

  const [laborMarketContext, occupationsByCode] = await Promise.all([
    getLaborMarketContextForUser(session.user.id),
    getOccupationsByCodes(codes),
  ])
  const summaries = await getLaborMarketSummariesForOnetCodes(codes, session.user.id, occupationsByCode)
  const occupations = codes.map(code => occupationsByCode.get(code))
    .filter((occupation): occupation is OccupationRow => Boolean(occupation))

  return (
    <div className={containerClassName}>
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-serif text-3xl text-foreground sm:text-4xl">Compare careers</h1>
        <p className="text-sm text-muted-foreground">Local wages, employment, training, and job availability by region</p>
        <div className="mt-4 flex justify-center">
          <RegionSelector
            regions={laborMarketContext.regions}
            selectedRegionId={laborMarketContext.selectedRegion.id}
          />
        </div>
      </div>

      {occupations.length === 0
        ? (
          <div className="rounded-xl border border-border bg-surface/40 p-8 text-center">
            <h2 className="mb-2 font-serif text-xl text-foreground">No careers to compare yet</h2>
            <p className="mx-auto mb-5 max-w-lg text-sm text-muted-foreground">
              Generate matches first, or open this page with O*NET codes in the URL.
            </p>
            <Link
              href="/discover/matches"
              className="inline-flex rounded-full border border-border px-5 py-2 text-sm text-muted-foreground no-underline hover:border-border-hover hover:text-foreground"
            >
              Go to matches
            </Link>
          </div>
        )
        : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {occupations.map((occupation) => {
              const summary = summaries.get(occupation.code)
              return (
                <div key={occupation.code} className="space-y-3">
                  <div className="rounded-xl border border-border bg-surface/45 p-5">
                    <h2 className="mb-1 text-base font-semibold text-foreground">{occupation.shortTitle ?? occupation.title}</h2>
                    {occupation.shortDescription ?? occupation.description
                      ? <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{occupation.shortDescription ?? occupation.description}</p>
                      : null}
                    <Link
                      href={`/careers/${occupation.slug}`}
                      className="text-xs font-medium text-primary-soft no-underline hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                  {summary && <LocalLaborMarketCard summary={summary} />}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
