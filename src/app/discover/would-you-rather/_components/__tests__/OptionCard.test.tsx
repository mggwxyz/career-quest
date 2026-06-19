import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OptionCard from '../OptionCard'

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={String(src)} alt={alt ?? ''} {...props} />
  ),
}))

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileHover, whileTap, transition, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      whileHover?: unknown
      whileTap?: unknown
      transition?: unknown
    }) => (
      <button
        data-while-hover={whileHover ? JSON.stringify(whileHover) : undefined}
        data-while-tap={whileTap ? JSON.stringify(whileTap) : undefined}
        {...props}
      >
        {children}
      </button>
    ),
    div: ({ children, initial, animate, transition, ...props }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown
      animate?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

const option = {
  id: 'software-developer',
  text: 'Build software that helps people solve problems',
  imageUrl: '/images/career-scenes/software-developer.webp',
  prompt: 'A software developer working at a desk',
}

describe('OptionCard', () => {
  it('does not apply hover motion that zooms or shifts the career image card', () => {
    render(<OptionCard option={option} isSelected={false} showCheckmark={false} onClick={vi.fn()} />)

    const card = screen.getByRole('button', { name: /Build software/i })

    expect(card).not.toHaveAttribute('data-while-hover')
    expect(screen.getByRole('img', { name: option.prompt })).not.toHaveClass(/scale/)
  })

  it('calls onClick when the card is selected', () => {
    const onClick = vi.fn()
    render(<OptionCard option={option} isSelected={false} showCheckmark={false} onClick={onClick} />)

    fireEvent.click(screen.getByRole('button', { name: /Build software/i }))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
