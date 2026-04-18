// src/lib/assessment/scoring.ts
import { AssessmentResult, Confidence, ENGINE_VERSION, GradeBand, Posterior, RIASEC_SCALES, RiasecScale, ScaleEstimate, WORK_VALUE_SCALES, WorkValueScale } from './types'

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

const SCORE_SCALE_FACTOR = 25 // map mean to 0..100 (mean=0 → 50, mean=2 → 100, mean=-2 → 0, clamped)

function meanToScore(mean: number): number {
  return Math.round(Math.max(0, Math.min(100, 50 + mean * SCORE_SCALE_FACTOR)))
}

export function buildResult(opts: {
  posterior: Posterior
  itemsAnswered: number
  itemsSkipped: number
  inconsistencyFlag: boolean
  gradeBand?: GradeBand
}): AssessmentResult {
  const { posterior: p, itemsAnswered, itemsSkipped, inconsistencyFlag, gradeBand } = opts
  const ranked = rankRiasec(p)

  const riasec = Object.fromEntries(RIASEC_SCALES.map(s => [s, {
    score: meanToScore(p.riasec[s].mean),
    rank: (ranked.indexOf(s) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
    confidence: confidenceBand(p.riasec[s].variance),
  }])) as AssessmentResult['riasec']

  const wvSorted = [...WORK_VALUE_SCALES].sort((a, b) => p.workValues[b].mean - p.workValues[a].mean)
  const top = wvSorted.filter(s => p.workValues[s].mean > 0.3).slice(0, 3)
  const wvAll = Object.fromEntries(WORK_VALUE_SCALES.map(s => [s, {
    score: meanToScore(p.workValues[s].mean),
    confidence: confidenceBand(p.workValues[s].variance),
  }])) as Record<WorkValueScale, { score: number, confidence: Confidence }>

  return {
    hollandCode: ranked.slice(0, 3).join(''),
    riasec,
    workValues: {
      top,
      all: wvAll,
      ...(gradeBand === 'middle' ? { suppressed: true } : {}),
    },
    workContext: {
      structureVariety: contextLean('structureVariety', p.workContext.structureVariety) as AssessmentResult['workContext']['structureVariety'],
      indoorOutdoor: contextLean('indoorOutdoor', p.workContext.indoorOutdoor) as AssessmentResult['workContext']['indoorOutdoor'],
      soloTeam: contextLean('soloTeam', p.workContext.soloTeam) as AssessmentResult['workContext']['soloTeam'],
    },
    meta: {
      itemsAnswered,
      itemsSkipped,
      completedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      inconsistencyFlag,
    },
  }
}
