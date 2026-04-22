import type { AssessmentResult, WorkValueScale } from '@/lib/assessment'
import { ConfidenceDots } from './ConfidenceLevelHint'

const LABELS: Record<WorkValueScale, string> = {
  ACH: 'Achievement',
  IND: 'Independence',
  REC: 'Recognition',
  REL: 'Relationships',
  SUP: 'Support',
  WC: 'Working Conditions',
}

export default function WorkValuesPills({ result }: { result: AssessmentResult }) {
  if (result.workValues.suppressed) {
    return (
      <section>
        <h2 className="font-serif text-lg text-foreground mb-2">What You Value</h2>
        <p className="text-sm text-muted-foreground">
          Work values are tentative at your age &mdash; they tend to change a lot. We&apos;ll check in again later.
        </p>
      </section>
    )
  }
  if (result.workValues.top.length === 0) {
    return (
      <section>
        <h2 className="font-serif text-lg text-foreground mb-2">What You Value</h2>
        <p className="text-sm text-muted-foreground">No clear standout values yet.</p>
      </section>
    )
  }
  return (
    <section>
      <h2 className="font-serif text-lg text-foreground mb-3">What You Value</h2>
      <div className="flex flex-wrap gap-2">
        {result.workValues.top.map((code) => {
          const entry = result.workValues.all[code]
          const sr = `${LABELS[code]}, ${entry.confidence} confidence`
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-surface/60 text-xs text-foreground"
              title={sr}
            >
              <span className="sr-only">{sr}</span>
              <span className="inline-flex items-center gap-1.5" aria-hidden>
                <span>{LABELS[code]}</span>
                <ConfidenceDots level={entry.confidence} presentational />
              </span>
            </span>
          )
        })}
      </div>
    </section>
  )
}
