import { describe, it, expect } from 'vitest'
import { makeSyntheticUser, simulateChoice, allHollandCodes } from '../simulation'
import { Item, Option } from '../types'

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
