import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OptionCard from '../OptionCard'

type MotionButtonProps = React.ComponentProps<'button'> & {
  whileHover?: unknown
  whileTap?: unknown
  transition?: unknown
}

type MotionDivProps = React.ComponentProps<'div'> & {
  initial?: unknown
  animate?: unknown
  transition?: unknown
}

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ whileHover, whileTap, transition, ...props }: MotionButtonProps) => (
      <button
        data-while-hover={whileHover === undefined ? undefined : JSON.stringify(whileHover)}
        data-while-tap={whileTap === undefined ? undefined : JSON.stringify(whileTap)}
        {...props}
      />
    ),
    div: ({ initial, animate, transition, ...props }: MotionDivProps) => <div {...props} />,
  },
}))

const option = {
  id: 'test-option',
  text: 'Repair a trail bridge',
  imageUrl: '/would-you-rather/images/rs-bike-tutor-1.webp',
  prompt: 'A person repairing a trail bridge',
}

describe('OptionCard', () => {
  it('does not apply hover transform motion to the image card', () => {
    render(<OptionCard option={option} isSelected={false} showCheckmark={false} onClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: /repair a trail bridge/i })).not.toHaveAttribute('data-while-hover')
  })
})
