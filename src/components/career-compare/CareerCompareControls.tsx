'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Plus,
  Scale,
  X,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { COMPARE_MAX, COMPARE_MIN } from '@/lib/career/compare'

const STORAGE_KEY = 'career-quest:career-compare'

export interface CompareSelectionCareer {
  code: string
  title: string
  slug?: string | null
}

interface CompareSelectionContextValue {
  selected: CompareSelectionCareer[]
  selectedCodes: Set<string>
  isSelected: (code: string) => boolean
  isFull: boolean
  toggle: (career: CompareSelectionCareer) => void
  remove: (code: string) => void
  clear: () => void
}

const CompareSelectionContext = createContext<CompareSelectionContextValue | null>(null)

export function CareerCompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<CompareSelectionCareer[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as CompareSelectionCareer[]
          if (Array.isArray(parsed)) {
            setSelected(normalizeSelection(parsed))
          }
        }
      }
      catch {
        setSelected([])
      }
      finally {
        setLoaded(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selected))
    }
    catch {
      // Compare is still usable for the current page even when storage is blocked.
    }
  }, [loaded, selected])

  const selectedCodes = useMemo(
    () => new Set(selected.map(career => career.code)),
    [selected],
  )

  const remove = useCallback((code: string) => {
    setSelected(current => current.filter(career => career.code !== code))
  }, [])

  const clear = useCallback(() => {
    setSelected([])
  }, [])

  const toggle = useCallback((career: CompareSelectionCareer) => {
    setSelected((current) => {
      if (current.some(item => item.code === career.code)) {
        return current.filter(item => item.code !== career.code)
      }
      if (current.length >= COMPARE_MAX) {
        return current
      }
      return normalizeSelection([...current, career])
    })
  }, [])

  const value = useMemo<CompareSelectionContextValue>(() => ({
    selected,
    selectedCodes,
    isSelected: code => selectedCodes.has(code),
    isFull: selected.length >= COMPARE_MAX,
    toggle,
    remove,
    clear,
  }), [clear, remove, selected, selectedCodes, toggle])

  return (
    <CompareSelectionContext.Provider value={value}>
      {children}
    </CompareSelectionContext.Provider>
  )
}

export function CompareToggleButton({
  career,
  className = '',
}: {
  career: CompareSelectionCareer
  className?: string
}) {
  const compare = useCareerCompare()
  const selected = compare.isSelected(career.code)
  const disabled = !selected && compare.isFull
  const label = selected
    ? `Remove ${career.title} from compare`
    : disabled
      ? 'Compare list is full'
      : `Add ${career.title} to compare`

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        compare.toggle(career)
      }}
      className={[
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
        selected
          ? 'border-primary/70 bg-primary text-primary-foreground'
          : 'border-border bg-background/40 text-muted-foreground hover:border-border-hover hover:text-foreground',
        disabled ? 'cursor-not-allowed opacity-50 hover:border-border hover:text-muted-foreground' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      <span>{selected ? 'Added' : 'Compare'}</span>
    </button>
  )
}

export function CareerCompareTray() {
  const compare = useCareerCompare()
  if (compare.selected.length === 0) return null

  const canCompare = compare.selected.length >= COMPARE_MIN
  const ids = compare.selected.map(career => career.code).join(',')

  return (
    <aside
      aria-label="Selected careers to compare"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-border bg-surface/95 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[1.5px] text-muted-foreground">
            <Scale className="h-3.5 w-3.5 text-primary-soft" />
            Compare
            <span className="text-foreground">
              {compare.selected.length}
              /
              {COMPARE_MAX}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {compare.selected.map(career => (
              <span
                key={career.code}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/80 bg-background/50 px-2.5 py-1 text-xs text-foreground"
              >
                <span className="min-w-0 truncate">{career.title}</span>
                <button
                  type="button"
                  aria-label={`Remove ${career.title}`}
                  onClick={() => compare.remove(career.code)}
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={compare.clear}
            className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground"
          >
            Clear
          </button>
          {canCompare
            ? (
              <Link
                href={`/careers/compare?ids=${encodeURIComponent(ids)}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground no-underline transition-colors hover:bg-primary-soft"
              >
                Open compare
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )
            : (
              <span className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">
                Add
                {' '}
                {COMPARE_MIN - compare.selected.length}
                {' '}
                more
              </span>
            )}
        </div>
      </div>
    </aside>
  )
}

function useCareerCompare(): CompareSelectionContextValue {
  const value = useContext(CompareSelectionContext)
  if (!value) {
    throw new Error('Career compare controls must be rendered inside CareerCompareProvider')
  }
  return value
}

function normalizeSelection(careers: CompareSelectionCareer[]): CompareSelectionCareer[] {
  const seen = new Set<string>()
  const normalized: CompareSelectionCareer[] = []

  for (const career of careers) {
    if (!career?.code || !career.title || seen.has(career.code)) continue
    seen.add(career.code)
    normalized.push({
      code: career.code,
      title: career.title,
      slug: career.slug ?? null,
    })
    if (normalized.length === COMPARE_MAX) break
  }

  return normalized
}
