import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InconsistencyModal from '../InconsistencyModal'

describe('InconsistencyModal', () => {
  it('renders both actions', () => {
    render(<InconsistencyModal onDismiss={vi.fn()} onRetake={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Review answers|Retake/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /See my results anyway|Continue/i })).toBeInTheDocument()
  })

  it('calls onDismiss on "continue" and onRetake on "retake"', () => {
    const dismiss = vi.fn()
    const retake = vi.fn()
    render(<InconsistencyModal onDismiss={dismiss} onRetake={retake} />)
    fireEvent.click(screen.getByRole('button', { name: /See my results anyway|Continue/i }))
    expect(dismiss).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Review answers|Retake/i }))
    expect(retake).toHaveBeenCalled()
  })
})
