import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string, children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import ErrorBoundary from '../error'

describe('root error boundary', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.history.pushState({}, '', '/discover/profile')
  })

  afterEach(() => {
    consoleError.mockRestore()
    vi.unstubAllGlobals()
  })

  it('reports the error with route metadata and renders recovery actions', async () => {
    const reset = vi.fn()
    const error = Object.assign(new Error('Profile failed to load'), {
      name: 'ProfileError',
      digest: 'digest-123',
      stack: 'ProfileError: Profile failed to load',
    })

    render(<ErrorBoundary error={error} reset={reset} />)

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.getByText('digest-123')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/')

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(reset).toHaveBeenCalledTimes(1)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/error-events', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      source: 'client',
      name: 'ProfileError',
      message: 'Profile failed to load',
      stack: 'ProfileError: Profile failed to load',
      digest: 'digest-123',
      route: '/discover/profile',
      metadata: { boundary: 'app/error' },
    })
    expect(consoleError).toHaveBeenCalledWith('Root error boundary caught:', error)
  })

  it('uses a stable fallback message when the error has no message', async () => {
    const error = Object.assign(new Error(''), { name: 'EmptyMessageError' })

    render(<ErrorBoundary error={error} reset={vi.fn()} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      name: 'EmptyMessageError',
      message: 'Root error boundary caught an error',
    })
    expect(screen.queryByText(/Error ID:/i)).not.toBeInTheDocument()
  })
})
