// src/lib/assessment/scoring.ts
import { Posterior, RIASEC_SCALES, RiasecScale } from './types'

export function rankRiasec(p: Posterior): RiasecScale[] {
  const order = [...RIASEC_SCALES]
  return order.sort((a, b) => {
    const diff = p.riasec[b].mean - p.riasec[a].mean
    if (Math.abs(diff) < 1e-9) return RIASEC_SCALES.indexOf(a) - RIASEC_SCALES.indexOf(b)
    return diff
  })
}

export function hollandCode(p: Posterior): string {
  return rankRiasec(p).slice(0, 3)
    .join('')
}
