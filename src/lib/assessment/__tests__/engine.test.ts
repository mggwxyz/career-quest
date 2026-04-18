import { describe, it, expect } from 'vitest'
import { scoreItemForSelection, pickNextItem, shouldStop, pickWithCoveragePhase } from '../engine'
import { initialPosterior } from '../posterior'
import { Item, Option } from '../types'

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
function item(id: string, l1: Partial<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>>, l2: Partial<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>>, des1 = 3, des2 = 3): Item {
  return {
    id,
    option1: opt(`${id}-1`, l1, des1),
    option2: opt(`${id}-2`, l2, des2),
    dimensionContrast: 'mixed',
    primaryScales: [],
  }
}

describe('scoreItemForSelection', () => {
  it('scores higher when an item contrasts the two scales currently closest in mean', () => {
    const p = initialPosterior()
    p.riasec.R.mean = 1.0
    p.riasec.S.mean = 0.95 // contested
    p.riasec.A.mean = -1.0 // not contested
    const rsItem = item('rs', { R: 3 }, { S: 3 })
    const raItem = item('ra', { R: 3 }, { A: 3 })
    expect(scoreItemForSelection(rsItem, p)).toBeGreaterThan(scoreItemForSelection(raItem, p))
  })

  it('scores lower for items where both options have similar loadings', () => {
    const p = initialPosterior()
    const sharp = item('sharp', { R: 3 }, { S: 3 })
    const dull = item('dull', { R: 1, S: 1 }, { R: 1, S: 1 })
    expect(scoreItemForSelection(sharp, p)).toBeGreaterThan(scoreItemForSelection(dull, p))
  })
})

describe('pickNextItem', () => {
  it('returns the highest-scoring eligible item, breaking ties by smallest desirability gap', () => {
    const p = initialPosterior()
    p.riasec.R.mean = 1.0
    p.riasec.S.mean = 0.9
    const a = item('a', { R: 3 }, { S: 3 }, 3, 4) // gap 1
    const b = item('b', { R: 3 }, { S: 3 }, 3, 3.2) // gap 0.2 — should win on tie
    const next = pickNextItem([a, b], p, new Set(), undefined)
    expect(next?.id).toBe('b')
  })

  it('returns null when no items remain', () => {
    const p = initialPosterior()
    const a = item('a', { R: 3 }, { S: 3 })
    expect(pickNextItem([a], p, new Set(['a']), undefined)).toBeNull()
  })
})

describe('shouldStop', () => {
  it('refuses to stop before the floor of 12 items', () => {
    const p = initialPosterior()
    for (const s of ['R', 'I', 'A', 'S', 'E', 'C'] as const) p.riasec[s].variance = 0.05
    p.riasec.S.mean = 3
    p.riasec.A.mean = 2
    p.riasec.E.mean = 1
    expect(shouldStop({ posterior: p, itemsAnswered: 11, gradeBand: 'late-hs' })).toBe(false)
  })

  it('stops at the cap of 20 even if conditions not met', () => {
    const p = initialPosterior()
    expect(shouldStop({ posterior: p, itemsAnswered: 20, gradeBand: 'late-hs' })).toBe(true)
  })

  it('stops when top-3 separated and confidence is medium-or-better', () => {
    const p = initialPosterior()
    p.riasec.S.mean = 2
    p.riasec.S.variance = 0.2
    p.riasec.A.mean = 1.5
    p.riasec.A.variance = 0.2
    p.riasec.E.mean = 1.0
    p.riasec.E.variance = 0.4
    p.riasec.R.mean = 0
    p.riasec.R.variance = 0.3
    p.riasec.I.mean = -0.5
    p.riasec.I.variance = 0.3
    p.riasec.C.mean = -1
    p.riasec.C.variance = 0.3
    p.workValues.REL.mean = 1
    p.workValues.REL.variance = 0.3
    expect(shouldStop({ posterior: p, itemsAnswered: 14, gradeBand: 'late-hs' })).toBe(true)
  })

  it('ignores work-value confidence when grade band is "middle"', () => {
    const p = initialPosterior({ gradeBand: 'middle' })
    p.riasec.S.mean = 2
    p.riasec.S.variance = 0.2
    p.riasec.A.mean = 1.5
    p.riasec.A.variance = 0.2
    p.riasec.E.mean = 1.0
    p.riasec.E.variance = 0.4
    p.riasec.R.mean = 0
    p.riasec.R.variance = 0.3
    p.riasec.I.mean = -0.5
    p.riasec.I.variance = 0.3
    p.riasec.C.mean = -1
    p.riasec.C.variance = 0.3
    expect(shouldStop({ posterior: p, itemsAnswered: 14, gradeBand: 'middle' })).toBe(true)
  })
})

describe('pickWithCoveragePhase', () => {
  it('restricts candidates to items touching un-touched scales until all 6 are touched', () => {
    const p = initialPosterior()
    const touched = new Set<string>(['R', 'I'])
    const items = [
      item('riOnly', { R: 3 }, { I: 3 }),
      item('rsItem', { R: 3 }, { S: 3 }),
    ]
    const next = pickWithCoveragePhase(items, p, new Set(), undefined, touched)
    expect(next?.id).toBe('rsItem')
  })

  it('falls back to plain pickNextItem after all 6 scales touched', () => {
    const p = initialPosterior()
    const allTouched = new Set<string>(['R', 'I', 'A', 'S', 'E', 'C'])
    const items = [
      item('riOnly', { R: 3 }, { I: 3 }),
      item('rsItem', { R: 3 }, { S: 3 }),
    ]
    expect(pickWithCoveragePhase(items, p, new Set(), undefined, allTouched)).toBeTruthy()
  })
})
