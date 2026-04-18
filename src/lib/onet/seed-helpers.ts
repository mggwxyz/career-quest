import { slugifyTitle, resolveSlugCollisions } from './slugify'
import type { MnmCareer } from './schemas'

export interface MirrorRow {
  code: string
  slug: string
  title: string
  description: string | null
  jobZone: number
  brightOutlook: boolean
  riasecPrimary: string | null
  riasecAll: string[]
}

const INTEREST_CODES: Record<string, string> = {
  Realistic: 'R',
  Investigative: 'I',
  Artistic: 'A',
  Social: 'S',
  Enterprising: 'E',
  Conventional: 'C',
}

export function deriveMirrorRow(career: MnmCareer, takenSlugs: Set<string>): MirrorRow {
  const baseSlug = slugifyTitle(career.title)
  const slug = resolveSlugCollisions(baseSlug, takenSlugs)
  const interestCodes = career.interests.element
    .map(el => INTEREST_CODES[el.name])
    .filter((c): c is string => !!c)
  return {
    code: career.code,
    slug,
    title: career.title,
    description: career.what_they_do,
    jobZone: career.education.job_zone,
    brightOutlook: Boolean(career.job_outlook.bright_outlook),
    riasecPrimary: interestCodes[0] ?? null,
    riasecAll: interestCodes,
  }
}
