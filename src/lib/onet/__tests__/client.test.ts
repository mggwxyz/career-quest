import { describe, it, expect, afterEach, vi } from 'vitest'

describe('onetFetch', () => {
  const originalEnv = process.env.ONET_API_KEY

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    if (originalEnv === undefined) delete process.env.ONET_API_KEY
    else process.env.ONET_API_KEY = originalEnv
  })

  it('throws at module import when ONET_API_KEY is missing', async () => {
    delete process.env.ONET_API_KEY
    // Force re-import
    await expect(import('../client?missing=' + Date.now()))
      .rejects.toThrow(/ONET_API_KEY/)
  })

  it('aborts slow requests at the configured timeout', async () => {
    vi.useFakeTimers()
    process.env.ONET_API_KEY = 'test-key'
    const { onetFetch } = await import('../client?timeout=' + Date.now())
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' })
    const fetchMock = vi.fn((_url, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(abortError))
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const request = onetFetch('/mnm/careers/29-1141.00', { timeoutMs: 5 })
    const expectation = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(5)

    await expectation
  })
})
