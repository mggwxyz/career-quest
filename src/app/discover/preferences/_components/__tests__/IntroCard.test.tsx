import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import IntroCard from '../IntroCard'

describe('IntroCard', () => {
  it('shows the 20–30 choice copy', () => {
    render(<IntroCard onStart={vi.fn()} />)
    expect(screen.getByText(/20.*30/)).toBeInTheDocument()
  })

  it('calls onStart when the button is clicked', () => {
    const fn = vi.fn()
    render(<IntroCard onStart={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Let's go|Start/i }))
    expect(fn).toHaveBeenCalled()
  })
})
