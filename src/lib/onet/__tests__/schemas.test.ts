import { describe, it, expect } from 'vitest'
import occListFixture from '../__fixtures__/occupations-list.json'
import {
  MnmCareerV2SummarySchema,
  MnmElementGroupSchema,
  MnmTechnologyV2Schema,
  MnmEducationV2Schema,
  MnmJobOutlookV2Schema,
  MnmExploreMoreV2Schema,
  OccupationsListSchema,
  OnlineInterestsSummaryV2Schema,
} from '../schemas'

describe('O*NET zod schemas', () => {
  it('parses an occupations list page', () => {
    const parsed = OccupationsListSchema.parse(occListFixture)
    expect(parsed.total).toBe(2)
    expect(parsed.occupation).toHaveLength(2)
    expect(parsed.occupation[0].code).toMatch(/^\d{2}-\d{4}\.\d{2}$/)
  })

  it('parses a v2 MNM career summary (on_the_job is an array of strings)', () => {
    const parsed = MnmCareerV2SummarySchema.parse({
      code: '13-2011.00',
      title: 'Accountants & Auditors',
      tags: { bright_outlook: true },
      what_they_do: 'Examine, analyze, and interpret accounting records.',
      on_the_job: ['Prepare detailed reports on audit findings.'],
    })
    expect(parsed.code).toBe('13-2011.00')
    expect(parsed.on_the_job).toHaveLength(1)
    expect(parsed.tags?.bright_outlook).toBe(true)
  })

  it('parses an element-group payload (knowledge/skills)', () => {
    const parsed = MnmElementGroupSchema.parse([
      { id: '2.C.1', name: 'Business', element: [{ id: '2.C.1.c', name: 'accounting' }] },
    ])
    expect(parsed[0].element[0].name).toBe('accounting')
  })

  it('parses a technology payload with title-keyed examples', () => {
    const parsed = MnmTechnologyV2Schema.parse([
      { code: 43231601, title: 'Accounting software', example: [{ title: 'QuickBooks', hot_technology: true }] },
    ])
    expect(parsed[0].example[0].title).toBe('QuickBooks')
  })

  it('parses an education payload with a nested job_zone.code', () => {
    const parsed = MnmEducationV2Schema.parse({ job_zone: { code: 4 } })
    expect(parsed.job_zone.code).toBe(4)
  })

  it('parses a job_outlook with annual salary and no bright_outlook', () => {
    const parsed = MnmJobOutlookV2Schema.parse({
      outlook: { category: 'Bright', description: 'New opportunities are very likely.' },
      salary: { annual_median: 81680 },
    })
    expect(parsed.outlook.category).toBe('Bright')
    expect(parsed.salary.annual_median).toBe(81680)
    expect(parsed.salary.hourly_median).toBeUndefined()
  })

  it('parses a job_outlook with hourly salary (no annual)', () => {
    const parsed = MnmJobOutlookV2Schema.parse({
      outlook: { category: 'Below Average', description: 'Less likely in the future.' },
      salary: { hourly_median: 23.33 },
    })
    expect(parsed.salary.hourly_median).toBe(23.33)
    expect(parsed.salary.annual_median).toBeUndefined()
  })

  it('parses explore_more with related careers', () => {
    const parsed = MnmExploreMoreV2Schema.parse({
      careers: [{ code: '13-2011.00', title: 'Accountants & Auditors' }],
    })
    expect(parsed.careers).toHaveLength(1)
  })

  it('parses online/summary/interests with an interest_code', () => {
    const parsed = OnlineInterestsSummaryV2Schema.parse({
      interest_code: 'CEI',
      element: [
        { id: '1.B.1.f', name: 'Conventional' },
        { id: '1.B.1.e', name: 'Enterprising' },
        { id: '1.B.1.b', name: 'Investigative' },
      ],
    })
    expect(parsed.interest_code).toBe('CEI')
    expect(parsed.element.map(e => e.name)).toEqual(['Conventional', 'Enterprising', 'Investigative'])
  })
})
