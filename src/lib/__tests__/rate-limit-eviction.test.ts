import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let rateLimit: typeof import('../rate-limit').rateLimit

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-30T00:00:00Z'))
  ;({ rateLimit } = await import('../rate-limit'))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('idle rate-limit bucket eviction', () => {
  it('reclaims idle keys without accessing them again', () => {
    const deleted = vi.spyOn(Map.prototype, 'delete')
    for (let i = 0; i < 100; i++) rateLimit(`idle:${i}`, 1, 60_000)

    vi.advanceTimersByTime(60_000)
    rateLimit('new-user', 1, 60_000)

    for (let i = 0; i < 100; i++) expect(deleted).toHaveBeenCalledWith(`idle:${i}`)
    expect(deleted).not.toHaveBeenCalledWith('new-user')
  })

  it('retains live buckets with longer windows while sweeping short windows', () => {
    const deleted = vi.spyOn(Map.prototype, 'delete')
    rateLimit('short-window', 1, 60_000)
    rateLimit('long-window', 1, 120_000)

    vi.advanceTimersByTime(60_000)
    rateLimit('sweep-trigger', 1, 60_000)

    expect(deleted).toHaveBeenCalledWith('short-window')
    expect(deleted).not.toHaveBeenCalledWith('long-window')
    expect(rateLimit('long-window', 1, 120_000)).toBe(false)

    vi.advanceTimersByTime(60_000)
    expect(rateLimit('long-window', 1, 120_000)).toBe(true)
    expect(deleted).toHaveBeenCalledWith('long-window')
  })

  it('does not prolong bucket retention when a request is denied', () => {
    const deleted = vi.spyOn(Map.prototype, 'delete')
    rateLimit('denied-user', 1, 60_000)
    vi.advanceTimersByTime(59_000)
    expect(rateLimit('denied-user', 1, 60_000)).toBe(false)

    vi.advanceTimersByTime(1_000)
    rateLimit('another-user', 1, 60_000)
    expect(deleted).toHaveBeenCalledWith('denied-user')
  })

  it('keeps a bucket until its most recent accepted request expires', () => {
    const deleted = vi.spyOn(Map.prototype, 'delete')
    rateLimit('active-user', 2, 60_000)
    vi.advanceTimersByTime(30_000)
    rateLimit('active-user', 2, 60_000)

    vi.advanceTimersByTime(30_000)
    rateLimit('sweep-trigger', 1, 60_000)
    expect(deleted).not.toHaveBeenCalledWith('active-user')
    expect(rateLimit('active-user', 2, 60_000)).toBe(true)
    expect(rateLimit('active-user', 2, 60_000)).toBe(false)
  })

  it('does not retain empty buckets for users with no quota', () => {
    const stored = vi.spyOn(Map.prototype, 'set')
    expect(rateLimit('zero-quota', 0, 60_000)).toBe(false)
    expect(stored.mock.calls.some(([key]) => key === 'zero-quota')).toBe(false)
  })
})
