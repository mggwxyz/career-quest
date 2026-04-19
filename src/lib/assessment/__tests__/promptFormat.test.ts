import { describe, it, expect } from 'vitest'
import { formatResultForPrompt } from '../promptFormat'
import { AssessmentResult } from '../types'

const SAMPLE: AssessmentResult = {
  hollandCode: 'SAE',
  riasec: {
    S: { score: 90, rank: 1, confidence: 'high' },
    A: { score: 80, rank: 2, confidence: 'high' },
    E: { score: 65, rank: 3, confidence: 'medium' },
    R: { score: 30, rank: 4, confidence: 'medium' },
    I: { score: 20, rank: 5, confidence: 'low' },
    C: { score: 10, rank: 6, confidence: 'high' },
  },
  workValues: {
    top: ['REL', 'ACH'],
    all: {
      ACH: { score: 70, confidence: 'medium' },
      IND: { score: 40, confidence: 'low' },
      REC: { score: 50, confidence: 'low' },
      REL: { score: 90, confidence: 'high' },
      SUP: { score: 30, confidence: 'medium' },
      WC: { score: 50, confidence: 'low' },
    },
  },
  workContext: {
    structureVariety: { lean: 'variety', strength: 0.7, confidence: 'high' },
    indoorOutdoor: { lean: 'mixed', strength: 0.1, confidence: 'low' },
    soloTeam: { lean: 'team', strength: 0.5, confidence: 'medium' },
  },
  meta: {
    itemsAnswered: 14, itemsSkipped: 0,
    completedAt: '2026-04-18T00:00:00Z',
    engineVersion: 'v1.0.0', inconsistencyFlag: false,
  },
}

describe('formatResultForPrompt', () => {
  it('produces a human-readable section with Holland code, confidences, and notes', () => {
    const text = formatResultForPrompt(SAMPLE)
    expect(text).toMatch(/Holland Code: SAE/)
    expect(text).toMatch(/REL.*high/i)
    expect(text).toMatch(/variety/)
    expect(text).toMatch(/team/)
    expect(text).not.toMatch(/inconsist/i)
  })

  it('mentions inconsistency when flagged', () => {
    const text = formatResultForPrompt({ ...SAMPLE, meta: { ...SAMPLE.meta, inconsistencyFlag: true } })
    expect(text).toMatch(/inconsist/i)
  })

  it('mentions tentative work values when suppressed', () => {
    const text = formatResultForPrompt({
      ...SAMPLE, workValues: { ...SAMPLE.workValues, suppressed: true },
    })
    expect(text).toMatch(/tentative/i)
  })
})
