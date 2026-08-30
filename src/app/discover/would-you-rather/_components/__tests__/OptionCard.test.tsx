import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OptionCard from '../OptionCard'

const option = {
  id: 'option-a',
  text: 'Investigate how a machine works',
  imageUrl: '/images/assessment/realistic-investigate.webp',
  prompt: 'A student inspecting a machine',
}

describe('OptionCard', () => {
  it('exposes selection state to assistive tech and still handles clicks', () => {
    const onClick = vi.fn()

    const { rerender } = render(
      <OptionCard
        option={option}
        isSelected={false}
        showCheckmark={false}
        onClick={onClick}
      />,
    )

    const button = screen.getByRole('button', { name: /Investigate how a machine works/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <OptionCard
        option={option}
        isSelected
        showCheckmark
        onClick={onClick}
      />,
    )

    expect(screen.getByRole('button', { name: /Investigate how a machine works/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('✓')).toHaveAttribute('aria-hidden', 'true')
  })
})
