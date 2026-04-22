import type { ReactNode } from 'react'
import type { AssessmentResult, RiasecScale } from '@/lib/assessment'
import { RIASEC_THEME } from '@/app/_data/riasecTheme'
import { ConfidenceDots } from './ConfidenceLevelHint'

function formatDescription(d: string | undefined): string {
  if (!d) return ''
  const capped = d[0].toUpperCase() + d.slice(1)
  return capped.endsWith('.') ? capped : `${capped}.`
}

export default function HollandCodeHero({ result, children }: { result: AssessmentResult, children?: ReactNode }) {
  const letters = result.hollandCode.split('') as RiasecScale[]
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-6 flex flex-col">
      <h2 className="text-xs text-muted-foreground uppercase tracking-[2px] mb-4">
        Your Dominant Traits
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {letters.map((code, i) => {
          const theme = RIASEC_THEME[code]
          const r = result.riasec[code]
          const isTop = i === 0
          return (
            <div
              key={code}
              className={`rounded-xl border border-border p-4 flex flex-col h-full ${isTop ? 'bg-primary/5' : 'bg-background/40'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={`text-5xl font-serif leading-none ${isTop ? 'text-primary' : 'text-foreground'}`}>
                  {code}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums shrink-0">{`#${i + 1}`}</div>
              </div>
              <div className="text-sm font-semibold text-foreground leading-tight mb-1">
                {theme?.label ?? code}
              </div>
              <div className="text-xs text-muted-foreground leading-snug">
                {formatDescription(theme?.description)}
              </div>
              <div className="mt-auto pt-3 flex justify-start">
                <ConfidenceDots level={r.confidence} testId="confidence-badge" />
              </div>
            </div>
          )
        })}
      </div>
      {children && <div className="mt-5 pt-5 border-t border-border space-y-5">{children}</div>}
    </section>
  )
}
