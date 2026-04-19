import { describe, it, expect } from 'vitest'
import { initialPosterior, updatePosterior } from '../posterior'
import { items } from '@/app/_data/items'
import { RIASEC_SCALES } from '../types'
import { makeSyntheticUser, simulateChoice } from '../simulation'

describe('posterior properties', () => {
  it('total RIASEC variance never increases across a sequence of forced-choice responses', () => {
    const user = makeSyntheticUser({ topCode: 'SAE', seed: 99 })
    let p = initialPosterior()
    let prevTotalVar = sumVar(p)
    for (let i = 0; i < 20; i++) {
      const item = items[i % items.length]
      const choice = simulateChoice(user, item, i)
      p = updatePosterior(p, item, choice)
      const totalVar = sumVar(p)
      expect(totalVar).toBeLessThanOrEqual(prevTotalVar + 1e-9)
      prevTotalVar = totalVar
    }
  })
})

function sumVar(p: { riasec: Record<string, { variance: number }> }) {
  return RIASEC_SCALES.reduce((s, k) => s + p.riasec[k].variance, 0)
}
