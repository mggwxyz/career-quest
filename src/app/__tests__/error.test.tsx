import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '../error'

describe('root error boundary', () => {
  const originalLocation = window.location.pathname

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })))
    window.history.pushState({}, '', '/discover/profile')
  })

  afterEach(() => {
    window.history.pushState({}, '', originalLocation)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reports caught errors with digest and route metadata', async () => {
    const error = Object.assign(new Error('Profile crashed'), {
      name: 'ProfileError',
      stack: 'ProfileError: Profile crashed\n    at ProfilePage',
      digest: 'NEXT_DIGEST_123',
    })

    render(<ErrorBoundary error={error} reset={vi.fn()} />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/error-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'client',
          name: 'ProfileError',
          message: 'Profile crashed',
          stack: 'ProfileError: Profile crashed\n    at ProfilePage',
          digest: 'NEXT_DIGEST_123',
          route: '/discover/profile',
          metadata: { boundary: 'app/error' },
        }),
      })
    })
    expect(screen.getByText('NEXT_DIGEST_123')).toBeInTheDocument()
    expect(console.error).toHaveBeenCalledWith('Root error boundary caught:', error)
  })

  it('lets users retry after rendering the fallback UI', () => {
    const reset = vi.fn()

    render(<ErrorBoundary error={new Error('boom')} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(reset).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
  })

  it('uses the root-boundary fallback message when the error has no message', async () => {
    render(<ErrorBoundary error={new Error('')} reset={vi.fn()} />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/error-events', expect.objectContaining({
        body: expect.stringContaining('"message":"Root error boundary caught an error"'),
      }))
    })
  })
})
