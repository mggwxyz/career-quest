import { describe, it, expect } from 'vitest'
import mnmFixture from '../__fixtures__/mnm-career.json'
import { MnmCareerSchema } from '../schemas'
import { deriveMirrorRow } from '../seed-helpers'

describe('deriveMirrorRow', () => {
  it('derives mirror fields from an MNM career payload', () => {
    const parsed = MnmCareerSchema.parse(mnmFixture)
    const row = deriveMirrorRow(parsed, new Set())
    expect(row.code).toBe('29-1141.00')
    expect(row.slug).toBe('registered-nurses')
    expect(row.title).toBe('Registered Nurses')
    expect(row.description).toMatch(/Assess patient/)
    expect(row.jobZone).toBe(4)
    expect(row.brightOutlook).toBe(true)
    expect(row.riasecPrimary).toBe('S')
    expect(row.riasecAll).toEqual(['S', 'I', 'R'])
  })

  it('handles slug collisions', () => {
    const parsed = MnmCareerSchema.parse(mnmFixture)
    const taken = new Set(['registered-nurses'])
    const row = deriveMirrorRow(parsed, taken)
    expect(row.slug).toBe('registered-nurses-2')
  })
})
