import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfidenceMeter from '../ConfidenceMeter'

describe('ConfidenceMeter', () => {
  it('renders a progressbar with 30 dots at 0 answered', () => {
    render(<ConfidenceMeter itemsAnswered={0} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemax', '30')
    expect(bar).toHaveAttribute('aria-valuenow', '0')
  })

  it('reflects answered count via aria-valuenow', () => {
    render(<ConfidenceMeter itemsAnswered={10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')
  })

  it('caps aria-valuenow at 30', () => {
    render(<ConfidenceMeter itemsAnswered={42} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
  })
})
