import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfidenceMeter from '../ConfidenceMeter'

describe('ConfidenceMeter', () => {
  it('shows "Getting clearer" at 0 items', () => {
    render(<ConfidenceMeter itemsAnswered={0} />)
    expect(screen.getByText(/Getting clearer/i)).toBeInTheDocument()
  })

  it('shows "Almost there" after 8 answered', () => {
    render(<ConfidenceMeter itemsAnswered={10} />)
    expect(screen.getByText(/Almost there/i)).toBeInTheDocument()
  })

  it('shows "Got it" after 15 answered', () => {
    render(<ConfidenceMeter itemsAnswered={18} />)
    expect(screen.getByText(/Got it/i)).toBeInTheDocument()
  })
})
