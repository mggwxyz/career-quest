// src/lib/assessment/__tests__/inconsistency.test.ts
import { describe, it, expect } from 'vitest'
import { detectInconsistency } from '../inconsistency'
import { initialPosterior, updatePosterior } from '../posterior'
import { Item, Option } from '../types'

function strongR(): Option {
  return {
    id: 'r', text: 'r', imageUrl: '', prompt: '', desirability: 3,
    loadings: {
      riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}
function strongS(): Option {
  return {
    id: 's', text: 's', imageUrl: '', prompt: '', desirability: 3,
    loadings: {
      riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}
function rsItem(id: string): Item {
  return { id, option1: { ...strongR(), id: `${id}-1` }, option2: { ...strongS(), id: `${id}-2` }, dimensionContrast: 'opposite', primaryScales: ['R', 'S'] }
}

describe('detectInconsistency', () => {
  it('returns false when all answers align with the eventual top code', () => {
    let p = initialPosterior()
    const items = [rsItem('a'), rsItem('b'), rsItem('c'), rsItem('d')]
    const responses = items.map((it, i) => {
      p = updatePosterior(p, it, 1) // always pick R
      return { item: it, choice: 1 as const, position: i + 1 }
    })
    expect(detectInconsistency(p, responses)).toBe(false)
  })

  it('returns true when 30%+ of dominant-scale responses contradict the top code', () => {
    let p = initialPosterior()
    const items = [rsItem('a'), rsItem('b'), rsItem('c'), rsItem('d'), rsItem('e')]
    const choices: (1 | 2)[] = [1, 1, 1, 2, 2] // 2 of 5 (40%) contradict
    const responses = items.map((it, i) => {
      p = updatePosterior(p, it, choices[i])
      return { item: it, choice: choices[i], position: i + 1 }
    })
    expect(detectInconsistency(p, responses)).toBe(true)
  })

  it('ignores skips for the contradiction count', () => {
    let p = initialPosterior()
    const items = [rsItem('a'), rsItem('b'), rsItem('c')]
    const choices: (1 | null)[] = [1, null, 1]
    const responses = items.map((it, i) => {
      p = updatePosterior(p, it, choices[i])
      return { item: it, choice: choices[i], position: i + 1 }
    })
    expect(detectInconsistency(p, responses)).toBe(false)
  })
})
