import { describe, it, expect } from 'vitest'
import { validateBank, RIASEC_COVERAGE_FLOOR } from '../itemBank'
import { Item, Option, RiasecScale } from '../types'

type RiasecKey = RiasecScale

function opt(id: string, riasec: Partial<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>>, desirability = 3): Option {
  return {
    id, text: id, imageUrl: '', prompt: '', desirability,
    loadings: {
      riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, ...riasec },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}

function makeBank(itemSpecs: Array<[string, string, string, number, number]>): Item[] {
  return itemSpecs.map(([id, dom1, dom2, d1, d2]) => ({
    id,
    option1: opt(`${id}-1`, { [dom1 as RiasecKey]: 3 }, d1),
    option2: opt(`${id}-2`, { [dom2 as RiasecKey]: 3 }, d2),
    dimensionContrast: 'mixed' as const,
    primaryScales: [dom1, dom2] as RiasecKey[],
  }))
}

describe('validateBank', () => {
  it('flags scales with fewer than RIASEC_COVERAGE_FLOOR dominant items', () => {
    expect(RIASEC_COVERAGE_FLOOR).toBeGreaterThanOrEqual(10)
    const tinyBank = makeBank([['x', 'R', 'S', 3, 3]])
    const issues = validateBank(tinyBank)
    expect(issues.some(i => i.startsWith('coverage:'))).toBe(true)
  })

  it('flags pairs with desirability gap > 0.5', () => {
    const skewed = makeBank([['x', 'R', 'S', 5, 1]])
    const issues = validateBank(skewed)
    expect(issues.some(i => i.startsWith('desirability-gap:'))).toBe(true)
  })

  it('flags duplicate item ids and option ids', () => {
    const dup: Item[] = [
      { id: 'x', option1: opt('a', { R: 3 }), option2: opt('b', { S: 3 }), dimensionContrast: 'opposite', primaryScales: ['R', 'S'] },
      { id: 'x', option1: opt('c', { R: 3 }), option2: opt('a', { S: 3 }), dimensionContrast: 'opposite', primaryScales: ['R', 'S'] },
    ]
    const issues = validateBank(dup)
    expect(issues.some(i => i.startsWith('dup-item-id:'))).toBe(true)
    expect(issues.some(i => i.startsWith('dup-option-id:'))).toBe(true)
  })
})
