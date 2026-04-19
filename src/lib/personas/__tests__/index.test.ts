import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../../data/personas/personas.json', () => ({
  default: {
    '29-1141.00': {
      onetId: '29-1141.00',
      name: 'Test Nurse',
      age: 34,
      gender: 'female',
      pronouns: 'she/her',
      ethnicityCue: 'hispanic',
      ageBand: '30s',
      yearsInField: 12,
      location: 'Denver, CO',
      educationPath: 'Test path.',
      pathToCurrentPosition: 'Test path.',
      dayInTheLife: 'Test day.',
      hobby: 'Test hobby.',
      imagePrompt: 'test prompt',
      generatedAt: '2026-04-18T00:00:00.000Z',
      textModel: 'gpt-5',
      imageModel: 'gpt-image-1',
    },
  },
}))

import { getPersona } from '../index'

describe('getPersona', () => {
  it('returns a persona for a seeded onetId', () => {
    const persona = getPersona('29-1141.00')
    expect(persona?.name).toBe('Test Nurse')
    expect(persona?.age).toBe(34)
  })

  it('returns null for an unseeded onetId', () => {
    expect(getPersona('99-9999.99')).toBeNull()
  })
})
