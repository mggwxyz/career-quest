import { describe, it, expect } from 'vitest'
import { makeSyntheticUser, simulateChoice, allHollandCodes, runSimulatedSession } from '../simulation'
import { Item, Option } from '../types'
import { items } from '@/app/_data/items'

function opt(id: string, riasec: Partial<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>>): Option {
  return {
    id, text: id, imageUrl: '', prompt: '', desirability: 3,
    loadings: {
      riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, ...riasec },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}

describe('makeSyntheticUser', () => {
  it('creates a user whose RIASEC means encode the requested top-3 ordering', () => {
    const u = makeSyntheticUser({ topCode: 'SAE', seed: 1 })
    expect(u.riasec.S).toBeGreaterThan(u.riasec.A)
    expect(u.riasec.A).toBeGreaterThan(u.riasec.E)
    const otherMaxes = (['R', 'I', 'C'] as const).map(s => u.riasec[s])
    for (const m of otherMaxes) expect(u.riasec.E).toBeGreaterThan(m)
  })
})

describe('simulateChoice', () => {
  it('almost always picks the option whose dominant scale aligns with the user profile', () => {
    const sUser = makeSyntheticUser({ topCode: 'SAE', seed: 42 })
    const item: Item = {
      id: 'rs', option1: opt('s-opt', { S: 3 }), option2: opt('r-opt', { R: 3 }),
      dimensionContrast: 'opposite', primaryScales: ['S', 'R'],
    }
    let sWins = 0
    for (let i = 0; i < 200; i++) {
      if (simulateChoice(sUser, item, i) === 1) sWins += 1
    }
    expect(sWins).toBeGreaterThan(160) // overwhelming preference for S option
  })
})

describe('allHollandCodes', () => {
  it('returns 6 * 5 * 4 = 120 codes', () => {
    expect(allHollandCodes()).toHaveLength(120)
  })

  it('every code has 3 distinct letters from RIASEC', () => {
    for (const code of allHollandCodes()) {
      expect(code).toHaveLength(3)
      expect(new Set(code.split(''))).toHaveProperty('size', 3)
      for (const c of code) expect('RIASEC').toContain(c)
    }
  })
})

describe('runSimulatedSession', () => {
  it('completes a session against the real bank and returns an AssessmentResult', () => {
    const user = makeSyntheticUser({ topCode: 'SAE', seed: 7 })
    const out = runSimulatedSession({ user, bank: items, gradeBand: 'late-hs', seed: 7 })
    expect(out.result.hollandCode).toMatch(/^[RIASEC]{3}$/)
    expect(out.result.meta.itemsAnswered).toBeGreaterThanOrEqual(12)
    expect(out.result.meta.itemsAnswered).toBeLessThanOrEqual(20)
  })
})

describe('engine accuracy sweep across all 120 Holland codes', () => {
  it('recovers the top-1 letter for ≥85% of synthetic users', { timeout: 60_000 }, () => {
    let top1Hits = 0
    let top3Overlap = 0
    let total = 0
    const codes = allHollandCodes()
    const SEEDS = [1, 7, 13, 21] // 4 seeds per code = 480 simulated users

    for (const code of codes) {
      for (const seed of SEEDS) {
        const user = makeSyntheticUser({ topCode: code, seed })
        const { result } = runSimulatedSession({ user, bank: items, gradeBand: 'late-hs', seed })
        total += 1
        if (result.hollandCode[0] === code[0]) top1Hits += 1
        const overlap = new Set(result.hollandCode.split(''))
        const truth = new Set(code.split(''))
        const inter = [...overlap].filter(x => truth.has(x)).length
        if (inter >= 2) top3Overlap += 1
      }
    }
    const top1Pct = top1Hits / total
    const top3Pct = top3Overlap / total

    console.log(`Sweep: top-1=${(top1Pct * 100).toFixed(1)}%, top-3-overlap≥2=${(top3Pct * 100).toFixed(1)}%`)
    expect(top1Pct).toBeGreaterThan(0.85)
    expect(top3Pct).toBeGreaterThan(0.85)
  })
})
