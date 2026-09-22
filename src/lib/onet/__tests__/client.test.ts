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

  it('aborts in-flight requests when the caller aborts the provided signal', async () => {
    process.env.ONET_API_KEY = 'test-key'
    const { onetFetch } = await import('../client?callerAbort=' + Date.now())
    const callerController = new AbortController()
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' })
    const fetchMock = vi.fn((_url, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(abortError))
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const request = onetFetch('/mnm/careers/29-1141.00', {
      signal: callerController.signal,
    })
    const expectation = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    callerController.abort()

    await expectation
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-v2.onetcenter.org/mnm/careers/29-1141.00',
      expect.objectContaining({
        headers: {
          'X-API-Key': 'test-key',
          'Accept': 'application/json',
        },
        next: { revalidate: 86400 },
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('throws a status-aware error for failed O*NET responses', async () => {
    process.env.ONET_API_KEY = 'test-key'
    const { onetFetch } = await import('../client?failedResponse=' + Date.now())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } satisfies Partial<Response>))

    await expect(onetFetch('/mnm/careers/29-1141.00'))
      .rejects
      .toThrow('O*NET request failed: 503 https://api-v2.onetcenter.org/mnm/careers/29-1141.00')
  })
})
