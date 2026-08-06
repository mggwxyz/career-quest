import Link from 'next/link'
import { getUserId } from '@/lib/auth/identity'
import { searchOccupations } from '@/lib/onet/browse'
import { listPersonaOnetIds } from '@/lib/personas'
import { hasScene } from '@/lib/scenes'
import { SceneImage } from '@/components/scene-image'
import { GuestSaveBanner } from '@/components/guest-save-banner'
import { ONET_NATIONAL_DATA_LABEL } from '@/lib/onet/source-labels'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { containerClassName } from '../_styles/classes'
import { ExploreFilters } from './_components/ExploreFilters'

interface SearchParams {
  q?: string
  riasec?: string
  zone?: string
  bright?: string
  chat?: string
  matches?: string
  page?: string
}

function parsePageParam(value: string | undefined) {
  const raw = value ?? '1'
  if (!/^\d+$/.test(raw)) return 1
  const page = Number(raw)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const identity = await getUserId()

  const params = await searchParams
  const chatReady = params.chat === '1'
  const matchesOnly = params.matches === '1'
  const filters = {
    q: params.q,
    riasec: params.riasec?.split(',').filter(Boolean) ?? [],
    zone: params.zone?.split(',').map(n => parseInt(n, 10))
      .filter(n => n >= 1 && n <= 5) ?? [],
    bright: params.bright === '1',
    chatReady,
    matchesOnly,
    page: parsePageParam(params.page),
  }

  let matchesOnetIds: string[] | undefined
  if (matchesOnly) {
    const recRows = identity
      ? await db.select({ onetId: careerRecommendations.onetId })
        .from(careerRecommendations)
        .where(eq(careerRecommendations.userId, identity.id))
      : []
    matchesOnetIds = [...new Set(recRows.map(r => r.onetId))]
  }

  const onetIds = chatReady && matchesOnly
    ? listPersonaOnetIds().filter(id => matchesOnetIds!.includes(id))
    : chatReady
      ? listPersonaOnetIds()
      : matchesOnly
        ? matchesOnetIds
        : undefined

  const { rows, total, page, pageSize } = await searchOccupations({
    ...filters,
    onetIds,
  })
  const hasMore = page * pageSize < total

  return (
    <div className={`${containerClassName} min-h-[calc(100vh-5rem)]`}>
      <GuestSaveBanner />
      <div className="text-center mb-8 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Explore careers</h1>
        <p className="text-sm text-muted-foreground">Search and filter the full O*NET catalog</p>
        <p className="text-xs text-muted-foreground/80 mt-2 max-w-lg mx-auto">
          Ordered with bright outlook and higher typical pay first, then A-Z by title.
          {' '}
          Pay and outlook use
          {' '}
          {ONET_NATIONAL_DATA_LABEL}
          .
        </p>
      </div>

      <ExploreFilters />

      <div className="flex items-center justify-between mt-8 mb-5">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{total.toLocaleString()}</span>
          {' '}
          careers match
        </p>
        {(filters.q || filters.riasec.length || filters.zone.length || filters.bright || filters.chatReady || filters.matchesOnly) && (
          <Link href="/careers" className="text-sm text-primary-soft hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      {rows.length === 0
        ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="font-serif text-xl text-foreground mb-3">No careers match these filters</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-4">Try removing a filter or searching for a different keyword.</p>
          </div>
        )
        : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {rows.map((row, index) => (
                <Link
                  key={row.code}
                  href={`/careers/${row.slug}`}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/50 hover:border-border-hover hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all no-underline group"
                >
                  {hasScene(row.code) && (
                    <SceneImage
                      onetId={row.code}
                      alt={`${row.shortTitle ?? row.title} at work`}
                      className="aspect-[3/2] w-full border-b border-border"
                      sizes="(min-width: 768px) 50vw, 100vw"
                      priority={index < 2}
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
                      <h2 className="min-w-0 break-words text-base font-semibold text-foreground group-hover:text-primary-soft transition-colors">
                        {row.shortTitle ?? row.title}
                      </h2>
                      {row.brightOutlook && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium bg-green-400 text-black">
                          ✦ Bright
                        </span>
                      )}
                    </div>
                    {(row.shortDescription ?? row.description) && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {row.shortDescription ?? row.description}
                      </p>
                    )}
                    {(row.salaryAnnualMedian != null || row.salaryHourlyMedian != null || row.outlookCategory) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs">
                        {row.salaryAnnualMedian != null
                          ? (
                            <span className="text-muted-foreground">
                              <span className="text-foreground font-medium">Salary:</span>
                              {' $'}
                              {row.salaryAnnualMedian.toLocaleString()}
                              /yr
                            </span>
                          )
                          : row.salaryHourlyMedian != null
                            ? (
                              <span className="text-muted-foreground">
                                <span className="text-foreground font-medium">Pay:</span>
                                {' $'}
                                {row.salaryHourlyMedian}
                                /hr
                              </span>
                            )
                            : null}
                        {row.outlookCategory && (
                          <span className="text-muted-foreground">
                            <span className="text-foreground font-medium">Growth:</span>
                            {' '}
                            {row.outlookCategory}
                          </span>
                        )}
                      </div>
                    )}
                    {(row.salaryAnnualMedian != null || row.salaryHourlyMedian != null || row.outlookCategory) && (
                      <p className="mb-3 text-[10px] leading-snug text-muted-foreground">
                        Source:
                        {' '}
                        {ONET_NATIONAL_DATA_LABEL}
                      </p>
                    )}
                    {row.riasecAll.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {row.riasecAll.map(code => (
                          <span
                            key={code}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-background/40 text-muted-foreground"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-10">
                <Link
                  href={{
                    pathname: '/careers',
                    query: { ...params, page: String(page + 1) },
                  }}
                  className="px-7 py-3 rounded-full border border-border text-sm text-muted-foreground hover:border-border-hover hover:text-foreground transition-all no-underline"
                  scroll={false}
                >
                  Load more
                </Link>
              </div>
            )}
          </>
        )}
    </div>
  )
}
