import Image from 'next/image'
import type { ProfileImageEntry } from '@/app/_data/profileImages'

interface IllustratedTraitCardProps {
  entry: ProfileImageEntry
  rank: 1 | 2 | 3
}

/**
 * Shared card for both Work Values and Environment sections.
 * Shows a square illustrated image on top and a short label + descriptor below.
 */
export function IllustratedTraitCard({ entry, rank }: IllustratedTraitCardProps) {
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-surface/60">
      <div className="relative aspect-square">
        <Image
          src={`/profile/images/${entry.filename}`}
          alt={`${entry.shortLabel} — ${entry.description}`}
          fill
          sizes="(max-width: 640px) 100vw, 300px"
          className="object-cover"
        />
        <span className="absolute top-2 right-3 text-[10px] font-bold text-primary-soft bg-background/70 rounded-full px-2 py-0.5 backdrop-blur-sm">
          #
          {rank}
        </span>
      </div>
      <div className="p-4">
        <div className="text-sm font-bold text-primary-soft mb-0.5">
          {entry.shortLabel}
        </div>
        <div className="text-xs text-muted-foreground leading-snug">
          {entry.description}
        </div>
      </div>
    </div>
  )
}
