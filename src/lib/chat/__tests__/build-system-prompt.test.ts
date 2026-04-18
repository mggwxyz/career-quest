import { describe, it, expect } from 'vitest'
import { buildCareerRolePlaySystemPrompt, type CareerContext } from '../build-system-prompt'

const careerContext: CareerContext = {
  title: 'Registered Nurses',
  onetCode: '29-1141.00',
  shortDescription: 'Assess patient health problems and needs.',
  tasks: ['Administer medications', 'Monitor vitals'],
  skills: ['Active Listening', 'Critical Thinking'],
  knowledge: ['Medicine and Dentistry'],
  workActivities: ['Documenting information'],
  technology: ['Epic Systems'],
  jobZone: { number: 4, name: 'Considerable Prep', description: 'Several years of college' },
  riasecTop: ['Social', 'Investigative'],
  salaryMedian: '$81,220',
  outlook: 'Faster than average',
}

describe('buildCareerRolePlaySystemPrompt', () => {
  it('includes the career title and O*NET code', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).toMatch(/Registered Nurses/)
    expect(out).toMatch(/29-1141\.00/)
  })
  it('includes every task, skill, and technology', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).toMatch(/Administer medications/)
    expect(out).toMatch(/Active Listening/)
    expect(out).toMatch(/Epic Systems/)
  })
  it('omits recommendation context when null', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).not.toMatch(/recommended this career/)
  })
  it('weaves recommendation context when provided', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, { whyItMatches: 'You value helping others.' })
    expect(out).toMatch(/You value helping others\./)
    expect(out).toMatch(/recommended this career/i)
  })
  it('instructs a first-turn self-introduction with name + years + workplace', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).toMatch(/first name/i)
    expect(out).toMatch(/years/i)
    expect(out).toMatch(/workplace/i)
  })
  it('forbids breaking character', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).toMatch(/never.*AI/i)
    expect(out).toMatch(/never break character/i)
  })
})
