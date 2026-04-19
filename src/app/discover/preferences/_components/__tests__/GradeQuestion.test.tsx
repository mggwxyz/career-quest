import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GradeQuestion from '../GradeQuestion'

describe('GradeQuestion', () => {
  it('renders all five options', () => {
    render(<GradeQuestion onContinue={vi.fn()} />)
    expect(screen.getByRole('button', { name: /6th.*8th/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /9th.*10th/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /11th.*12th/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /College/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prefer not to say/ })).toBeInTheDocument()
  })

  it('calls onContinue("middle") for 6th-8th', () => {
    const fn = vi.fn()
    render(<GradeQuestion onContinue={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /6th.*8th/ }))
    expect(fn).toHaveBeenCalledWith('middle')
  })

  it('calls onContinue(null) for "Prefer not to say"', () => {
    const fn = vi.fn()
    render(<GradeQuestion onContinue={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Prefer not to say/ }))
    expect(fn).toHaveBeenCalledWith(null)
  })
})
