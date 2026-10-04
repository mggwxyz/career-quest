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

  it('sends authenticated JSON requests and removes caller abort listeners after settling', async () => {
    process.env.ONET_API_KEY = 'test-key'
    const { onetFetch } = await import('../client?request=' + Date.now())
    const payload = { title: 'Registered Nurses' }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const callerController = new AbortController()
    const addListener = vi.spyOn(callerController.signal, 'addEventListener')
    const removeListener = vi.spyOn(callerController.signal, 'removeEventListener')

    await expect(onetFetch('/mnm/careers/29-1141.00', {
      revalidateSeconds: 60,
      signal: callerController.signal,
      timeoutMs: 1_000,
    })).resolves.toEqual(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-v2.onetcenter.org/mnm/careers/29-1141.00',
      expect.objectContaining({
        headers: {
          'X-API-Key': 'test-key',
          'Accept': 'application/json',
        },
        next: { revalidate: 60 },
        signal: expect.any(AbortSignal),
      }),
    )
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit
    expect(requestInit.signal).not.toBe(callerController.signal)
    expect(addListener).toHaveBeenCalledWith('abort', expect.any(Function), { once: true })
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
  })

  it('propagates caller aborts to the in-flight O*NET request', async () => {
    process.env.ONET_API_KEY = 'test-key'
    const { onetFetch } = await import('../client?caller-abort=' + Date.now())
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' })
    let requestSignal: AbortSignal | undefined
    const fetchMock = vi.fn((_url, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        if (requestSignal?.aborted) {
          reject(abortError)
          return
        }
        requestSignal?.addEventListener('abort', () => reject(abortError))
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const callerController = new AbortController()

    const request = onetFetch('/mnm/careers/29-1141.00', {
      signal: callerController.signal,
      timeoutMs: 10_000,
    })
    expect(requestSignal?.aborted).toBe(false)
    callerController.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(requestSignal?.aborted).toBe(true)
  })
})
