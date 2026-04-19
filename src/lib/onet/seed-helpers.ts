import { slugifyTitle, resolveSlugCollisions } from './slugify'

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

export interface MirrorSource {
  code: string
  title: string
  description: string | null
  brightOutlook: boolean
  jobZone: number
  /** O*NET Holland code, e.g. "SIR" or "CEI". 1–3 letters from R/I/A/S/E/C. */
  interestCode: string
}

const VALID_RIASEC = new Set(['R', 'I', 'A', 'S', 'E', 'C'])

export function deriveMirrorRow(source: MirrorSource, takenSlugs: Set<string>): MirrorRow {
  const baseSlug = slugifyTitle(source.title)
  const slug = resolveSlugCollisions(baseSlug, takenSlugs)
  const interestCodes = source.interestCode
    .toUpperCase()
    .split('')
    .filter(c => VALID_RIASEC.has(c))
  return {
    code: source.code,
    slug,
    title: source.title,
    description: source.description,
    jobZone: source.jobZone,
    brightOutlook: source.brightOutlook,
    riasecPrimary: interestCodes[0] ?? null,
    riasecAll: interestCodes,
  }
}
