import 'server-only'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { onetFetch } from './client'
import {
  MnmCareerV2SummarySchema,
  MnmElementGroupSchema,
  MnmTechnologyV2Schema,
  MnmEducationV2Schema,
  MnmJobOutlookV2Schema,
  MnmExploreMoreV2Schema,
  OnlineInterestsSummaryV2Schema,
  type CareerDetail,
} from './schemas'

export interface OccupationRow {
  code: string
  slug: string
  title: string
  description: string | null
  jobZone: number
  brightOutlook: boolean
  riasecPrimary: string | null
  riasecAll: string[]
}

export async function resolveSlug(slug: string): Promise<OccupationRow | null> {
  const rows = await db.select().from(onetOccupations)
    .where(eq(onetOccupations.slug, slug))
    .limit(1)
  return rows[0] ?? null
}

export async function getOccupationByCode(code: string): Promise<OccupationRow | null> {
  const rows = await db.select().from(onetOccupations)
    .where(eq(onetOccupations.code, code))
    .limit(1)
  return rows[0] ?? null
}

export async function getCareerDetail(code: string): Promise<CareerDetail> {
  const [
    summaryRaw,
    knowledgeRaw,
    skillsRaw,
    technologyRaw,
    educationRaw,
    jobOutlookRaw,
    exploreMoreRaw,
    interestsRaw,
  ] = await Promise.all([
    onetFetch<unknown>(`/mnm/careers/${code}`),
    onetFetch<unknown>(`/mnm/careers/${code}/knowledge`),
    onetFetch<unknown>(`/mnm/careers/${code}/skills`),
    onetFetch<unknown>(`/mnm/careers/${code}/technology`),
    onetFetch<unknown>(`/mnm/careers/${code}/education`),
    onetFetch<unknown>(`/mnm/careers/${code}/job_outlook`),
    onetFetch<unknown>(`/mnm/careers/${code}/explore_more`),
    onetFetch<unknown>(`/online/occupations/${code}/summary/interests`),
  ])

  const summary = MnmCareerV2SummarySchema.parse(summaryRaw)
  const knowledge = MnmElementGroupSchema.parse(knowledgeRaw)
  const skills = MnmElementGroupSchema.parse(skillsRaw)
  const technology = MnmTechnologyV2Schema.parse(technologyRaw)
  const education = MnmEducationV2Schema.parse(educationRaw)
  const jobOutlook = MnmJobOutlookV2Schema.parse(jobOutlookRaw)
  const exploreMore = MnmExploreMoreV2Schema.parse(exploreMoreRaw)
  const interests = OnlineInterestsSummaryV2Schema.parse(interestsRaw)

  return {
    code: summary.code,
    title: summary.title,
    description: summary.what_they_do ?? null,
    brightOutlook: Boolean(summary.tags?.bright_outlook),
    tasks: summary.on_the_job,
    skills: skills.flatMap(g => g.element.map(e => e.name)),
    knowledge: knowledge.flatMap(g => g.element.map(e => e.name)),
    technology: technology.flatMap(c => c.example.map(e => e.title)),
    jobZone: education.job_zone.code,
    riasecNames: interests.element.map(e => e.name),
    salaryAnnualMedian: jobOutlook.salary.annual_median ?? null,
    salaryHourlyMedian: jobOutlook.salary.hourly_median ?? null,
    outlookCategory: jobOutlook.outlook.category,
    outlookDescription: jobOutlook.outlook.description,
    relatedCareers: exploreMore.careers.map(c => ({ code: c.code, title: c.title })),
  }
}
