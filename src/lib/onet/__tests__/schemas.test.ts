import { describe, it, expect } from 'vitest'
import mnmFixture from '../__fixtures__/mnm-career.json'
import occListFixture from '../__fixtures__/occupations-list.json'
import { MnmCareerSchema, OccupationsListSchema } from '../schemas'

describe('O*NET zod schemas', () => {
  it('parses an MNM career payload', () => {
    const parsed = MnmCareerSchema.parse(mnmFixture)
    expect(parsed.code).toBe('29-1141.00')
    expect(parsed.on_the_job.task.length).toBeGreaterThan(0)
    expect(parsed.education.job_zone).toBe(4)
    expect(parsed.job_outlook.bright_outlook).toBeDefined()
    expect(parsed.interests.element[0].name).toBe('Social')
  })

  it('parses an occupations list page', () => {
    const parsed = OccupationsListSchema.parse(occListFixture)
    expect(parsed.total).toBe(2)
    expect(parsed.occupation).toHaveLength(2)
    expect(parsed.occupation[0].code).toMatch(/^\d{2}-\d{4}\.\d{2}$/)
  })
})
