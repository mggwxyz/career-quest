import { describe, it, expect } from 'vitest'
import { initialPosterior } from '../posterior'
import { RIASEC_SCALES, WORK_VALUE_SCALES } from '../types'

describe('initialPosterior', () => {
  it('returns mean=0 var=1 on every RIASEC scale by default', () => {
    const p = initialPosterior()
    for (const s of RIASEC_SCALES) {
      expect(p.riasec[s]).toEqual({ mean: 0, variance: 1 })
    }
  })

  it('returns mean=0 var=1 on every work-value scale by default', () => {
    const p = initialPosterior()
    for (const s of WORK_VALUE_SCALES) {
      expect(p.workValues[s]).toEqual({ mean: 0, variance: 1 })
    }
  })

  it('inflates work-value variance to 1.5 for grade-band "middle"', () => {
    const p = initialPosterior({ gradeBand: 'middle' })
    for (const s of WORK_VALUE_SCALES) {
      expect(p.workValues[s].variance).toBe(1.5)
    }
    // RIASEC unaffected
    for (const s of RIASEC_SCALES) {
      expect(p.riasec[s].variance).toBe(1)
    }
  })

  it('uses defaults for any non-middle grade band', () => {
    for (const band of ['early-hs', 'late-hs', 'college'] as const) {
      const p = initialPosterior({ gradeBand: band })
      for (const s of WORK_VALUE_SCALES) {
        expect(p.workValues[s].variance).toBe(1)
      }
    }
  })

  it('treats undefined grade band the same as defaults', () => {
    const p = initialPosterior({})
    for (const s of WORK_VALUE_SCALES) {
      expect(p.workValues[s].variance).toBe(1)
    }
  })
})
