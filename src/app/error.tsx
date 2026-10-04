'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Root error boundary caught:', error)
    void fetch('/api/error-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'client',
        name: error.name,
        message: error.message || 'Root error boundary caught an error',
        stack: error.stack,
        digest: error.digest,
        route: window.location.pathname,
        metadata: { boundary: 'app/error' },
      }),
    }).catch(() => undefined)
  }, [error])

  return (
    <div className="mx-auto px-4 py-20 max-w-lg text-center">
      <div className="text-5xl mb-4" aria-hidden="true">✦</div>
      <h1 className="font-serif text-3xl text-foreground mb-3">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-8">
        We hit an unexpected error. You can try again, or head back to the start of your quest.
      </p>
      {error.digest && (
        <p className="text-xs text-text-dim mb-6">
          Error ID:
          {' '}
          <code>{error.digest}</code>
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={reset}
          className="px-7 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow-md)] hover:-translate-y-0.5 transition-all"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-border-hover transition-all no-underline text-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
