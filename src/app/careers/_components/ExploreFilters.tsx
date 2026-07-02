'use client'

import {
  createParser,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs'
import { useEffect, useRef, useState } from 'react'

const RIASEC_OPTIONS = [
  { code: 'R', name: 'Realistic' },
  { code: 'I', name: 'Investigative' },
  { code: 'A', name: 'Artistic' },
  { code: 'S', name: 'Social' },
  { code: 'E', name: 'Enterprising' },
  { code: 'C', name: 'Conventional' },
]

const EDUCATION_OPTIONS: Array<{ label: string, zones: number[] }> = [
  { label: 'HS', zones: [1] },
  { label: 'Some college', zones: [2, 3] },
  { label: 'Bachelor\'s', zones: [4] },
  { label: 'Advanced', zones: [5] },
]

// Preserve legacy URL format: present as `=1`, absent when false.
const parseAsNumericFlag = createParser<boolean>({
  parse: v => v === '1',
  serialize: v => (v ? '1' : ''),
  eq: (a, b) => a === b,
})

const filterParsers = {
  q: parseAsString.withDefault(''),
  riasec: parseAsArrayOf(parseAsString).withDefault([]),
  zone: parseAsArrayOf(parseAsInteger).withDefault([]),
  bright: parseAsNumericFlag.withDefault(false),
  chat: parseAsNumericFlag.withDefault(false),
  matches: parseAsNumericFlag.withDefault(false),
  page: parseAsInteger,
}

export function ExploreFilters() {
  const [filters, setFilters] = useQueryStates(filterParsers, {
    shallow: false,
    history: 'replace',
    clearOnDefault: true,
  })

  const { q, riasec, zone, bright, chat, matches } = filters

  // Local mirror for the search input so we can debounce URL writes.
  const [searchValue, setSearchValue] = useState(q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextSync = useRef(false)

  // Keep local state in sync when q changes externally (e.g. clear filters link).
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false
      return
    }
    setSearchValue(q)
  }, [q])

  const onSearchChange = (next: string) => {
    setSearchValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const trimmed = next.trim()
      if (trimmed === q) return
      skipNextSync.current = true
      setFilters({ q: trimmed, page: null })
    }, 350)
  }

  // Enter applies the search immediately instead of waiting out the debounce.
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = searchValue.trim()
    if (trimmed === q) return
    skipNextSync.current = true
    setFilters({ q: trimmed, page: null })
  }

  const toggleRiasec = (code: string) => {
    const set = new Set(riasec)
    if (set.has(code)) set.delete(code)
    else set.add(code)
    setFilters({ riasec: [...set], page: null })
  }

  const toggleZoneGroup = (zones: number[]) => {
    const set = new Set(zone)
    const allSelected = zones.every(z => set.has(z))
    for (const z of zones) {
      if (allSelected) set.delete(z)
      else set.add(z)
    }
    setFilters({ zone: [...set].sort((a, b) => a - b), page: null })
  }

  const toggleBright = () => setFilters({ bright: !bright, page: null })
  const toggleChatReady = () => setFilters({ chat: !chat, page: null })
  const toggleMatches = () => setFilters({ matches: !matches, page: null })

  const chip = 'text-[11px] leading-none px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer whitespace-nowrap'
  const chipIdle = 'border-border/70 bg-transparent text-muted-foreground hover:border-border-hover hover:text-foreground'
  const chipActive = 'border-primary/60 bg-primary/15 text-foreground'
  const groupLabel = 'text-[10px] uppercase tracking-wider text-muted-foreground mr-0.5 select-none'

  return (
    <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-border bg-surface/30 px-4 py-3 backdrop-blur-sm md:grid-cols-2">
      {/* Top-left: Search */}
      <div className="min-w-0">
        <span className={`${groupLabel} block mb-1.5`}>Search careers</span>
        {/* Native GET form: search still works via Enter before React hydrates. */}
        <form action="/careers" method="get" onSubmit={onSearchSubmit} className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            name="q"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search careers…"
            className="w-full rounded-full border border-border/70 bg-background/50 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:bg-background transition-colors"
          />
        </form>
      </div>

      {/* Top-right: Interest */}
      <div className="min-w-0">
        <span className={`${groupLabel} block mb-1.5`}>Interest</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {RIASEC_OPTIONS.map((opt) => {
            const active = riasec.includes(opt.code)
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => toggleRiasec(opt.code)}
                aria-pressed={active}
                title={opt.name}
                className={`${chip} font-semibold ${active ? chipActive : chipIdle}`}
              >
                {opt.code}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom-left: Highlights (matches, bright, chat-ready) */}
      <div className="min-w-0">
        <span className={`${groupLabel} block mb-1.5`}>Highlights</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMatches}
            aria-pressed={matches}
            className={`${chip} ${matches ? chipActive : chipIdle}`}
          >
            ⭐ Matches
          </button>
          <button
            type="button"
            onClick={toggleBright}
            aria-pressed={bright}
            className={
              bright
                ? `${chip} border-green-500/50 bg-green-400 font-medium text-black`
                : `${chip} ${chipIdle}`
            }
          >
            ✦ Bright
          </button>
          <button
            type="button"
            onClick={toggleChatReady}
            aria-pressed={chat}
            className={`${chip} ${chat ? chipActive : chipIdle}`}
          >
            💬 Chat-ready
          </button>
        </div>
      </div>

      {/* Bottom-right: Education */}
      <div className="min-w-0">
        <span className={`${groupLabel} block mb-1.5`}>Education</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {EDUCATION_OPTIONS.map((opt) => {
            const active = opt.zones.every(z => zone.includes(z))
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => toggleZoneGroup(opt.zones)}
                aria-pressed={active}
                className={`${chip} ${active ? chipActive : chipIdle}`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
