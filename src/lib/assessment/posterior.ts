import {
  GradeBand, Posterior, RIASEC_SCALES, RiasecScale, ScaleEstimate,
  WORK_VALUE_SCALES, WorkValueScale,
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
