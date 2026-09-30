import { afterEach, describe, expect, it, vi } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to the limit and rejects additional hits in the same window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const key = 'quota:user-a'

    expect(rateLimit(key, 2, 60_000)).toBe(true)
    expect(rateLimit(key, 2, 60_000)).toBe(true)
    expect(rateLimit(key, 2, 60_000)).toBe(false)
  })

  it('prunes expired hits without letting rejected hits extend the window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const key = 'window:user-b'

    expect(rateLimit(key, 1, 1_000)).toBe(true)

    vi.advanceTimersByTime(999)
    expect(rateLimit(key, 1, 1_000)).toBe(false)

    vi.advanceTimersByTime(1)
    expect(rateLimit(key, 1, 1_000)).toBe(true)
    expect(rateLimit(key, 1, 1_000)).toBe(false)
  })

  it('tracks independent buckets per key', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    expect(rateLimit('key-a', 1, 60_000)).toBe(true)
    expect(rateLimit('key-a', 1, 60_000)).toBe(false)

    expect(rateLimit('key-b', 1, 60_000)).toBe(true)
  })
})
