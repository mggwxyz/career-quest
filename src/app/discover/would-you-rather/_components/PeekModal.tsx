'use client'
import { useEffect } from 'react'
import { confidenceBand, Posterior, RIASEC_SCALES } from '@/lib/assessment'

const LABELS: Record<string, string> = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
}

export default function PeekModal({ posterior, onClose }: { posterior: Posterior | null, onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="peek-modal-title" className="w-[min(92vw,420px)] rounded-2xl border border-border bg-surface p-6" onClick={e => e.stopPropagation()}>
        <h2 id="peek-modal-title" className="font-serif text-xl text-foreground mb-1">Your profile so far</h2>
        <p className="text-xs text-muted-foreground mb-4">Still forming — keep answering for a sharper picture.</p>
        {posterior === null
          ? <p className="text-sm text-muted-foreground">Loading…</p>
          : (
            <ul className="space-y-2">
              {RIASEC_SCALES.map((code) => {
                const { mean, variance } = posterior.riasec[code]
                const pct = Math.max(0, Math.min(100, ((mean + 2) / 4) * 100))
                const band = confidenceBand(variance)
                return (
                  <li key={code} className="flex items-center gap-3">
                    <span className="w-4 text-xs font-semibold text-foreground">{code}</span>
                    <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">{LABELS[code]}</span>
                    <span className="w-24 h-1 bg-primary/10 rounded-full overflow-hidden">
                      <span className="block h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-12 text-right text-[10px] uppercase tracking-wider text-muted-foreground">{band}</span>
                  </li>
                )
              })}
            </ul>
          )}
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-6 w-full px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all"
        >
          Keep going →
        </button>
      </div>
    </div>
  )
}
