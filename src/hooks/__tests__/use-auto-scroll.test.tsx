import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAutoScroll } from '../use-auto-scroll'

function AutoScrollHarness({ messages }: { messages: string[] }) {
  const {
    containerRef,
    handleScroll,
    handleTouchStart,
    shouldAutoScroll,
  } = useAutoScroll([messages])

  return (
    <div
      ref={containerRef}
      data-testid="scroller"
      data-auto-scroll={String(shouldAutoScroll)}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
    >
      {messages.map(message => (
        <p key={message}>{message}</p>
      ))}
    </div>
  )
}

function setScrollMetrics(
  element: HTMLElement,
  metrics: { scrollHeight: number, clientHeight: number, scrollTop: number },
) {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: metrics.scrollHeight },
    clientHeight: { configurable: true, value: metrics.clientHeight },
  })
  element.scrollTop = metrics.scrollTop
}

describe('useAutoScroll', () => {
  it('pins new content to the bottom while auto-scroll is enabled', () => {
    const { rerender } = render(<AutoScrollHarness messages={['hello']} />)
    const scroller = screen.getByTestId('scroller')
    setScrollMetrics(scroller, { scrollHeight: 1_000, clientHeight: 300, scrollTop: 700 })

    rerender(<AutoScrollHarness messages={['hello', 'new reply']} />)

    expect(scroller.scrollTop).toBe(1_000)
    expect(scroller).toHaveAttribute('data-auto-scroll', 'true')
  })

  it('does not force new content into view after a deliberate scroll up', () => {
    const { rerender } = render(<AutoScrollHarness messages={['hello']} />)
    const scroller = screen.getByTestId('scroller')
    setScrollMetrics(scroller, { scrollHeight: 1_000, clientHeight: 300, scrollTop: 700 })
    fireEvent.scroll(scroller)

    setScrollMetrics(scroller, { scrollHeight: 1_000, clientHeight: 300, scrollTop: 650 })
    fireEvent.scroll(scroller)

    expect(scroller).toHaveAttribute('data-auto-scroll', 'false')
    setScrollMetrics(scroller, { scrollHeight: 1_100, clientHeight: 300, scrollTop: 650 })
    rerender(<AutoScrollHarness messages={['hello', 'new reply']} />)

    expect(scroller.scrollTop).toBe(650)
    expect(scroller).toHaveAttribute('data-auto-scroll', 'false')
  })

  it('re-enables auto-scroll after the user returns near the bottom', () => {
    const { rerender } = render(<AutoScrollHarness messages={['hello']} />)
    const scroller = screen.getByTestId('scroller')
    setScrollMetrics(scroller, { scrollHeight: 1_000, clientHeight: 300, scrollTop: 700 })
    fireEvent.scroll(scroller)

    setScrollMetrics(scroller, { scrollHeight: 1_000, clientHeight: 300, scrollTop: 650 })
    fireEvent.scroll(scroller)
    expect(scroller).toHaveAttribute('data-auto-scroll', 'false')

    setScrollMetrics(scroller, { scrollHeight: 1_000, clientHeight: 300, scrollTop: 660 })
    fireEvent.scroll(scroller)
    expect(scroller).toHaveAttribute('data-auto-scroll', 'true')

    setScrollMetrics(scroller, { scrollHeight: 1_100, clientHeight: 300, scrollTop: 660 })
    rerender(<AutoScrollHarness messages={['hello', 'new reply']} />)

    expect(scroller.scrollTop).toBe(1_100)
  })

  it('pauses auto-scroll when a touch interaction starts', () => {
    const { rerender } = render(<AutoScrollHarness messages={['hello']} />)
    const scroller = screen.getByTestId('scroller')
    setScrollMetrics(scroller, { scrollHeight: 1_000, clientHeight: 300, scrollTop: 700 })

    fireEvent.touchStart(scroller)
    expect(scroller).toHaveAttribute('data-auto-scroll', 'false')

    setScrollMetrics(scroller, { scrollHeight: 1_100, clientHeight: 300, scrollTop: 700 })
    rerender(<AutoScrollHarness messages={['hello', 'new reply']} />)

    expect(scroller.scrollTop).toBe(700)
  })
})
