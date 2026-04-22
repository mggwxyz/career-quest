import type { OccupationRow } from '@/lib/onet/occupations'
import type { CareerRecommendation } from '@/lib/schemas/career'

function numOrNull(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  return null
}

/** Median salary from O*NET mirror — matches explore page / projectors. */
export function formatOnetSalary(o: Pick<OccupationRow, 'salaryAnnualMedian' | 'salaryHourlyMedian'>): string {
  const annual = numOrNull(o.salaryAnnualMedian)
  const hourly = numOrNull(o.salaryHourlyMedian)
  if (annual != null) {
    return `$${annual.toLocaleString('en-US')}/yr`
  }
  if (hourly != null) {
    return `$${hourly.toLocaleString('en-US')}/hr`
  }
  return ''
}

/**
 * Job outlook from mirror (O*NET outlook category, e.g. Bright, Average).
 */
export function formatOnetJobGrowth(o: Pick<OccupationRow, 'outlookCategory' | 'brightOutlook'>): string {
  if (o.outlookCategory?.trim()) {
    return o.outlookCategory.trim()
  }
  if (o.brightOutlook) {
    return 'Bright outlook'
  }
  return ''
}

type AiRec = {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth?: string
  salaryRange?: string
  slug?: string | null
}

/**
 * Prefer O*NET mirror title, description, salary, outlook, slug, and Holland interest
 * codes; keep AI `whyItMatches`. Falls back to AI strings when a field is missing
 * in the mirror.
 */
export function mergeCareerWithOnet(ai: AiRec, onet: OccupationRow | null | undefined): CareerRecommendation {
  if (!onet) {
    return {
      title: ai.title,
      description: ai.description,
      onetId: ai.onetId,
      whyItMatches: ai.whyItMatches,
      jobGrowth: ai.jobGrowth?.trim() || '—',
      salaryRange: ai.salaryRange?.trim() || '—',
      slug: ai.slug ?? null,
      riasecCodes: [],
    }
  }
  const salary = formatOnetSalary(onet)
  const growth = formatOnetJobGrowth(onet)
  // Use || not ?? so empty DB/AI strings still fall back to "—" (nullish coalescing keeps "").
  const jobGrowth = growth || ai.jobGrowth?.trim() || '—'
  const salaryRange = salary || ai.salaryRange?.trim() || '—'
  // Prefer card-friendly short variants for the recommendations grid; full copy
  // lives on the career detail page.
  const title = onet.shortTitle?.trim() || onet.title
  const description = onet.shortDescription?.trim()
    || (onet.description?.trim() ? onet.description : null)
    || ai.description
  return {
    title,
    description,
    onetId: ai.onetId,
    whyItMatches: ai.whyItMatches,
    jobGrowth,
    salaryRange,
    slug: onet.slug,
    riasecCodes: Array.isArray(onet.riasecAll) ? [...onet.riasecAll] : [],
  }
}
