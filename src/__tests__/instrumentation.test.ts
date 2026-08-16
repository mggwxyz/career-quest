import type { Instrumentation } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/error-events', () => ({
  captureErrorEvent: vi.fn().mockResolvedValue(undefined),
  errorToEventFields: vi.fn(),
}))

import { onRequestError } from '@/instrumentation'
import { captureErrorEvent, errorToEventFields } from '@/lib/error-events'

type Mock = ReturnType<typeof vi.fn>
type RequestErrorArgs = Parameters<Instrumentation.onRequestError>

beforeEach(() => {
  vi.clearAllMocks()
  ;(captureErrorEvent as Mock).mockResolvedValue(undefined)
  ;(errorToEventFields as Mock).mockReturnValue({
    digest: 'digest-123',
    message: 'render exploded',
    name: 'Error',
    stack: 'stack trace',
  })
})

describe('onRequestError', () => {
  it('captures server request errors with normalized fields and route metadata', async () => {
    const error = new Error('render exploded')
    const request = {
      method: 'GET',
      path: '/discover/profile',
    } as RequestErrorArgs[1]
    const context = {
      renderSource: 'react-server-components',
      revalidateReason: 'stale',
      routerKind: 'App Router',
      routePath: '/discover/profile',
      routeType: 'render',
    } as RequestErrorArgs[2]

    await onRequestError(error, request, context)

    expect(errorToEventFields).toHaveBeenCalledWith(error)
    expect(captureErrorEvent).toHaveBeenCalledWith({
      digest: 'digest-123',
      message: 'render exploded',
      metadata: {
        renderSource: 'react-server-components',
        revalidateReason: 'stale',
        routerKind: 'App Router',
        routePath: '/discover/profile',
        routeType: 'render',
      },
      method: 'GET',
      name: 'Error',
      route: '/discover/profile',
      source: 'server',
      stack: 'stack trace',
    })
  })
})
