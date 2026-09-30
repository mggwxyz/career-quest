import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/instrumentation-client'

const sendBeaconMock = vi.fn()

function stubSendBeacon(value: typeof navigator.sendBeacon | undefined) {
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    writable: true,
    value,
  })
}

function dispatchBrowserError(init: {
  error?: unknown
  message?: string
  filename?: string
  lineno?: number
  colno?: number
}) {
  const event = new Event('error') as ErrorEvent
  Object.defineProperties(event, {
    error: { value: init.error },
    message: { value: init.message },
    filename: { value: init.filename },
    lineno: { value: init.lineno },
    colno: { value: init.colno },
  })
  window.dispatchEvent(event)
}

function dispatchUnhandledRejection(reason: unknown) {
  const event = new Event('unhandledrejection') as PromiseRejectionEvent
  Object.defineProperty(event, 'reason', { value: reason })
  window.dispatchEvent(event)
}

async function payloadFromBeaconCall() {
  const [url, body] = sendBeaconMock.mock.calls[0] as [string, Blob]

  expect(url).toBe('/api/error-events')
  expect(body).toBeInstanceOf(Blob)

  return JSON.parse(await body.text()) as Record<string, unknown>
}

beforeEach(() => {
  sendBeaconMock.mockReset()
  stubSendBeacon(sendBeaconMock)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })))
  window.history.pushState(null, '', '/discover/profile?step=2')
})

describe('client error instrumentation', () => {
  it('reports browser error events with route and source metadata', async () => {
    const error = new TypeError('Cannot read properties of undefined')

    dispatchBrowserError({
      error,
      message: 'fallback message',
      filename: 'app.js',
      lineno: 12,
      colno: 34,
    })

    expect(sendBeaconMock).toHaveBeenCalledTimes(1)
    await expect(payloadFromBeaconCall()).resolves.toMatchObject({
      source: 'client',
      name: 'TypeError',
      message: 'Cannot read properties of undefined',
      route: '/discover/profile',
      metadata: {
        filename: 'app.js',
        lineno: 12,
        colno: 34,
      },
    })
  })

  it('reports string promise rejections with the rejection reason as the message', async () => {
    window.history.pushState(null, '', '/careers/software-developers')

    dispatchUnhandledRejection('network down')

    expect(sendBeaconMock).toHaveBeenCalledTimes(1)
    await expect(payloadFromBeaconCall()).resolves.toMatchObject({
      source: 'client',
      message: 'network down',
      route: '/careers/software-developers',
    })
  })

  it('falls back to fetch with keepalive when sendBeacon is unavailable', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    stubSendBeacon(undefined)
    vi.stubGlobal('fetch', fetchMock)

    dispatchBrowserError({ message: 'Script error.' })

    expect(fetchMock).toHaveBeenCalledWith('/api/error-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'client',
        message: 'Script error.',
        route: '/discover/profile',
        metadata: {},
      }),
      keepalive: true,
    })
  })
})
