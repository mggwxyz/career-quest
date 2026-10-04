import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Network,
  Scale,
  Target,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { assessmentSessions, careerRecommendations } from '@/db/schema'
import { getSession } from '@/lib/auth/get-session'
import type { AssessmentResult } from '@/lib/assessment/types'
import {
  COMPARE_MIN,
  parseCompareIds,
  projectCareerCompareItem,
  type CareerCompareItem,
} from '@/lib/career/compare'
import {
  getCareerDetail,
  getOccupationsByCodes,
  getSlugsByOnetCodes,
  resolveSlug,
  type OccupationRow,
} from '@/lib/onet/occupations'
import { containerClassName } from '../../_styles/classes'

export const metadata: Metadata = {
  title: 'Compare Careers',
}

const ONET_CODE_RE = /^\d{2}-\d{4}\.\d{2}$/
const DETAIL_TIMEOUT_MS = 3500

interface CompareSearchParams {
  ids?: string | string[]
}

export default async function CareerComparePage({
  searchParams,
}: {
  searchParams: Promise<CompareSearchParams>
}) {
  const session = await getSession()
  if (!session?.user) redirect('/auth/login?redirect=/careers/compare')

  const params = await searchParams
  const ids = parseCompareIds(params.ids)
  const occupations = await resolveCompareOccupations(ids)

  if (occupations.length < COMPARE_MIN) {
    return <CompareEmptyState />
  }

  const codes = occupations.map(occupation => occupation.code)
  const [details, matchReasons, profileResult] = await Promise.all([
    Promise.all(occupations.map(occupation => getCareerDetailSafely(occupation.code))),
    getLatestMatchReasons(session.user.id, codes),
    getLatestProfileResult(session.user.id),
  ])

  const relatedCodes = [...new Set(details.flatMap(detail =>
    detail?.relatedCareers.map(career => career.code) ?? [],
  ))]
  const relatedSlugs = relatedCodes.length > 0
    ? await getSlugsByOnetCodes(relatedCodes).catch((err) => {
      console.error('[careers/compare] related slug lookup failed:', err)
      return new Map<string, string>()
    })
    : new Map<string, string>()

  const items = occupations.map((occupation, index) => projectCareerCompareItem({
    occupation,
    detail: details[index],
    matchReason: matchReasons.get(occupation.code) ?? null,
    profileResult,
    relatedSlugs,
  }))

  return (
    <div className="container relative mx-auto min-w-0 max-w-6xl px-4 py-6 lg:px-0">
      <div className="mb-5">
        <Link
          href="/careers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Explore careers
        </Link>
      </div>

      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/40 px-3 py-1 text-xs font-medium uppercase tracking-[1.5px] text-muted-foreground">
          <Scale className="h-3.5 w-3.5 text-primary-soft" />
          {items.length}
          {' '}
          careers selected
        </div>
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Compare careers</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Scan fit, pay, outlook, preparation, daily work, and adjacent paths side by side.
        </p>
      </header>

      <div className={`${compareGridClass(items.length)} mb-8`}>
        {items.map(item => (
          <CareerSummaryCard key={item.code} item={item} />
        ))}
      </div>

      <CompareSection icon={Lightbulb} title="Tradeoff Snapshot">
        <div className={compareGridClass(items.length)}>
          {items.map(item => (
            <div key={item.code} className="min-w-0 rounded-2xl border border-border bg-surface/40 p-4">
              <Metric label="Fit" value={item.fit.label} />
              <Metric label="Pay" value={item.pay.label} />
              <Metric label="Outlook" value={item.outlook.label} />
              <Metric label="Preparation" value={`Zone ${item.jobZone.number}: ${item.jobZone.name}`} />
            </div>
          ))}
        </div>
      </CompareSection>

      <CompareSection icon={Target} title="Profile Fit">
        <TextGrid items={items} getText={item => item.fit.explanation} />
      </CompareSection>

      <CompareSection icon={TrendingUp} title="Pay And Outlook">
        <div className={compareGridClass(items.length)}>
          {items.map(item => (
            <div key={item.code} className="min-w-0 rounded-2xl border border-border bg-surface/40 p-4">
              <Metric label="Typical pay" value={item.pay.label} />
              <Metric label="Job outlook" value={item.outlook.label} />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.outlook.description}</p>
            </div>
          ))}
        </div>
      </CompareSection>

      <CompareSection icon={GraduationCap} title="Preparation">
        <div className={compareGridClass(items.length)}>
          {items.map(item => (
            <div key={item.code} className="min-w-0 rounded-2xl border border-border bg-surface/40 p-4">
              <p className="text-sm font-semibold text-foreground">
                Job Zone
                {' '}
                {item.jobZone.number}
                :
                {' '}
                {item.jobZone.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.jobZone.description}</p>
            </div>
          ))}
        </div>
      </CompareSection>

      <CompareSection icon={ListChecks} title="Core Tasks">
        <ListGrid
          items={items}
          getItems={item => item.tasks}
          emptyText="Detailed task data is not available yet."
        />
      </CompareSection>

      <CompareSection icon={BookOpen} title="Skills And Knowledge">
        <div className={compareGridClass(items.length)}>
          {items.map(item => (
            <div key={item.code} className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface/40 p-4">
              <TokenList title="Skills to build" items={item.skills} emptyText="Skill details are not available yet." />
              <TokenList title="Knowledge areas" items={item.knowledge} emptyText="Knowledge details are not available yet." />
            </div>
          ))}
        </div>
      </CompareSection>

      <CompareSection icon={BriefcaseBusiness} title="Work Context">
        <div className={compareGridClass(items.length)}>
          {items.map(item => (
            <div key={item.code} className="min-w-0 rounded-2xl border border-border bg-surface/40 p-4">
              <p className="text-sm font-semibold text-foreground">{item.workContext.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.workContext.explanation}</p>
              {item.riasec.names.length > 0 && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  O*NET interest themes:
                  {' '}
                  <span className="text-foreground">{item.riasec.names.join(' · ')}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </CompareSection>

      <CompareSection icon={Wrench} title="Technology">
        <ListGrid
          items={items}
          getItems={item => item.technology}
          emptyText="Technology data is not available yet."
        />
      </CompareSection>

      <CompareSection icon={Network} title="Related Careers">
        <div className={compareGridClass(items.length)}>
          {items.map(item => (
            <div key={item.code} className="min-w-0 rounded-2xl border border-border bg-surface/40 p-4">
              {item.relatedCareers.length > 0
                ? (
                  <div className="flex flex-wrap gap-2">
                    {item.relatedCareers.map(career => (
                      <Link
                        key={career.code}
                        href={`/careers/${career.slug ?? career.code}`}
                        className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground no-underline transition-colors hover:border-border-hover hover:text-foreground"
                      >
                        {career.title}
                      </Link>
                    ))}
                  </div>
                )
                : (
                  <p className="text-sm text-muted-foreground">Related career data is not available yet.</p>
                )}
            </div>
          ))}
        </div>
      </CompareSection>
    </div>
  )
}

async function resolveCompareOccupations(ids: string[]): Promise<OccupationRow[]> {
  const resolvedCodes = await Promise.all(ids.map(async (id) => {
    if (ONET_CODE_RE.test(id)) return id
    const occupation = await resolveSlug(id).catch(() => null)
    return occupation?.code ?? null
  }))

  const codes = [...new Set(resolvedCodes.filter((code): code is string => Boolean(code)))]
  if (codes.length === 0) return []

  const byCode = await getOccupationsByCodes(codes)
  return codes
    .map(code => byCode.get(code))
    .filter((occupation): occupation is OccupationRow => Boolean(occupation))
}

async function getCareerDetailSafely(code: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DETAIL_TIMEOUT_MS)

  try {
    return await getCareerDetail(code, { signal: controller.signal })
  }
  catch (err) {
    console.error(`[careers/compare] getCareerDetail failed for ${code}:`, err)
    return null
  }
  finally {
    clearTimeout(timeout)
  }
}

async function getLatestMatchReasons(userId: string, codes: string[]): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map()

  const rows = await db.select({
    onetId: careerRecommendations.onetId,
    whyItMatches: careerRecommendations.whyItMatches,
  })
    .from(careerRecommendations)
    .where(and(
      eq(careerRecommendations.userId, userId),
      inArray(careerRecommendations.onetId, codes),
    ))
    .orderBy(desc(careerRecommendations.createdAt))

  const reasons = new Map<string, string>()
  for (const row of rows) {
    if (!reasons.has(row.onetId)) {
      reasons.set(row.onetId, row.whyItMatches)
    }
  }
  return reasons
}

async function getLatestProfileResult(userId: string): Promise<AssessmentResult | null> {
  const [row] = await db.select({ result: assessmentSessions.result })
    .from(assessmentSessions)
    .where(and(
      eq(assessmentSessions.userId, userId),
      isNotNull(assessmentSessions.completedAt),
    ))
    .orderBy(desc(assessmentSessions.completedAt))
    .limit(1)

  return row?.result ? row.result as AssessmentResult : null
}

function CompareEmptyState() {
  return (
    <div className={`${containerClassName} min-h-[calc(100vh-8rem)]`}>
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface/50">
          <Scale className="h-6 w-6 text-primary-soft" />
        </div>
        <h1 className="font-serif text-3xl text-foreground">Choose 2 or 3 careers</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Use Compare on career cards, then open the tray to review them side by side.
        </p>
        <Link
          href="/careers"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground no-underline transition-colors hover:bg-primary-soft"
        >
          Browse careers
        </Link>
      </div>
    </div>
  )
}

function CareerSummaryCard({ item }: { item: CareerCompareItem }) {
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-surface/50 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {item.dataStatus === 'partial' && (
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
            Partial detail
          </span>
        )}
        {item.outlook.bright && (
          <span className="rounded-full bg-green-400 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-black">
            Bright outlook
          </span>
        )}
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        <Link href={`/careers/${item.slug}`} className="no-underline transition-colors hover:text-primary-soft">
          {item.title}
        </Link>
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      {item.missingDetailLabel && (
        <p className="mt-3 rounded-xl border border-border bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {item.missingDetailLabel}
        </p>
      )}
    </article>
  )
}

function CompareSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-8 min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary-soft" />
        <h2 className="text-sm font-semibold uppercase tracking-[1.5px] text-muted-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function TextGrid({
  items,
  getText,
}: {
  items: CareerCompareItem[]
  getText: (item: CareerCompareItem) => string
}) {
  return (
    <div className={compareGridClass(items.length)}>
      {items.map(item => (
        <div key={item.code} className="min-w-0 rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{getText(item)}</p>
        </div>
      ))}
    </div>
  )
}

function ListGrid({
  items,
  getItems,
  emptyText,
}: {
  items: CareerCompareItem[]
  getItems: (item: CareerCompareItem) => string[]
  emptyText: string
}) {
  return (
    <div className={compareGridClass(items.length)}>
      {items.map((item) => {
        const values = getItems(item)
        return (
          <div key={item.code} className="min-w-0 rounded-2xl border border-border bg-surface/40 p-4">
            {values.length > 0
              ? (
                <ul className="space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
                  {values.map(value => (
                    <li key={value} className="list-disc break-words">{value}</li>
                  ))}
                </ul>
              )
              : (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
              )}
          </div>
        )
      })}
    </div>
  )
}

function TokenList({
  title,
  items,
  emptyText,
}: {
  title: string
  items: string[]
  emptyText: string
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      {items.length > 0
        ? (
          <div className="flex flex-wrap gap-2">
            {items.map(item => (
              <span
                key={item}
                className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        )
        : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
    </div>
  )
}

function Metric({ label, value }: { label: string, value: string }) {
  return (
    <div className="border-b border-border/70 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-[10px] font-medium uppercase tracking-[1.4px] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function compareGridClass(count: number): string {
  return count >= 3
    ? 'grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3'
    : 'grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2'
}
