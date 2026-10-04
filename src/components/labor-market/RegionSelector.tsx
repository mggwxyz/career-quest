'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { MapPin } from 'lucide-react'
import { toast } from 'sonner'
import type { LaborMarketRegion } from '@/lib/labor-market/types'

interface Props {
  regions: LaborMarketRegion[]
  selectedRegionId: string
  className?: string
}

const TYPE_LABELS: Record<string, string> = {
  national: 'National',
  state: 'States',
  metro: 'Metro areas',
  nonmetro: 'Nonmetro areas',
}

export function RegionSelector({ regions, selectedRegionId, className = '' }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(selectedRegionId)
  const [isPending, startTransition] = useTransition()

  const byType = regions.reduce<Record<string, LaborMarketRegion[]>>((acc, region) => {
    const list = acc[region.type] ?? []
    list.push(region)
    acc[region.type] = list
    return acc
  }, {})

  const onChange = (nextRegionId: string) => {
    setValue(nextRegionId)
    startTransition(async () => {
      const response = await fetch('/api/user/labor-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId: nextRegionId }),
      })
      if (!response.ok) {
        setValue(selectedRegionId)
        const body = await response.json().catch(() => ({})) as { error?: string }
        toast.error(body.error ?? 'Could not save labor-market region')
        return
      }
      router.refresh()
    })
  }

  return (
    <label className={`inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs text-muted-foreground ${className}`}>
      <MapPin className="h-4 w-4 shrink-0 text-primary-soft" aria-hidden="true" />
      <span className="shrink-0 font-medium text-foreground">Region</span>
      <select
        value={value}
        disabled={isPending}
        onChange={event => onChange(event.target.value)}
        className="min-w-0 max-w-[18rem] rounded-md border border-border/70 bg-background/70 px-2 py-1 text-xs text-foreground outline-none focus:border-primary/70 disabled:opacity-60"
      >
        {Object.entries(TYPE_LABELS).map(([type, label]) => {
          const options = (byType[type] ?? []).sort((a, b) => a.name.localeCompare(b.name))
          if (options.length === 0) return null
          return (
            <optgroup key={type} label={label}>
              {options.map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </label>
  )
}
