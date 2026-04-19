import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HollandCodeHero from '../HollandCodeHero'
import type { AssessmentResult } from '@/lib/assessment'

const mockResult: AssessmentResult = {
  hollandCode: 'SAE',
  riasec: {
    R: { score: 10, rank: 6, confidence: 'low' },
    I: { score: 30, rank: 4, confidence: 'medium' },
    A: { score: 60, rank: 2, confidence: 'high' },
    S: { score: 75, rank: 1, confidence: 'high' },
    E: { score: 50, rank: 3, confidence: 'medium' },
    C: { score: 20, rank: 5, confidence: 'low' },
  },
  workValues: { top: [], all: {} as never },
  workContext: {} as never,
  meta: { itemsAnswered: 14, itemsSkipped: 0, completedAt: '', engineVersion: 'v1.0.0', inconsistencyFlag: false },
}

describe('HollandCodeHero', () => {
  it('renders each top letter in its own card', () => {
    render(<HollandCodeHero result={mockResult} />)
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
  })

  it('renders the three top letter full names', () => {
    render(<HollandCodeHero result={mockResult} />)
    expect(screen.getByText('Social')).toBeInTheDocument()
    expect(screen.getByText('Artistic')).toBeInTheDocument()
    expect(screen.getByText('Enterprising')).toBeInTheDocument()
  })

  it('renders confidence bands for the top three', () => {
    const { container } = render(<HollandCodeHero result={mockResult} />)
    const badges = container.querySelectorAll('[data-testid="confidence-badge"]')
    expect(badges.length).toBe(3)
  })
})
