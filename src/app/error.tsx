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
          className="px-7 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 transition-all"
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
