// src/lib/assessment/scoring.ts
import { Confidence, Posterior, RIASEC_SCALES, RiasecScale, ScaleEstimate } from './types'

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

export function confidenceBand(variance: number): Confidence {
  if (variance < 0.25) return 'high'
  if (variance < 0.5) return 'medium'
  return 'low'
}

const CONTEXT_LABELS = {
  structureVariety: { neg: 'structure', pos: 'variety', mid: 'balanced' },
  indoorOutdoor: { neg: 'indoor', pos: 'outdoor', mid: 'mixed' },
  soloTeam: { neg: 'solo', pos: 'team', mid: 'flexible' },
} as const

const LEAN_THRESHOLD = 0.3

export function contextLean<K extends keyof typeof CONTEXT_LABELS>(
  axis: K,
  est: ScaleEstimate,
): { lean: string, strength: number, confidence: Confidence } {
  const labels = CONTEXT_LABELS[axis]
  const lean = Math.abs(est.mean) < LEAN_THRESHOLD
    ? labels.mid
    : est.mean < 0 ? labels.neg : labels.pos
  const strength = Math.min(1, Math.abs(est.mean) / 2)
  return { lean, strength, confidence: confidenceBand(est.variance) }
}
