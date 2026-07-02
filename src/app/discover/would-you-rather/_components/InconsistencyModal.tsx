'use client'

import { useEffect } from 'react'

export default function InconsistencyModal({
  onDismiss, onRetake,
}: { onDismiss: () => void, onRetake: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="inconsistency-modal-title" className="w-[min(92vw,420px)] rounded-2xl border border-border bg-surface p-6 text-center">
        <h2 id="inconsistency-modal-title" className="font-serif text-xl text-foreground mb-2">Want to revisit a few?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          A few of your answers seemed to pull in different directions. That&apos;s OK &mdash; want to take another quick pass, or just see what we&apos;ve got?
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            autoFocus
            onClick={onRetake}
            className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold"
          >
            Review answers
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-6 py-2.5 rounded-full border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all text-sm"
          >
            See my results anyway
          </button>
        </div>
      </div>
    </div>
  )
}
