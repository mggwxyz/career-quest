// src/app/discover/profile/_components/TraitHeroCard.tsx
import { getRiasecTheme } from '@/app/_data/riasecTheme'

interface TraitHeroCardProps {
  code: string
  rank: 1 | 2 | 3
  count: number
  maxCount: number
}

/**
 * Headline card showing one of the user's top 3 RIASEC traits.
 * Renders nothing for unknown codes (should never happen with valid data).
 */
export function TraitHeroCard({ code, rank, count, maxCount }: TraitHeroCardProps) {
  const theme = getRiasecTheme(code)
  if (!theme) return null

  const pct = Math.round((count / Math.max(maxCount, 1)) * 100)

  return (
    <div
      role="img"
      aria-label={`Rank ${rank}: ${theme.label} — ${theme.description} (${pct}%)`}
      className="relative p-4 sm:p-5 rounded-2xl border text-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.colorHex}26, ${theme.colorHex}0d)`,
        borderColor: `${theme.colorHex}59`,
      }}
    >
      <span
        className="absolute top-3 right-4 text-[10px] font-bold"
        style={{ color: theme.colorHex }}
      >
        #
        {rank}
      </span>
      <div
        className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: `${theme.colorHex}33` }}
      >
        {theme.icon}
      </div>
      <div
        className="text-sm font-bold mb-0.5"
        style={{ color: theme.colorHex }}
      >
        {theme.label}
      </div>
      <div className="text-xs text-muted-foreground leading-snug min-h-[2.2em]">
        {theme.description}
      </div>
      <div
        className="mt-3 text-xl font-bold"
        style={{ color: theme.colorHex }}
      >
        {pct}
        %
      </div>
    </div>
  )
}
