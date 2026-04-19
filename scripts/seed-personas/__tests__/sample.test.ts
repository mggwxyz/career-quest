import { describe, it, expect } from 'vitest'
import { sampleDemographics, type Distribution } from '../sample'

const emptyDist: Distribution = {
  gender: { female: 0, male: 0, nonbinary: 0 },
  ethnicity: {
    white: 0, black: 0, hispanic: 0, asian: 0,
    middle_eastern: 0, pacific_islander: 0, indigenous: 0, multiracial: 0,
  },
  ageBand: { '20s': 0, '30s': 0, '40s': 0, '50s_plus': 0 },
  total: 0,
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

describe('sampleDemographics', () => {
  it('is deterministic given the same rng', () => {
    const a = sampleDemographics(emptyDist, mulberry32(42))
    const b = sampleDemographics(emptyDist, mulberry32(42))
    expect(a).toEqual(b)
  })

  it('produces years in field that never exceeds age - 18', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const s = sampleDemographics(emptyDist, rng)
      expect(s.yearsInField).toBeLessThanOrEqual(s.age - 18)
      expect(s.yearsInField).toBeGreaterThanOrEqual(0)
    }
  })

  it('across 1000 samples, distribution tracks the targets within tolerance', () => {
    const rng = mulberry32(123)
    const gender = { female: 0, male: 0, nonbinary: 0 } as Record<string, number>
    const ethnicity: Record<string, number> = {}
    const N = 1000
    for (let i = 0; i < N; i++) {
      const s = sampleDemographics(emptyDist, rng)
      gender[s.gender] += 1
      ethnicity[s.ethnicityCue] = (ethnicity[s.ethnicityCue] ?? 0) + 1
    }
    expect(gender.female / N).toBeGreaterThan(0.40)
    expect(gender.female / N).toBeLessThan(0.54)
    expect(gender.male / N).toBeGreaterThan(0.40)
    expect(gender.male / N).toBeLessThan(0.54)
    expect(gender.nonbinary / N).toBeGreaterThan(0.03)
    expect(gender.nonbinary / N).toBeLessThan(0.10)
    for (const key of ['white', 'black', 'hispanic', 'asian']) {
      const frac = (ethnicity[key] ?? 0) / N
      expect(frac).toBeGreaterThan(0.12)
    }
  })

  it('biases away from over-filled cells', () => {
    const skewed: Distribution = {
      ...emptyDist,
      gender: { female: 100, male: 0, nonbinary: 0 },
      total: 100,
    }
    const rng = mulberry32(9)
    let male = 0
    for (let i = 0; i < 200; i++) {
      const s = sampleDemographics(skewed, rng)
      if (s.gender === 'male') male++
    }
    expect(male).toBeGreaterThan(120)
  })
})
