import 'server-only'

import { asc, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  assessmentSessions,
  careerRecommendations,
  careerUserActions,
  recommendationRuns,
  userInterests,
} from '@/db/schema'
import type { AssessmentResult } from '@/lib/assessment'
import { getOccupationsByCodes, type OccupationRow } from '@/lib/onet/occupations'
import {
  buildCareerActionStates,
  type CareerActionState,
} from './user-actions'
import { createEmptyCareerActionState } from './action-types'

type ActionRow = typeof careerUserActions.$inferSelect
type RecommendationRow = typeof careerRecommendations.$inferSelect
type AssessmentRow = typeof assessmentSessions.$inferSelect
type RunRow = typeof recommendationRuns.$inferSelect

export interface PortfolioCareer {
  onetId: string
  slug: string | null
  title: string
  description: string | null
  brightOutlook: boolean
  salaryAnnualMedian: number | null
  outlookCategory: string | null
  state: CareerActionState
  activityAt: Date | null
  whyItMatches: string | null
  note: string | null
}

export interface PortfolioAssessmentAttempt {
  id: string
  status: 'completed' | 'active' | 'abandoned'
  hollandCode: string | null
  gradeBand: string | null
  itemsAnswered: number | null
  startedAt: Date
  completedAt: Date | null
  abandonedAt: Date | null
  inconsistency: boolean
}

export interface PortfolioRecommendationRun {
  id: string
  createdAt: Date
  model: string
  durationMs: number | null
  careerCount: number
}

export interface PortfolioNextAction {
  label: string
  href: string
  detail: string
}

export interface PortfolioDashboard {
  profile: {
    hollandCode: string | null
    interests: string[]
    completedAssessments: number
    recommendationRuns: number
  }
  savedCareers: PortfolioCareer[]
  shortlistedCareers: PortfolioCareer[]
  recentlyViewedCareers: PortfolioCareer[]
  recentChatCareers: PortfolioCareer[]
  recentNotes: PortfolioCareer[]
  assessmentAttempts: PortfolioAssessmentAttempt[]
  recommendationRunHistory: PortfolioRecommendationRun[]
  nextActions: PortfolioNextAction[]
}

function resultFrom(row: AssessmentRow): AssessmentResult | null {
  return row.result as AssessmentResult | null
}

function attemptFrom(row: AssessmentRow): PortfolioAssessmentAttempt {
  const result = resultFrom(row)
  const status = row.completedAt ? 'completed' : row.abandonedAt ? 'abandoned' : 'active'
  return {
    id: row.id,
    status,
    hollandCode: result?.hollandCode ?? null,
    gradeBand: row.gradeBand,
    itemsAnswered: result?.meta?.itemsAnswered ?? null,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    abandonedAt: row.abandonedAt,
    inconsistency: row.inconsistency,
  }
}

function latestActionByOnet(rows: ActionRow[]): Map<string, Date> {
  const latest = new Map<string, Date>()
  for (const row of rows) latest.set(row.onetId, row.createdAt)
  return latest
}

function latestMatchingActions(
  rows: ActionRow[],
  action: ActionRow['action'],
): ActionRow[] {
  const byOnet = new Map<string, ActionRow>()
  for (const row of [...rows].reverse()) {
    if (row.action === action && !byOnet.has(row.onetId)) {
      byOnet.set(row.onetId, row)
    }
  }
  return [...byOnet.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

function recommendationFallbacks(rows: RecommendationRow[]): Map<string, RecommendationRow> {
  const byOnet = new Map<string, RecommendationRow>()
  for (const row of rows) {
    if (!byOnet.has(row.onetId)) byOnet.set(row.onetId, row)
  }
  return byOnet
}

function toPortfolioCareer({
  onetId,
  occupation,
  recommendation,
  state,
  activityAt,
  note,
}: {
  onetId: string
  occupation: OccupationRow | undefined
  recommendation: RecommendationRow | undefined
  state: CareerActionState
  activityAt: Date | null
  note?: string | null
}): PortfolioCareer {
  return {
    onetId,
    slug: occupation?.slug ?? recommendation?.slug ?? null,
    title: occupation?.shortTitle ?? occupation?.title ?? recommendation?.title ?? onetId,
    description: occupation?.shortDescription ?? occupation?.description ?? recommendation?.description ?? null,
    brightOutlook: occupation?.brightOutlook ?? false,
    salaryAnnualMedian: occupation?.salaryAnnualMedian ?? null,
    outlookCategory: occupation?.outlookCategory ?? recommendation?.jobGrowth ?? null,
    state,
    activityAt,
    whyItMatches: recommendation?.whyItMatches ?? null,
    note: note ?? state.latestNote,
  }
}

function careerHref(career: PortfolioCareer): string {
  return `/careers/${career.slug ?? career.onetId}`
}

function buildNextActions({
  latestAssessment,
  savedCareers,
  shortlistedCareers,
  recentChatCareers,
  recentNotes,
  recommendationRunCount,
}: {
  latestAssessment: PortfolioAssessmentAttempt | undefined
  savedCareers: PortfolioCareer[]
  shortlistedCareers: PortfolioCareer[]
  recentChatCareers: PortfolioCareer[]
  recentNotes: PortfolioCareer[]
  recommendationRunCount: number
}): PortfolioNextAction[] {
  const actions: PortfolioNextAction[] = []

  if (!latestAssessment || latestAssessment.status !== 'completed') {
    actions.push({
      label: 'Complete your assessment',
      href: '/discover/would-you-rather',
      detail: 'Build a profile before generating career matches.',
    })
  }
  else if (recommendationRunCount === 0) {
    actions.push({
      label: 'Generate career matches',
      href: '/discover/matches',
      detail: 'Use your latest profile to create a saved recommendation run.',
    })
  }

  if (savedCareers.length === 0) {
    actions.push({
      label: 'Save one career',
      href: '/careers',
      detail: 'Keep promising paths here so you can come back later.',
    })
  }
  else if (shortlistedCareers.length === 0) {
    actions.push({
      label: 'Shortlist a saved career',
      href: careerHref(savedCareers[0]),
      detail: 'Move your strongest saved option into the shortlist.',
    })
  }

  if (shortlistedCareers.length > 0) {
    actions.push({
      label: 'Revisit your shortlist',
      href: careerHref(shortlistedCareers[0]),
      detail: 'Open a top option, chat with the role, and capture a note.',
    })
  }

  if (recentChatCareers.length > 0 && recentNotes.length === 0) {
    actions.push({
      label: 'Write down what you learned',
      href: careerHref(recentChatCareers[0]),
      detail: 'Turn your recent chat into a note before it fades.',
    })
  }

  return actions.slice(0, 4)
}

export async function getPortfolioDashboard(userId: string): Promise<PortfolioDashboard> {
  const [
    actionRows,
    assessmentRows,
    runRows,
    recommendationRows,
    interestRows,
  ] = await Promise.all([
    db.select().from(careerUserActions)
      .where(eq(careerUserActions.userId, userId))
      .orderBy(desc(careerUserActions.createdAt))
      .limit(300),
    db.select().from(assessmentSessions)
      .where(eq(assessmentSessions.userId, userId))
      .orderBy(desc(assessmentSessions.startedAt))
      .limit(8),
    db.select().from(recommendationRuns)
      .where(eq(recommendationRuns.userId, userId))
      .orderBy(desc(recommendationRuns.createdAt))
      .limit(6),
    db.select().from(careerRecommendations)
      .where(eq(careerRecommendations.userId, userId))
      .orderBy(desc(careerRecommendations.createdAt), asc(careerRecommendations.rank))
      .limit(80),
    db.select({ interest: userInterests.interest }).from(userInterests)
      .where(eq(userInterests.userId, userId))
      .orderBy(asc(userInterests.createdAt)),
  ])

  const chronologicalActionRows = [...actionRows].reverse()
  const states = buildCareerActionStates(chronologicalActionRows)
  const latestByOnet = latestActionByOnet(chronologicalActionRows)
  const recByOnet = recommendationFallbacks(recommendationRows)
  const actionOnetIds = [...states.keys()]
  const recommendationOnetIds = recommendationRows.map(row => row.onetId)
  const allOnetIds = [...new Set([...actionOnetIds, ...recommendationOnetIds])]
  const occupations = await getOccupationsByCodes(allOnetIds)

  const toCareer = (
    onetId: string,
    activityAt: Date | null = latestByOnet.get(onetId) ?? null,
    note?: string | null,
  ) => toPortfolioCareer({
    onetId,
    occupation: occupations.get(onetId),
    recommendation: recByOnet.get(onetId),
    state: states.get(onetId) ?? createEmptyCareerActionState(),
    activityAt,
    note,
  })

  const activeStateCareers = [...states.entries()]
    .map(([onetId, state]) => ({ onetId, state, activityAt: latestByOnet.get(onetId) ?? null }))
    .sort((a, b) => (b.activityAt?.getTime() ?? 0) - (a.activityAt?.getTime() ?? 0))

  const savedCareers = activeStateCareers
    .filter(({ state }) => state.saved && !state.dismissed)
    .map(({ onetId, activityAt }) => toCareer(onetId, activityAt))
    .slice(0, 6)

  const shortlistedCareers = activeStateCareers
    .filter(({ state }) => state.shortlisted && !state.dismissed)
    .map(({ onetId, activityAt }) => toCareer(onetId, activityAt))
    .slice(0, 6)

  const recentlyViewedCareers = latestMatchingActions(chronologicalActionRows, 'view')
    .filter(row => !states.get(row.onetId)?.dismissed)
    .map(row => toCareer(row.onetId, row.createdAt))
    .slice(0, 6)

  const recentChatCareers = latestMatchingActions(chronologicalActionRows, 'chat')
    .filter(row => !states.get(row.onetId)?.dismissed)
    .map(row => toCareer(row.onetId, row.createdAt))
    .slice(0, 4)

  const recentNotes = latestMatchingActions(chronologicalActionRows, 'note')
    .filter(row => row.note?.trim() && !states.get(row.onetId)?.dismissed)
    .map(row => toCareer(row.onetId, row.createdAt, row.note))
    .slice(0, 4)

  const assessmentAttempts = assessmentRows.map(attemptFrom)
  const latestCompletedAssessment = assessmentAttempts.find(a => a.status === 'completed')

  const runIds = new Set(runRows.map(row => row.id))
  const recommendationCountByRun = recommendationRows.reduce((counts, row) => {
    if (runIds.has(row.runId)) counts.set(row.runId, (counts.get(row.runId) ?? 0) + 1)
    return counts
  }, new Map<string, number>())

  const recommendationRunHistory = runRows.map((row: RunRow) => ({
    id: row.id,
    createdAt: row.createdAt,
    model: row.model,
    durationMs: row.durationMs,
    careerCount: recommendationCountByRun.get(row.id) ?? 0,
  }))

  return {
    profile: {
      hollandCode: latestCompletedAssessment?.hollandCode ?? null,
      interests: interestRows.map(row => row.interest),
      completedAssessments: assessmentAttempts.filter(a => a.status === 'completed').length,
      recommendationRuns: runRows.length,
    },
    savedCareers,
    shortlistedCareers,
    recentlyViewedCareers,
    recentChatCareers,
    recentNotes,
    assessmentAttempts,
    recommendationRunHistory,
    nextActions: buildNextActions({
      latestAssessment: latestCompletedAssessment,
      savedCareers,
      shortlistedCareers,
      recentChatCareers,
      recentNotes,
      recommendationRunCount: runRows.length,
    }),
  }
}
