import { Item, RIASEC_SCALES, RiasecScale, GradeBand } from './types'

export const RIASEC_COVERAGE_FLOOR = 10
export const DESIRABILITY_GAP_MAX = 0.5

export function validateBank(items: Item[]): string[] {
  const issues: string[] = []

  const itemIds = new Set<string>()
  const optionIds = new Set<string>()
  for (const it of items) {
    if (itemIds.has(it.id)) issues.push(`dup-item-id:${it.id}`)
    itemIds.add(it.id)
    for (const opt of [it.option1, it.option2]) {
      if (optionIds.has(opt.id)) issues.push(`dup-option-id:${opt.id}`)
      optionIds.add(opt.id)
    }
  }

  const dominantCount: Record<RiasecScale, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
  for (const it of items) {
    for (const opt of [it.option1, it.option2]) {
      const top = RIASEC_SCALES.reduce((best, s) =>
        opt.loadings.riasec[s] > opt.loadings.riasec[best] ? s : best, 'R' as RiasecScale)
      if (opt.loadings.riasec[top] >= 2) dominantCount[top] += 1
    }
  }
  for (const s of RIASEC_SCALES) {
    if (dominantCount[s] < RIASEC_COVERAGE_FLOOR) {
      issues.push(`coverage:${s}=${dominantCount[s]}<${RIASEC_COVERAGE_FLOOR}`)
    }
  }

  for (const it of items) {
    const gap = Math.abs(it.option1.desirability - it.option2.desirability)
    if (gap > DESIRABILITY_GAP_MAX) issues.push(`desirability-gap:${it.id}=${gap.toFixed(2)}`)
  }

  return issues
}

export function eligibleItems(items: Item[], gradeBand: GradeBand | undefined): Item[] {
  if (!gradeBand) return items
  const order: GradeBand[] = ['middle', 'early-hs', 'late-hs', 'college']
  const userIdx = order.indexOf(gradeBand)
  return items.filter((it) => {
    if (!it.minGradeBand) return true
    return order.indexOf(it.minGradeBand) <= userIdx
  })
}

export function unseenItems(items: Item[], seenIds: Set<string>): Item[] {
  return items.filter(it => !seenIds.has(it.id))
}
