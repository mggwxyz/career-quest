'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  q: string
  riasec: string[]
  zone: number[]
  bright: boolean
}

const RIASEC_OPTIONS = [
  { code: 'R', name: 'Realistic' },
  { code: 'I', name: 'Investigative' },
  { code: 'A', name: 'Artistic' },
  { code: 'S', name: 'Social' },
  { code: 'E', name: 'Enterprising' },
  { code: 'C', name: 'Conventional' },
]

const EDUCATION_OPTIONS: Array<{ label: string, zones: number[] }> = [
  { label: 'HS or less', zones: [1] },
  { label: 'Some college', zones: [2, 3] },
  { label: 'Bachelor\'s', zones: [4] },
  { label: 'Advanced', zones: [5] },
]

export function ExploreFilters({ q, riasec, zone, bright }: Props) {
  const router = useRouter()
  const currentParams = useSearchParams()

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(currentParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    next.delete('page') // reset pagination on filter change
    router.push(`/careers/explore?${next.toString()}`)
  }

  const toggleRiasec = (code: string) => {
    const set = new Set(riasec)
    if (set.has(code)) set.delete(code)
    else set.add(code)
    updateParams({ riasec: [...set].join(',') || null })
  }

  const toggleZoneGroup = (zones: number[]) => {
    const set = new Set(zone)
    const allSelected = zones.every(z => set.has(z))
    for (const z of zones) {
      if (allSelected) set.delete(z)
      else set.add(z)
    }
    updateParams({ zone: [...set].sort().join(',') || null })
  }

  const toggleBright = () => updateParams({ bright: bright ? null : '1' })

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement
        updateParams({ q: input.value.trim() || null })
      }}
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search 1,000+ careers by title or keyword…"
          className="w-full rounded-full border-2 border-primary/40 bg-surface/50 px-5 py-3 text-sm focus:outline-none focus:border-primary"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground mr-1">Interest</span>
        {RIASEC_OPTIONS.map((opt) => {
          const active = riasec.includes(opt.code)
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => toggleRiasec(opt.code)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${active ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-border-hover'}`}
            >
              {opt.code}
              {' '}
              ·
              {' '}
              {opt.name}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground mr-1">Education</span>
        {EDUCATION_OPTIONS.map((opt) => {
          const active = opt.zones.every(z => zone.includes(z))
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => toggleZoneGroup(opt.zones)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${active ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-border-hover'}`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground mr-1">Outlook</span>
        <button
          type="button"
          onClick={toggleBright}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${bright ? 'bg-green-500 text-white border-green-500' : 'border-border text-muted-foreground hover:border-border-hover'}`}
        >
          ✦ Bright outlook
        </button>
      </div>
    </div>
  )
}
