import {
  GradeBand, Item, Posterior, ResponseChoice, RIASEC_SCALES, RiasecScale,
  ScaleEstimate, WORK_VALUE_SCALES, WorkValueScale,
} from './types'

const DEFAULT: ScaleEstimate = { mean: 0, variance: 1 }
const MIDDLE_WV: ScaleEstimate = { mean: 0, variance: 1.5 }

export function initialPosterior(opts: { gradeBand?: GradeBand } = {}): Posterior {
  const wvDefault = opts.gradeBand === 'middle' ? MIDDLE_WV : DEFAULT
  return {
    riasec: Object.fromEntries(RIASEC_SCALES.map(s => [s, { ...DEFAULT }])) as Record<RiasecScale, ScaleEstimate>,
    workValues: Object.fromEntries(WORK_VALUE_SCALES.map(s => [s, { ...wvDefault }])) as Record<WorkValueScale, ScaleEstimate>,
    workContext: {
      structureVariety: { ...DEFAULT },
      indoorOutdoor: { ...DEFAULT },
      soloTeam: { ...DEFAULT },
    },
  }
}

const LEARN_RATE = 0.2
const SKIP_WEIGHT = 0.4

type LoadingDiff = number

function updateScale(prior: ScaleEstimate, diff: LoadingDiff, weight: number): ScaleEstimate {
  if (diff === 0) return { ...prior }
  const meanShift = LEARN_RATE * weight * diff * prior.variance
  const varianceShrink = (LEARN_RATE * weight * diff) ** 2 * prior.variance
  const newVariance = Math.max(0.01, prior.variance / (1 + varianceShrink))
  return { mean: prior.mean + meanShift, variance: newVariance }
}

export function updatePosterior(prior: Posterior, item: Item, choice: ResponseChoice): Posterior {
  if (choice === null) {
    return applyScaleUpdates(prior, item, 0, SKIP_WEIGHT)
  }
  const dir = choice === 1 ? 1 : -1
  return applyScaleUpdates(prior, item, dir, 1)
}

function applyScaleUpdates(
  prior: Posterior, item: Item, dir: -1 | 0 | 1, weight: number,
): Posterior {
  const a = item.option1.loadings
  const b = item.option2.loadings

  const next: Posterior = {
    riasec: { ...prior.riasec },
    workValues: { ...prior.workValues },
    workContext: { ...prior.workContext },
  }

  for (const s of RIASEC_SCALES) {
    const diff = dir === 0
      ? -((a.riasec[s] + b.riasec[s]) / 2) * 0.1
      : dir * (a.riasec[s] - b.riasec[s])
    next.riasec[s] = updateScale(prior.riasec[s], diff, weight)
  }

  for (const s of WORK_VALUE_SCALES) {
    const diff = dir === 0
      ? -((a.workValues[s] + b.workValues[s]) / 2) * 0.1
      : dir * (a.workValues[s] - b.workValues[s])
    next.workValues[s] = updateScale(prior.workValues[s], diff, weight)
  }

  for (const k of ['structureVariety', 'indoorOutdoor', 'soloTeam'] as const) {
    const diff = dir === 0
      ? -((a.workContext[k] + b.workContext[k]) / 2) * 0.1
      : dir * (a.workContext[k] - b.workContext[k])
    next.workContext[k] = updateScale(prior.workContext[k], diff, weight)
  }

  return next
}
