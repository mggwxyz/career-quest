import { eligibleItems, unseenItems } from './itemBank'
import { confidenceBand, rankRiasec } from './scoring'
import { GradeBand, Item, Posterior, RIASEC_SCALES } from './types'

const CONTEST_THRESHOLD = 0.3
const TOP3_RANK_BONUS = 0.5

export function scoreItemForSelection(item: Item, p: Posterior): number {
  const top3 = new Set(rankRiasec(p).slice(0, 4)) // top-3 + 4th-place "challenger"
  let score = 0

  for (let i = 0; i < RIASEC_SCALES.length; i++) {
    for (let j = i + 1; j < RIASEC_SCALES.length; j++) {
      const si = RIASEC_SCALES[i]
      const sj = RIASEC_SCALES[j]
      const meansClose = Math.abs(p.riasec[si].mean - p.riasec[sj].mean) < CONTEST_THRESHOLD
      const inTopRace = top3.has(si) && top3.has(sj)
      if (!meansClose && !inTopRace) continue
      const di = item.option1.loadings.riasec[si] - item.option2.loadings.riasec[si]
      const dj = item.option1.loadings.riasec[sj] - item.option2.loadings.riasec[sj]
      const sep = Math.abs(di - dj)
      score += sep + (inTopRace ? TOP3_RANK_BONUS : 0)
    }
  }

  const totalDiff = RIASEC_SCALES.reduce((sum, s) => sum
    + Math.abs(item.option1.loadings.riasec[s] - item.option2.loadings.riasec[s]), 0)
  if (totalDiff < 1) score -= 1

  return score
}

export function pickNextItem(
  bank: Item[], p: Posterior, seenIds: Set<string>, gradeBand: GradeBand | undefined,
): Item | null {
  const candidates = unseenItems(eligibleItems(bank, gradeBand), seenIds)
  if (candidates.length === 0) return null

  let best: Item | null = null
  let bestScore = -Infinity
  let bestDesGap = Infinity

  for (const it of candidates) {
    const s = scoreItemForSelection(it, p)
    const gap = Math.abs(it.option1.desirability - it.option2.desirability)
    if (s > bestScore || (s === bestScore && gap < bestDesGap)) {
      best = it
      bestScore = s
      bestDesGap = gap
    }
  }
  return best
}

export const FLOOR_ITEMS = 12
export const CAP_ITEMS = 20

const TOP3_SEPARATION_SD = 1.0

export function shouldStop(args: {
  posterior: Posterior
  itemsAnswered: number
  gradeBand: GradeBand | undefined
}): boolean {
  const { posterior: p, itemsAnswered, gradeBand } = args
  if (itemsAnswered >= CAP_ITEMS) return true
  if (itemsAnswered < FLOOR_ITEMS) return false

  const ranked = rankRiasec(p)
  const top3 = ranked.slice(0, 3)
  const fourth = ranked[3]
  const top3MeanFloor = Math.min(...top3.map(s => p.riasec[s].mean))
  const pooledSd = Math.sqrt(
    (p.riasec[top3[2]].variance + p.riasec[fourth].variance) / 2,
  )
  if (top3MeanFloor - p.riasec[fourth].mean <= TOP3_SEPARATION_SD * pooledSd) return false

  for (const s of top3) {
    if (confidenceBand(p.riasec[s].variance) === 'low') return false
  }

  if (gradeBand !== 'middle') {
    const anyMediumOrBetter = (['ACH', 'IND', 'REC', 'REL', 'SUP', 'WC'] as const)
      .some(s => confidenceBand(p.workValues[s].variance) !== 'low')
    if (!anyMediumOrBetter) return false
  }

  return true
}

export function pickWithCoveragePhase(
  bank: Item[], p: Posterior, seenIds: Set<string>,
  gradeBand: GradeBand | undefined, touchedScales: Set<string>,
): Item | null {
  const allTouched = (['R', 'I', 'A', 'S', 'E', 'C'] as const).every(s => touchedScales.has(s))
  if (allTouched) return pickNextItem(bank, p, seenIds, gradeBand)

  const untouched = (['R', 'I', 'A', 'S', 'E', 'C'] as const).filter(s => !touchedScales.has(s))
  const restricted = bank.filter(it =>
    untouched.some(s =>
      it.option1.loadings.riasec[s] >= 2 || it.option2.loadings.riasec[s] >= 2),
  )
  const fromRestricted = pickNextItem(restricted, p, seenIds, gradeBand)
  return fromRestricted ?? pickNextItem(bank, p, seenIds, gradeBand)
}
