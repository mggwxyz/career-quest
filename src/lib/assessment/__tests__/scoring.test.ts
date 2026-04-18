// src/lib/assessment/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { hollandCode, rankRiasec, confidenceBand, contextLean } from '../scoring'
import { initialPosterior } from '../posterior'

function withMeans(means: Partial<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>>) {
  const p = initialPosterior()
  for (const [k, v] of Object.entries(means)) {
    p.riasec[k as 'R'].mean = v as number
  }
  return p
}

describe('rankRiasec', () => {
  it('orders scales by descending posterior mean, with stable hexagon order on ties', () => {
    const ranked = rankRiasec(withMeans({ S: 1.5, A: 1.2, E: 1.0, R: 0.5, I: 0.0, C: -0.5 }))
    expect(ranked).toEqual(['S', 'A', 'E', 'R', 'I', 'C'])
  })

  it('breaks ties using canonical RIASEC order (R, I, A, S, E, C)', () => {
    const ranked = rankRiasec(withMeans({ R: 1.0, I: 1.0, A: 1.0, S: 0, E: 0, C: 0 }))
    expect(ranked.slice(0, 3)).toEqual(['R', 'I', 'A'])
  })
})

describe('hollandCode', () => {
  it('returns the top 3 scales as a 3-letter string', () => {
    const code = hollandCode(withMeans({ S: 2, A: 1.5, E: 1, R: 0, I: 0, C: 0 }))
    expect(code).toBe('SAE')
  })
})

describe('confidenceBand', () => {
  it('returns "high" for variance below 0.25', () => {
    expect(confidenceBand(0.1)).toBe('high')
    expect(confidenceBand(0.249)).toBe('high')
  })
  it('returns "medium" for 0.25 <= variance < 0.5', () => {
    expect(confidenceBand(0.25)).toBe('medium')
    expect(confidenceBand(0.499)).toBe('medium')
  })
  it('returns "low" for variance >= 0.5', () => {
    expect(confidenceBand(0.5)).toBe('low')
    expect(confidenceBand(2)).toBe('low')
  })
})

describe('contextLean', () => {
  it('returns balanced/mixed/flexible labels when |mean| < 0.3', () => {
    expect(contextLean('structureVariety', { mean: 0.1, variance: 0.5 })).toEqual({
      lean: 'balanced', strength: expect.any(Number), confidence: 'low',
    })
    expect(contextLean('indoorOutdoor', { mean: -0.2, variance: 0.5 })).toEqual({
      lean: 'mixed', strength: expect.any(Number), confidence: 'low',
    })
    expect(contextLean('soloTeam', { mean: 0, variance: 0.5 })).toEqual({
      lean: 'flexible', strength: expect.any(Number), confidence: 'low',
    })
  })
  it('uses the negative-side label for negative means above the threshold', () => {
    expect(contextLean('structureVariety', { mean: -1, variance: 0.2 }).lean).toBe('structure')
    expect(contextLean('indoorOutdoor', { mean: -1, variance: 0.2 }).lean).toBe('indoor')
    expect(contextLean('soloTeam', { mean: -1, variance: 0.2 }).lean).toBe('solo')
  })
  it('uses the positive-side label for positive means above the threshold', () => {
    expect(contextLean('structureVariety', { mean: 1, variance: 0.2 }).lean).toBe('variety')
    expect(contextLean('indoorOutdoor', { mean: 1, variance: 0.2 }).lean).toBe('outdoor')
    expect(contextLean('soloTeam', { mean: 1, variance: 0.2 }).lean).toBe('team')
  })
})
