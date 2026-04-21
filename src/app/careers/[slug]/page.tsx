import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { resolveSlug, getOccupationByCode, getCareerDetail } from '@/lib/onet/occupations'
import { toCareerContext } from '@/lib/onet/projectors'
import { CareerDetailsPanel } from './_components/CareerDetailsPanel'
import { CareerRolePlayChat } from './_components/CareerRolePlayChat'
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
  if (!session?.user) redirect(`/auth/login?redirect=${encodeURIComponent(`/careers/${slug}`)}`)

  // Legacy O*NET-code URLs → 301 to canonical slug
  if (ONET_CODE_RE.test(slug)) {
    const byCode = await getOccupationByCode(slug)
    if (byCode) redirect(`/careers/${byCode.slug}`)
    notFound()
  }

  const occupation = await resolveSlug(slug)
  if (!occupation) notFound()

  const [detail, recRows] = await Promise.all([
    getCareerDetail(occupation.code).catch((err) => {
      console.error('[careers/[slug]] getCareerDetail failed:', err)
      return null
    }),
    db.select().from(careerRecommendations)
      .where(and(
        eq(careerRecommendations.userId, session.user.id),
        eq(careerRecommendations.onetId, occupation.code),
      ))
      .limit(1),
  ])

  const whyItMatches = recRows[0]?.whyItMatches ?? null

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CareerDetailsPanel
            occupation={occupation}
            detail={detail}
            whyItMatches={whyItMatches}
          />
        </div>
        <div className="lg:col-span-2">
          <CareerRolePlayChat
            careerContext={careerContext}
            recommendationContext={whyItMatches ? { whyItMatches } : null}
            persona={persona}
          />
        </div>
      </div>
    </div>
  )
}
