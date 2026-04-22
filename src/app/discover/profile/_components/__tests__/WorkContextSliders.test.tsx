import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WorkContextSliders from '../WorkContextSliders'
import type { AssessmentResult } from '@/lib/assessment'

function buildResult(ctx: AssessmentResult['workContext']): AssessmentResult {
  return {
    hollandCode: 'SAE',
    riasec: {} as never,
    workValues: { top: [], all: {} as never },
    workContext: ctx,
    meta: { itemsAnswered: 14, itemsSkipped: 0, completedAt: '', engineVersion: 'v1.0.0', inconsistencyFlag: false },
  }
}

describe('WorkContextSliders', () => {
  it('renders all three axes with endpoint labels', () => {
    render(
      <WorkContextSliders result={buildResult({
        structureVariety: { lean: 'variety', strength: 0.8, confidence: 'high' },
        indoorOutdoor: { lean: 'mixed', strength: 0.1, confidence: 'low' },
        soloTeam: { lean: 'team', strength: 0.6, confidence: 'medium' },
      })}
      />,
    )
    expect(screen.getByText(/Structure/)).toBeInTheDocument()
    expect(screen.getByText(/Variety/)).toBeInTheDocument()
    expect(screen.getByText(/Indoor/)).toBeInTheDocument()
    expect(screen.getByText(/Outdoor/)).toBeInTheDocument()
    expect(screen.getByText(/Solo/)).toBeInTheDocument()
    expect(screen.getByText(/Team/)).toBeInTheDocument()
  })
})
