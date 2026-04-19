import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PeekModal from '../PeekModal'
import { initialPosterior } from '@/lib/assessment'

describe('PeekModal', () => {
  it('renders all six RIASEC rows', () => {
    render(<PeekModal posterior={initialPosterior({})} onClose={vi.fn()} />)
    for (const code of ['R', 'I', 'A', 'S', 'E', 'C']) {
      expect(screen.getByText(new RegExp(`\\b${code}\\b`))).toBeInTheDocument()
    }
  })

  it('calls onClose when the close button is clicked', () => {
    const fn = vi.fn()
    render(<PeekModal posterior={initialPosterior({})} onClose={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Keep going|Close/i }))
    expect(fn).toHaveBeenCalled()
  })
})
