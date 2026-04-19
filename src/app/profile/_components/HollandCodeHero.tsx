import type { ReactNode } from 'react'
import type { AssessmentResult, RiasecScale } from '@/lib/assessment'
import { RIASEC_THEME } from '@/app/_data/riasecTheme'

export default function HollandCodeHero({ result, children }: { result: AssessmentResult, children?: ReactNode }) {
  const letters = result.hollandCode.split('') as RiasecScale[]
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-6 flex flex-col">
      <div className="grid grid-cols-3 gap-2">
        {letters.map((code, i) => {
          const theme = RIASEC_THEME[code]
          const r = result.riasec[code]
          return (
            <div
              key={code}
              className="rounded-xl border border-border bg-background/40 p-3 flex flex-col items-center"
            >
              <div
                className="text-3xl font-serif leading-none mb-1"
                style={{ color: theme?.colorHex ?? 'inherit' }}
              >
                {code}
              </div>
              <div className="text-[13px] font-semibold text-foreground text-center leading-tight">{theme?.label ?? code}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{`#${i + 1}`}</div>
              <div
                data-testid="confidence-badge"
                className="mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground"
              >
                {r.confidence}
              </div>
            </div>
          )
        })}
      </div>
      {children && <div className="mt-5 pt-5 border-t border-border space-y-5">{children}</div>}
    </section>
  )
}
