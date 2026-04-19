import { describe, it, expect } from 'vitest'
import mnmFixture from '../__fixtures__/mnm-career.json'
import { MnmCareerSchema } from '../schemas'
import { toCareerContext, JOB_ZONE_NAMES, JOB_ZONE_DESCRIPTIONS } from '../projectors'

describe('toCareerContext', () => {
  it('projects an MNM payload to the chat CareerContext shape', () => {
    const career = MnmCareerSchema.parse(mnmFixture)
    const ctx = toCareerContext(career)
    expect(ctx.title).toBe('Registered Nurses')
    expect(ctx.onetCode).toBe('29-1141.00')
    expect(ctx.tasks.length).toBeGreaterThan(0)
    expect(ctx.tasks.length).toBeLessThanOrEqual(5)
    expect(ctx.skills.length).toBeLessThanOrEqual(10)
    expect(ctx.knowledge.length).toBeLessThanOrEqual(5)
    expect(ctx.technology.length).toBeLessThanOrEqual(8)
    expect(ctx.jobZone.number).toBe(4)
    expect(ctx.jobZone.name).toBe(JOB_ZONE_NAMES[4])
    expect(ctx.jobZone.description).toBe(JOB_ZONE_DESCRIPTIONS[4])
    expect(ctx.riasecTop).toContain('Social')
    expect(ctx.salaryMedian).toMatch(/\$81/)
    expect(ctx.outlook).toMatch(/Faster/)
  })
})
