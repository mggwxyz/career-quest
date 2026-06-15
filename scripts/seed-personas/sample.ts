import type { Gender, EthnicityCue, AgeBand } from '../../src/lib/personas/types'

export type Distribution = {
  gender: Record<Gender, number>
  ethnicity: Record<EthnicityCue, number>
  ageBand: Record<AgeBand, number>
  total: number
}

export type Sample = {
  gender: Gender
  ethnicityCue: EthnicityCue
  ageBand: AgeBand
  age: number
  yearsInField: number
}

type Rng = () => number

const GENDER_TARGETS: Record<Gender, number> = {
  female: 0.47, male: 0.47, nonbinary: 0.06,
}
const ETHNICITY_TARGETS: Record<EthnicityCue, number> = {
  white: 0.25, black: 0.22, hispanic: 0.22, asian: 0.18,
  middle_eastern: 0.04, pacific_islander: 0.03, indigenous: 0.03, multiracial: 0.03,
}
const AGE_TARGETS: Record<AgeBand, number> = {
  '20s': 0.25, '30s': 0.35, '40s': 0.25, '50s_plus': 0.15,
}

function biasedWeights<K extends string>(
  targets: Record<K, number>,
  counts: Record<K, number>,
  total: number,
): Record<K, number> {
  const result = {} as Record<K, number>
  for (const k of Object.keys(targets) as K[]) {
    const target = targets[k]
    const observed = total === 0 ? 0 : counts[k] / total
    const bias = Math.exp(2 * (target - observed))
    result[k] = target * bias
  }
  return result
}

function weightedPick<K extends string>(weights: Record<K, number>, rng: Rng): K {
  const entries = Object.entries(weights) as Array<[K, number]>
  const sum = entries.reduce((acc, [, w]) => acc + w, 0)
  let r = rng() * sum
  for (const [k, w] of entries) {
    r -= w
    if (r <= 0) return k
  }
  return entries[entries.length - 1][0]
}

function ageFromBand(band: AgeBand, rng: Rng): number {
  if (band === '20s') return 22 + Math.floor(rng() * 8)
  if (band === '30s') return 30 + Math.floor(rng() * 10)
  if (band === '40s') return 40 + Math.floor(rng() * 10)
  return 50 + Math.floor(rng() * 15)
}

export function sampleDemographics(dist: Distribution, rng: Rng): Sample {
  const gender = weightedPick(biasedWeights(GENDER_TARGETS, dist.gender, dist.total), rng)
  const ethnicityCue = weightedPick(biasedWeights(ETHNICITY_TARGETS, dist.ethnicity, dist.total), rng)
  const ageBand = weightedPick(biasedWeights(AGE_TARGETS, dist.ageBand, dist.total), rng)
  const age = ageFromBand(ageBand, rng)
  const maxYears = Math.max(0, age - 18)
  const yearsInField = Math.floor(rng() * (maxYears + 1))
  return { gender, ethnicityCue, ageBand, age, yearsInField }
}

export function applySample(dist: Distribution, s: Sample): Distribution {
  return {
    gender: { ...dist.gender, [s.gender]: dist.gender[s.gender] + 1 },
    ethnicity: { ...dist.ethnicity, [s.ethnicityCue]: dist.ethnicity[s.ethnicityCue] + 1 },
    ageBand: { ...dist.ageBand, [s.ageBand]: dist.ageBand[s.ageBand] + 1 },
    total: dist.total + 1,
  }
}

/**
 * Pre-sample demographics for every target serially, advancing the running
 * distribution after each draw exactly as a sequential loop would. This keeps
 * the seeded RNG and balancing deterministic and independent of the order in
 * which the (parallelized) generation work later completes. Does not mutate
 * the input distribution.
 */
export function planSamples(
  dist: Distribution,
  rng: Rng,
  targets: string[],
): { plan: Array<{ onetId: string, sample: Sample }>, finalDist: Distribution } {
  let working = dist
  const plan = targets.map((onetId) => {
    const sample = sampleDemographics(working, rng)
    working = applySample(working, sample)
    return { onetId, sample }
  })
  return { plan, finalDist: working }
}
