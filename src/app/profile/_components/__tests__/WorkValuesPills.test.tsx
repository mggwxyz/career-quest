import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WorkValuesPills from '../WorkValuesPills'
import type { AssessmentResult } from '@/lib/assessment'

function buildResult(partial: Partial<AssessmentResult['workValues']>): AssessmentResult {
  return {
    hollandCode: 'SAE',
    riasec: {} as never,
    workValues: {
      top: ['REL', 'ACH'],
      all: {
        ACH: { score: 70, confidence: 'medium' },
        IND: { score: 20, confidence: 'low' },
        REC: { score: 10, confidence: 'low' },
        REL: { score: 90, confidence: 'high' },
        SUP: { score: 40, confidence: 'low' },
        WC: { score: 30, confidence: 'low' },
      },
      ...partial,
    },
    workContext: {} as never,
    meta: { itemsAnswered: 14, itemsSkipped: 0, completedAt: '', engineVersion: 'v1.0.0', inconsistencyFlag: false },
  }
}

describe('WorkValuesPills', () => {
  it('renders top values with full names', () => {
    render(<WorkValuesPills result={buildResult({})} />)
    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(screen.getByText('Achievement')).toBeInTheDocument()
  })

  it('renders a suppressed message when flagged', () => {
    render(<WorkValuesPills result={buildResult({ suppressed: true, top: [] })} />)
    expect(screen.getByText(/tentative/i)).toBeInTheDocument()
  })
})
