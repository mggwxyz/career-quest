import type { AssessmentResult, WorkValueScale } from '@/lib/assessment'

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
      <h2 className="font-serif text-lg text-foreground mb-1">What You Value</h2>
      <p className="text-xs text-muted-foreground mb-4">Top motivators</p>
      <div className="flex flex-wrap gap-2">
        {result.workValues.top.map((code) => {
          const entry = result.workValues.all[code]
          return (
            <span
              key={code}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface/60 text-sm text-foreground"
            >
              <span>{LABELS[code]}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {entry.confidence}
              </span>
            </span>
          )
        })}
      </div>
    </section>
  )
}
