import type { AssessmentResult, RiasecScale } from '@/lib/assessment'
import { RIASEC_THEME } from '@/app/_data/riasecTheme'

export default function HollandCodeHero({ result }: { result: AssessmentResult }) {
  const letters = result.hollandCode.split('') as RiasecScale[]
  return (
    <section className="text-center mb-10">
      <div className="text-xs text-muted-foreground uppercase tracking-[2px] mb-2">Your Holland Code</div>
      <h1 className="font-serif text-5xl sm:text-6xl text-foreground mb-6">{result.hollandCode}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {letters.map((code, i) => {
          const theme = RIASEC_THEME[code]
          const r = result.riasec[code]
          return (
            <div
              key={code}
              className="rounded-2xl border border-border bg-surface/60 p-4 flex flex-col items-center"
            >
              <div
                className="text-4xl font-serif mb-1"
                style={{ color: theme?.colorHex ?? 'inherit' }}
              >
                {code}
              </div>
              <div className="text-sm font-semibold text-foreground">{theme?.label ?? code}</div>
              <div className="text-xs text-muted-foreground">{`Rank #${i + 1}`}</div>
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
    </section>
  )
}
