import { describe, it, expect } from 'vitest'
import { deriveMirrorRow, type MirrorSource } from '../seed-helpers'

const baseSource: MirrorSource = {
  code: '29-1141.00',
  title: 'Registered Nurses',
  description: 'Assess patient health problems and needs, develop and implement nursing care plans, and maintain medical records.',
  brightOutlook: true,
  jobZone: 4,
  interestCode: 'SIR',
  salaryAnnualMedian: 81220,
  salaryHourlyMedian: null,
  outlookCategory: 'Bright',
}

describe('deriveMirrorRow', () => {
  it('derives mirror fields from a v2 MirrorSource', () => {
    const row = deriveMirrorRow(baseSource, new Set())
    expect(row.code).toBe('29-1141.00')
    expect(row.slug).toBe('registered-nurses')
    expect(row.title).toBe('Registered Nurses')
    expect(row.description).toMatch(/Assess patient/)
    expect(row.jobZone).toBe(4)
    expect(row.brightOutlook).toBe(true)
    expect(row.riasecPrimary).toBe('S')
    expect(row.riasecAll).toEqual(['S', 'I', 'R'])
    expect(row.salaryAnnualMedian).toBe(81220)
    expect(row.salaryHourlyMedian).toBeNull()
    expect(row.outlookCategory).toBe('Bright')
  })

  it('handles slug collisions', () => {
    const taken = new Set(['registered-nurses'])
    const row = deriveMirrorRow(baseSource, taken)
    expect(row.slug).toBe('registered-nurses-2')
  })

  it('filters non-RIASEC characters from interest_code', () => {
    const row = deriveMirrorRow({ ...baseSource, interestCode: 'cei-x' }, new Set())
    expect(row.riasecAll).toEqual(['C', 'E', 'I'])
  })
})
