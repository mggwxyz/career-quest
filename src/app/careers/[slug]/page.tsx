import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations, careerUserActions } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { resolveSlug, getOccupationByCode, getCareerDetail, getSlugsByOnetCodes } from '@/lib/onet/occupations'
import { toCareerContext } from '@/lib/onet/projectors'
import { CareerDetailsHeader } from './_components/CareerDetailsHeader'
import { CareerDetailsPanel } from './_components/CareerDetailsPanel'
import { CareerRolePlayChat } from './_components/CareerRolePlayChat'
import { CareerSaveButton } from './_components/CareerSaveButton'
import { getPersona } from '@/lib/personas'
import { containerClassName } from '../../_styles/classes'

const ONET_CODE_RE = /^\d{2}-\d{4}\.\d{2}$/

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const session = await getSession()
  const isAuthenticated = !!session?.user

  // Legacy O*NET-code URLs → 301 to canonical slug
  if (ONET_CODE_RE.test(slug)) {
    const byCode = await getOccupationByCode(slug)
    if (byCode) redirect(`/careers/${byCode.slug}`)
    notFound()
  }

  const occupation = await resolveSlug(slug)
  if (!occupation) notFound()

  const [detail, recRows, savedRows] = await Promise.all([
    getCareerDetail(occupation.code).catch((err) => {
      console.error('[careers/[slug]] getCareerDetail failed:', err)
      return null
    }),
    session?.user
      ? db.select().from(careerRecommendations)
        .where(and(
          eq(careerRecommendations.userId, session.user.id),
          eq(careerRecommendations.onetId, occupation.code),
        ))
        .limit(1)
      : Promise.resolve([]),
    session?.user
      ? db.select().from(careerUserActions)
        .where(and(
          eq(careerUserActions.userId, session.user.id),
          eq(careerUserActions.onetId, occupation.code),
          eq(careerUserActions.action, 'saved'),
        ))
        .limit(1)
      : Promise.resolve([]),
  ])

  const whyItMatches = recRows[0]?.whyItMatches ?? null

  const relatedSlugs = detail
    ? await getSlugsByOnetCodes(detail.relatedCareers.map(r => r.code))
    : new Map<string, string>()
  const relatedCareers = detail
    ? detail.relatedCareers.map(r => ({ code: r.code, title: r.title, slug: relatedSlugs.get(r.code) ?? null }))
    : []

  // Map RIASEC letter codes back to full names so the fallback chat context
  // stays consistent with the projector (which emits full names).
  const RIASEC_NAMES: Record<string, string> = {
    R: 'Realistic', I: 'Investigative', A: 'Artistic',
    S: 'Social', E: 'Enterprising', C: 'Conventional',
  }
  const careerContext = detail
    ? toCareerContext(detail)
    : {
      title: occupation.title,
      onetCode: occupation.code,
      shortDescription: occupation.description ?? '',
      tasks: [],
      skills: [],
      knowledge: [],
      workActivities: [],
      technology: [],
      jobZone: {
        number: occupation.jobZone,
        name: '',
        description: '',
      },
      riasecTop: occupation.riasecAll.map(c => RIASEC_NAMES[c] ?? c),
      salaryMedian: 'varies',
      outlook: '',
    }

  const persona = getPersona(occupation.code)

  return (
    <div className={containerClassName}>
      <div className="space-y-6">
        <CareerDetailsHeader
          occupation={occupation}
          detail={detail}
          whyItMatches={whyItMatches}
        >
          <CareerSaveButton
            onetId={occupation.code}
            redirectPath={`/careers/${occupation.slug}`}
            isAuthenticated={isAuthenticated}
            initiallySaved={savedRows.length > 0}
          />
        </CareerDetailsHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isAuthenticated
              ? (
                <CareerRolePlayChat
                  careerContext={careerContext}
                  recommendationContext={whyItMatches ? { whyItMatches } : null}
                  persona={persona}
                />
              )
              : (
                <div className="rounded-2xl border border-border bg-surface/50 p-6 text-center">
                  <h2 className="font-serif text-2xl text-foreground mb-2">Want to ask about this career?</h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    Sign in to use the AI role-play chat and keep the conversation tied to your profile.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link
                      href={`/auth/sign-up?redirect=${encodeURIComponent(`/careers/${occupation.slug}`)}`}
                      className="rounded-full bg-gradient-to-br from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-primary-foreground no-underline shadow-[var(--shadow-glow-sm)]"
                    >
                      Sign up
                    </Link>
                    <Link
                      href={`/auth/login?redirect=${encodeURIComponent(`/careers/${occupation.slug}`)}`}
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground no-underline transition-all hover:border-border-hover hover:text-foreground"
                    >
                      Log in
                    </Link>
                  </div>
                </div>
              )}
          </div>
          <div className="lg:col-span-1">
            <CareerDetailsPanel
              occupation={occupation}
              detail={detail}
              relatedCareers={relatedCareers}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
