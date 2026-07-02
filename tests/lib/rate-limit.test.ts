import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  afterEach(() => vi.useRealTimers())

  it('allows up to the limit, blocks past it, and resets after the window', () => {
    vi.useFakeTimers()
    expect(rateLimit('k', 2, 1000)).toBe(true)
    expect(rateLimit('k', 2, 1000)).toBe(true)
    expect(rateLimit('k', 2, 1000)).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit('k', 2, 1000)).toBe(true)
  })

  it('tracks keys independently', () => {
    vi.useFakeTimers()
    expect(rateLimit('a', 1, 1000)).toBe(true)
    expect(rateLimit('a', 1, 1000)).toBe(false)
    expect(rateLimit('b', 1, 1000)).toBe(true)
  })
})
