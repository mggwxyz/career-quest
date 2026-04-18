import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { searchOccupations } from '@/lib/onet/browse'
import { containerClassName } from '../../_styles/classes'
import { ExploreFilters } from './_components/ExploreFilters'

interface SearchParams {
  q?: string
  riasec?: string
  zone?: string
  bright?: string
  page?: string
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await getSession()
  if (!session?.user) redirect('/auth/login?redirect=/careers/explore')

  const params = await searchParams
  const filters = {
    q: params.q,
    riasec: params.riasec?.split(',').filter(Boolean) ?? [],
    zone: params.zone?.split(',').map(n => parseInt(n, 10))
      .filter(n => n >= 1 && n <= 5) ?? [],
    bright: params.bright === '1',
    page: parseInt(params.page ?? '1', 10),
  }

  const { rows, total, page, pageSize } = await searchOccupations(filters)
  const hasMore = page * pageSize < total

  return (
    <div className={containerClassName}>
      <div className="text-center mb-8 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Explore careers</h1>
        <p className="text-sm text-muted-foreground">Search and filter the full O*NET catalog</p>
      </div>

      <ExploreFilters
        q={filters.q ?? ''}
        riasec={filters.riasec}
        zone={filters.zone}
        bright={filters.bright}
      />

      <div className="flex items-center justify-between mt-6 mb-4">
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()}
          {' '}
          careers match
        </p>
        {(filters.q || filters.riasec.length || filters.zone.length || filters.bright) && (
          <Link href="/careers/explore" className="text-sm text-primary-soft hover:underline">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map(row => (
                <Link
                  key={row.code}
                  href={`/careers/${row.slug}`}
                  className="block p-5 rounded-2xl border border-border bg-surface/50 hover:border-border-hover hover:-translate-y-0.5 transition-all no-underline"
                >
                  <h3 className="text-sm font-semibold text-foreground">{row.title}</h3>
                  <p className="text-xs text-muted-foreground mt-2">
                    Zone
                    {' '}
                    {row.jobZone}
                    {row.brightOutlook && ' · Bright'}
                    {row.riasecAll.length > 0 && ` · ${row.riasecAll.join('·')}`}
                  </p>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Link
                  href={{
                    pathname: '/careers/explore',
                    query: { ...params, page: String(page + 1) },
                  }}
                  className="px-6 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:border-border-hover no-underline"
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
