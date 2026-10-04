import type { AssessmentResult } from '@/lib/assessment/types'
import type { CareerDetail } from '@/lib/onet/schemas'
import type { OccupationRow } from '@/lib/onet/occupations'
import { JOB_ZONE_DESCRIPTIONS, JOB_ZONE_NAMES } from '@/lib/onet/projectors'

export const COMPARE_MIN = 2
export const COMPARE_MAX = 3

const RIASEC_NAMES: Record<string, string> = {
  R: 'Realistic',
  I: 'Investigative',
  A: 'Artistic',
  S: 'Social',
  E: 'Enterprising',
  C: 'Conventional',
}

const WORK_CONTEXT_LABELS = {
  structureVariety: {
    structure: 'structure',
    variety: 'variety',
    balanced: 'balanced structure and variety',
  },
  indoorOutdoor: {
    indoor: 'indoor settings',
    outdoor: 'outdoor settings',
    mixed: 'mixed indoor and outdoor settings',
  },
  soloTeam: {
    solo: 'solo focus time',
    team: 'teamwork',
    flexible: 'a flexible solo/team mix',
  },
} as const

export interface CompareRelatedCareer {
  code: string
  title: string
  slug: string | null
}

export interface CareerCompareItem {
  code: string
  slug: string
  title: string
  description: string
  dataStatus: 'complete' | 'partial'
  missingDetailLabel: string | null
  fit: {
    label: 'Personalized match' | 'Profile signal' | 'Needs profile context'
    explanation: string
  }
  pay: {
    label: string
    value: number | null
    cadence: 'annual' | 'hourly' | null
  }
  outlook: {
    label: string
    description: string
    bright: boolean
  }
  jobZone: {
    number: number
    name: string
    description: string
  }
  riasec: {
    codes: string[]
    names: string[]
  }
  tasks: string[]
  skills: string[]
  knowledge: string[]
  technology: string[]
  relatedCareers: CompareRelatedCareer[]
  workContext: {
    label: string
    explanation: string
  }
}

export interface CareerCompareProjectionInput {
  occupation: OccupationRow
  detail: CareerDetail | null
  matchReason?: string | null
  profileResult?: AssessmentResult | null
  relatedSlugs?: Map<string, string>
}

export function parseCompareIds(raw: string | string[] | null | undefined): string[] {
  const value = Array.isArray(raw) ? raw.join(',') : raw ?? ''
  const seen = new Set<string>()
  const ids: string[] = []

  for (const part of value.split(',')) {
    const id = part.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
    if (ids.length === COMPARE_MAX) break
  }

  return ids
}

export function projectCareerCompareItem({
  occupation,
  detail,
  matchReason,
  profileResult,
  relatedSlugs = new Map(),
}: CareerCompareProjectionInput): CareerCompareItem {
  const jobZoneNumber = detail?.jobZone ?? occupation.jobZone
  const riasecCodes = normalizedRiasecCodes(occupation)
  const riasecNames = detail?.riasecNames.length
    ? detail.riasecNames
    : riasecCodes.map(code => RIASEC_NAMES[code] ?? code)

  return {
    code: occupation.code,
    slug: occupation.slug,
    title: detail?.title ?? occupation.title,
    description: detail?.description?.trim()
      || occupation.description?.trim()
      || occupation.shortDescription?.trim()
      || 'No description is available yet.',
    dataStatus: detail ? 'complete' : 'partial',
    missingDetailLabel: detail ? null : 'Live O*NET detail is temporarily unavailable; showing mirrored career data where possible.',
    fit: buildFitExplanation({ matchReason, profileResult, riasecCodes, riasecNames }),
    pay: buildPay(detail, occupation),
    outlook: buildOutlook(detail, occupation),
    jobZone: {
      number: jobZoneNumber,
      name: JOB_ZONE_NAMES[jobZoneNumber] ?? `Job Zone ${jobZoneNumber}`,
      description: JOB_ZONE_DESCRIPTIONS[jobZoneNumber] ?? 'Preparation details are not available yet.',
    },
    riasec: {
      codes: riasecCodes,
      names: riasecNames,
    },
    tasks: limit(detail?.tasks, 5),
    skills: limit(detail?.skills, 8),
    knowledge: limit(detail?.knowledge, 6),
    technology: limit(detail?.technology, 6),
    relatedCareers: limit(detail?.relatedCareers, 6).map(career => ({
      ...career,
      slug: relatedSlugs.get(career.code) ?? null,
    })),
    workContext: buildWorkContext(profileResult, detail),
  }
}

function normalizedRiasecCodes(occupation: OccupationRow): string[] {
  return Array.isArray(occupation.riasecAll)
    ? occupation.riasecAll.filter(Boolean)
    : []
}

function limit<T>(items: T[] | null | undefined, count: number): T[] {
  return Array.isArray(items) ? items.filter(Boolean).slice(0, count) : []
}

function buildPay(
  detail: CareerDetail | null,
  occupation: OccupationRow,
): CareerCompareItem['pay'] {
  const annual = numberOrNull(detail?.salaryAnnualMedian ?? occupation.salaryAnnualMedian)
  if (annual != null) {
    return {
      label: `$${annual.toLocaleString('en-US')}/yr median`,
      value: annual,
      cadence: 'annual',
    }
  }

  const hourly = numberOrNull(detail?.salaryHourlyMedian ?? occupation.salaryHourlyMedian)
  if (hourly != null) {
    return {
      label: `$${hourly.toLocaleString('en-US')}/hr median`,
      value: hourly,
      cadence: 'hourly',
    }
  }

  return {
    label: 'Pay data unavailable',
    value: null,
    cadence: null,
  }
}

function buildOutlook(
  detail: CareerDetail | null,
  occupation: OccupationRow,
): CareerCompareItem['outlook'] {
  const bright = Boolean(detail?.brightOutlook ?? occupation.brightOutlook)
  const category = detail?.outlookCategory?.trim()
    || occupation.outlookCategory?.trim()
    || (bright ? 'Bright outlook' : 'Outlook unavailable')
  const description = detail?.outlookDescription?.trim()
    || (bright
      ? 'O*NET flags this career as a Bright Outlook occupation.'
      : 'Detailed job outlook is not available yet.')

  return {
    label: category,
    description,
    bright,
  }
}

function buildFitExplanation({
  matchReason,
  profileResult,
  riasecCodes,
  riasecNames,
}: {
  matchReason?: string | null
  profileResult?: AssessmentResult | null
  riasecCodes: string[]
  riasecNames: string[]
}): CareerCompareItem['fit'] {
  const trimmedReason = matchReason?.trim()
  if (trimmedReason) {
    return {
      label: 'Personalized match',
      explanation: trimmedReason,
    }
  }

  if (profileResult) {
    const topCodes = profileResult.hollandCode.split('').filter(Boolean)
    const overlap = riasecCodes.filter(code => topCodes.includes(code))
    const topNames = topCodes.slice(0, 3).map(code => RIASEC_NAMES[code] ?? code)

    if (overlap.length > 0) {
      const overlapNames = overlap.map(code => RIASEC_NAMES[code] ?? code)
      return {
        label: 'Profile signal',
        explanation: `Shares ${formatList(overlapNames)} themes with your ${profileResult.hollandCode} profile. Use the tasks and skills below to judge day-to-day fit.`,
      }
    }

    if (riasecNames.length > 0) {
      return {
        label: 'Profile signal',
        explanation: `O*NET emphasizes ${formatList(riasecNames.slice(0, 3))}, while your top profile themes are ${formatList(topNames)}. Treat this as a stretch option unless the tasks still look energizing.`,
      }
    }
  }

  return {
    label: 'Needs profile context',
    explanation: 'No saved match reason is available yet. Compare the tasks, skills, preparation, and outlook against your profile before choosing it.',
  }
}

function buildWorkContext(
  profileResult: AssessmentResult | null | undefined,
  detail: CareerDetail | null,
): CareerCompareItem['workContext'] {
  const firstTask = detail?.tasks[0]
  const taskPrompt = firstTask
    ? `Start with the daily-task signal: ${firstTask}`
    : 'Use preparation level, tasks, and technology as proxies until live detail is available.'

  if (!profileResult) {
    return {
      label: 'Work style lens',
      explanation: taskPrompt,
    }
  }

  const { workContext } = profileResult
  const leans = [
    WORK_CONTEXT_LABELS.structureVariety[workContext.structureVariety.lean],
    WORK_CONTEXT_LABELS.indoorOutdoor[workContext.indoorOutdoor.lean],
    WORK_CONTEXT_LABELS.soloTeam[workContext.soloTeam.lean],
  ]

  return {
    label: `Your work style: ${formatList(leans)}`,
    explanation: `${taskPrompt} Compare that against your preferred ${formatList(leans)}.`,
  }
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatList(items: string[]): string {
  const clean = items.map(item => item.trim()).filter(Boolean)
  if (clean.length === 0) return 'available profile'
  if (clean.length === 1) return clean[0]
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`
  return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`
}
