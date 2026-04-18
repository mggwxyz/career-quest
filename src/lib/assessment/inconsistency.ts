// src/lib/assessment/inconsistency.ts
import { Item, Posterior, ResponseChoice } from './types'
import { rankRiasec } from './scoring'

export type ResponseRecord = {
  item: Item
  choice: ResponseChoice
  position: number
}

const CONTRADICTION_THRESHOLD = 0.3

export function detectInconsistency(p: Posterior, responses: ResponseRecord[]): boolean {
  const top = rankRiasec(p)[0]
  const relevant = responses.filter(r => r.choice !== null
    && (r.item.option1.loadings.riasec[top] !== r.item.option2.loadings.riasec[top]))
  if (relevant.length === 0) return false

  const contradictions = relevant.filter((r) => {
    const chosen = r.choice === 1 ? r.item.option1 : r.item.option2
    const rejected = r.choice === 1 ? r.item.option2 : r.item.option1
    return chosen.loadings.riasec[top] < rejected.loadings.riasec[top]
  })
  return contradictions.length / relevant.length >= CONTRADICTION_THRESHOLD
}
