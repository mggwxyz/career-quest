import type { RiasecScale } from '@/lib/assessment'
import { RIASEC_THEME } from '@/app/_data/riasecTheme'

export default function HollandCodeBanner({ code }: { code: string }) {
  const letters = code.split('') as RiasecScale[]
  const labels = letters.map(l => RIASEC_THEME[l]?.label ?? l)

  return (
    <section className="py-5 sm:py-6 mb-4 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-[4px] mb-3">
        Your Holland Code
      </div>
      <div
        className="font-serif leading-none flex items-center justify-center gap-1 sm:gap-2 mb-3"
        aria-label={`Holland code ${code}`}
      >
        {letters.map((letter, i) => (
          <span
            key={`${letter}-${i}`}
            className="text-7xl sm:text-8xl md:text-9xl text-foreground"
          >
            {letter}
          </span>
        ))}
      </div>
      <div className="font-serif italic text-lg sm:text-xl md:text-2xl text-muted-foreground">
        {labels.map((label, i) => (
          <span key={`${label}-${i}`}>
            {label}
            {i < labels.length - 1 && <span className="mx-3 opacity-60">·</span>}
          </span>
        ))}
      </div>
    </section>
  )
}
