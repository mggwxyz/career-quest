import type { Confidence } from '@/lib/assessment'
import { cn } from '@/lib/utils'

export const CONFIDENCE_PHRASE: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Lower confidence',
}

/**
 * Filled dots: more filled segments = higher confidence.
 * Use `presentational` when a parent already exposes the level (e.g. chip `sr-only`, slider `aria-label`).
 */
export function ConfidenceDots({
  level,
  testId,
  presentational,
}: {
  level: Confidence
  testId?: string
  presentational?: boolean
}) {
  const active = level === 'high' ? 3 : level === 'medium' ? 2 : 1
  const label = CONFIDENCE_PHRASE[level]
  return (
    <span
      data-testid={testId}
      className="inline-flex gap-0.5 items-center shrink-0"
      title={presentational ? undefined : label}
    >
      {!presentational && <span className="sr-only">{label}</span>}
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < active ? 'bg-primary/75' : 'bg-muted-foreground/25'}`}
          aria-hidden
        />
      ))}
    </span>
  )
}

const LEGEND_STEPS: { level: Confidence, label: string }[] = [
  { level: 'high', label: 'High' },
  { level: 'medium', label: 'Med' },
  { level: 'low', label: 'Low' },
]

/**
 * Explains the dot pattern used on trait cards, value chips, and work style rows.
 */
export function ConfidenceDotsLegend({ className }: { className?: string }) {
  return (
    <p className={cn('text-[10px] text-muted-foreground leading-relaxed', className)}>
      <span className="sr-only">
        Dots show confidence on trait cards, what you value chips, and below each work style slider. Three
        filled dots is high, two is medium, one is low.
      </span>
      <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5" aria-hidden>
        <span className="shrink-0 text-muted-foreground/90">Confidence</span>
        {LEGEND_STEPS.map(({ level, label }) => (
          <span key={level} className="inline-flex items-center gap-1.5">
            <ConfidenceDots level={level} />
            <span className="tabular-nums text-muted-foreground/90">{label}</span>
          </span>
        ))}
      </span>
    </p>
  )
}
