import { describe, it, expect } from 'vitest'
import { buildCareerRolePlaySystemPrompt, type CareerContext } from '../build-system-prompt'
import type { Persona } from '@/lib/personas/types'

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

const persona: Persona = {
  onetId: '29-1141.00',
  name: 'Maria Alvarez',
  age: 34,
  gender: 'female',
  pronouns: 'she/her',
  ethnicityCue: 'hispanic',
  ageBand: '30s',
  yearsInField: 12,
  location: 'Denver, CO',
  educationPath: 'Associate of Nursing at Front Range CC.',
  pathToCurrentPosition: 'Started in med-surg; moved to ER after 3 years.',
  dayInTheLife: 'Triage, charting, family conversations.',
  hobby: 'Trail running on weekends.',
  imagePrompt: 'prompt',
  generatedAt: '2026-04-19T00:00:00.000Z',
  textModel: 'gpt-5',
  imageModel: 'gpt-image-1',
}

describe('buildCareerRolePlaySystemPrompt with persona', () => {
  it('uses the persona name, age, pronouns, and location verbatim', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, persona)
    expect(out).toMatch(/Maria Alvarez/)
    expect(out).toMatch(/34/)
    expect(out).toMatch(/she\/her/)
    expect(out).toMatch(/Denver, CO/)
    expect(out).toMatch(/12 years/)
  })

  it('injects educationPath, pathToCurrentPosition, dayInTheLife, hobby', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, persona)
    expect(out).toMatch(/Front Range CC/)
    expect(out).toMatch(/med-surg/)
    expect(out).toMatch(/Triage, charting/)
    expect(out).toMatch(/Trail running/)
  })

  it('replaces the pick-a-name self-introduction instruction with persona-driven intro', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, persona)
    expect(out).not.toMatch(/pick one value from 3 to 15/)
    expect(out).toMatch(/introduce yourself/i)
  })

  it('keeps the never-mention-AI rule even when persona is present', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, persona)
    expect(out).toMatch(/never.*AI/i)
    expect(out).toMatch(/never break character/i)
  })

  it('persona=null preserves the original behavior (regression check)', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, null)
    expect(out).toMatch(/first name/i)
    expect(out).toMatch(/never.*AI/i)
  })

  it('uses persona.role in the intro line when present', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, { ...persona, role: 'Emergency Room Nurse' })
    expect(out).toMatch(/a Emergency Room Nurse with 12 years/)
    expect(out).toMatch(/"Emergency Room Nurse" \(singular\)/)
  })

  it('falls back to the career title when persona.role is missing', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, { ...persona, role: undefined })
    expect(out).toMatch(new RegExp(`a ${careerContext.title} with 12 years`))
  })
})
