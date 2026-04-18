import { eligibleItems, unseenItems } from './itemBank'
import { rankRiasec } from './scoring'
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
