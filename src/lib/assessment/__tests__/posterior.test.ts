import { describe, it, expect } from 'vitest'
import { initialPosterior, updatePosterior } from '../posterior'
import { RIASEC_SCALES, WORK_VALUE_SCALES } from '../types'
import { Item, Option } from '../types'

function makeOption(over: Partial<Option> & { id: string }): Option {
  return {
    id: over.id,
    text: over.text ?? over.id,
    imageUrl: over.imageUrl ?? '',
    prompt: over.prompt ?? '',
    desirability: over.desirability ?? 3,
    loadings: over.loadings ?? {
      riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}

function makeItem(opt1Loadings: Option['loadings'], opt2Loadings: Option['loadings']): Item {
  return {
    id: 'test-item',
    option1: makeOption({ id: 'a', loadings: opt1Loadings }),
    option2: makeOption({ id: 'b', loadings: opt2Loadings }),
    dimensionContrast: 'mixed',
    primaryScales: [],
  }
}

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

describe('updatePosterior — RIASEC update direction', () => {
  it('shifts mean of strongly-loaded scale toward picked option', () => {
    const item = makeItem(
      { riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
      { riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
    )
    const before = initialPosterior()
    const after = updatePosterior(before, item, 1) // picked option1 (R-loaded)
    expect(after.riasec.R.mean).toBeGreaterThan(before.riasec.R.mean)
    expect(after.riasec.S.mean).toBeLessThan(before.riasec.S.mean)
  })

  it('reduces variance on contrasted scales', () => {
    const item = makeItem(
      { riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
      { riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
    )
    const before = initialPosterior()
    const after = updatePosterior(before, item, 1)
    expect(after.riasec.R.variance).toBeLessThan(before.riasec.R.variance)
    expect(after.riasec.S.variance).toBeLessThan(before.riasec.S.variance)
  })

  it('leaves untouched scales (zero loadings on both options) unchanged', () => {
    const item = makeItem(
      { riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
      { riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
    )
    const before = initialPosterior()
    const after = updatePosterior(before, item, 1)
    expect(after.riasec.A).toEqual(before.riasec.A)
    expect(after.riasec.C).toEqual(before.riasec.C)
  })
})

describe('updatePosterior — skip handling', () => {
  it('produces a smaller variance reduction than a forced choice', () => {
    const item = makeItem(
      { riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
      { riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
    )
    const before = initialPosterior()
    const skipped = updatePosterior(before, item, null)
    const chosen = updatePosterior(before, item, 1)
    const skipDelta = before.riasec.R.variance - skipped.riasec.R.variance
    const chooseDelta = before.riasec.R.variance - chosen.riasec.R.variance
    expect(skipDelta).toBeGreaterThan(0)
    expect(skipDelta).toBeLessThan(chooseDelta)
  })
})
