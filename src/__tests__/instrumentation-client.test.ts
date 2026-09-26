import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/instrumentation-client'

type SendBeaconMock = ReturnType<typeof vi.fn<(url: string, data?: BodyInit | null) => boolean>>

async function beaconPayload(sendBeacon: SendBeaconMock) {
  const call = sendBeacon.mock.calls[0]
  if (!call) throw new Error('Expected sendBeacon to be called')
  const blob = call[1]
  if (!(blob instanceof Blob)) throw new Error('Expected sendBeacon payload to be a Blob')
  return JSON.parse(await blob.text()) as Record<string, unknown>
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.history.pushState({}, '', '/discover/profile')
})

describe('instrumentation-client', () => {
  it('reports browser error events through sendBeacon with route and source metadata', async () => {
    const sendBeacon = vi.fn<(url: string, data?: BodyInit | null) => boolean>(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeacon,
    })

    const error = new TypeError('Cannot read properties of undefined')
    error.stack = 'TypeError: Cannot read properties of undefined'
    window.dispatchEvent(new ErrorEvent('error', {
      error,
      message: 'fallback browser message',
      filename: '/_next/static/chunks/app.js',
      lineno: 42,
      colno: 7,
    }))

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/error-events')
    const payload = await beaconPayload(sendBeacon)
    expect(payload).toMatchObject({
      source: 'client',
      name: 'TypeError',
      message: 'Cannot read properties of undefined',
      stack: 'TypeError: Cannot read properties of undefined',
      route: '/discover/profile',
      metadata: {
        filename: '/_next/static/chunks/app.js',
        lineno: 42,
        colno: 7,
      },
    })
  })

  it('falls back to keepalive fetch for string promise rejections when Beacon is unavailable', async () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    const event = new Event('unhandledrejection')
    Object.defineProperty(event, 'reason', { value: 'network unavailable' })
    window.dispatchEvent(event)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/error-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'client',
        message: 'network unavailable',
        route: '/discover/profile',
      }),
      keepalive: true,
    })
  })

  it('swallows synchronous transport failures while handling an existing app error', async () => {
    const sendBeacon = vi.fn<(url: string, data?: BodyInit | null) => boolean>(() => {
      throw new Error('transport unavailable')
    })
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeacon,
    })

    expect(() => {
      window.dispatchEvent(new ErrorEvent('error', {
        error: null,
        message: 'Script error.',
        filename: '',
        lineno: 0,
        colno: 0,
      }))
    }).not.toThrow()
  })
})
