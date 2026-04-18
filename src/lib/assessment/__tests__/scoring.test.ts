// src/lib/assessment/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { hollandCode, rankRiasec } from '../scoring'
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
