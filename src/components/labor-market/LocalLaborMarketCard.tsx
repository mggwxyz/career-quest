import { BadgeDollarSign, BriefcaseBusiness, GraduationCap, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LaborMarketSummary } from '@/lib/labor-market/types'
import { cn } from '@/lib/utils'

interface Props {
  summary: LaborMarketSummary
  compact?: boolean
  className?: string
}

function formatAnnual(value: number | null): string {
  return value == null ? 'No wage data' : `$${value.toLocaleString('en-US')}/yr`
}

function formatHourly(cents: number | null): string {
  if (cents == null) return ''
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hr`
}

function formatEmployment(value: number | null): string {
  return value == null ? 'No employment data' : value.toLocaleString('en-US')
}

function sourceLine(summary: LaborMarketSummary): string {
  const source = summary.source ?? 'No cached source'
  const year = summary.dataYear ? ` ${summary.dataYear}` : ''
  const region = summary.resolvedRegion?.name ?? summary.selectedRegion.name
  return `${source}${year} · ${region}`
}

function fallbackLabel(summary: LaborMarketSummary): string | null {
  if (summary.fallbackLevel === 'state-fallback') return 'State fallback'
  if (summary.fallbackLevel === 'national-fallback') return 'National fallback'
  if (summary.fallbackLevel === 'onet-national-fallback') return 'O*NET fallback'
  if (summary.fallbackLevel === 'missing') return 'Missing data'
  return null
}

function jobAvailabilityLabel(summary: LaborMarketSummary): string {
  const job = summary.jobAvailability
  if (!job) return 'No cached snapshot'
  if (job.activePostings != null) return `${job.activePostings.toLocaleString('en-US')} active postings`
  if (job.annualOpenings != null) return `${job.annualOpenings.toLocaleString('en-US')} annual openings`
  return 'Cached snapshot'
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-background/25 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="truncate text-sm font-semibold text-foreground">{value}</div>
      {detail && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</div>}
    </div>
  )
}

export function LocalLaborMarketCard({ summary, compact = false, className }: Props) {
  const fallback = fallbackLabel(summary)
  const hourly = formatHourly(summary.hourlyMedianWageCents)
  const trainingCount = summary.trainingOptions.length
  const trainingRegion = summary.trainingRegion?.name
  const jobRegion = summary.jobAvailabilityRegion?.name

  return (
    <section className={cn('rounded-xl border border-border bg-surface/35 p-4', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>Local labor market</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{sourceLine(summary)}</p>
        </div>
        {fallback && (
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">
            {fallback}
          </span>
        )}
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
        <Metric
          icon={BadgeDollarSign}
          label="Median wage"
          value={formatAnnual(summary.annualMedianWage)}
          detail={hourly || undefined}
        />
        <Metric
          icon={UsersRound}
          label="Employment"
          value={formatEmployment(summary.employment)}
          detail={summary.employmentRseTenths != null ? `RSE ${(summary.employmentRseTenths / 10).toFixed(1)}%` : undefined}
        />
        <Metric
          icon={GraduationCap}
          label="Training"
          value={trainingCount > 0 ? `${trainingCount} cached option${trainingCount === 1 ? '' : 's'}` : 'No cached options'}
          detail={trainingRegion}
        />
        <Metric
          icon={BriefcaseBusiness}
          label="Jobs"
          value={jobAvailabilityLabel(summary)}
          detail={jobRegion}
        />
      </div>

      {!compact && summary.trainingOptions.length > 0 && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <h3 className="mb-1.5 text-xs font-semibold text-foreground">Training options</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {summary.trainingOptions.slice(0, 3).map(option => (
              <li key={`${option.regionId}-${option.providerName}-${option.programName}`} className="truncate">
                <span className="text-foreground">{option.programName}</span>
                {' · '}
                {option.providerName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export function LocalLaborMarketInline({ summary, className }: { summary: LaborMarketSummary, className?: string }) {
  const fallback = fallbackLabel(summary)
  const wage = summary.annualMedianWage != null
    ? formatAnnual(summary.annualMedianWage)
    : formatHourly(summary.hourlyMedianWageCents) || 'No wage data'

  return (
    <div className={cn('border-t border-border/60 pt-3 text-xs', className)}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-muted-foreground">
        <span className="font-medium text-foreground">Local market</span>
        <span>{sourceLine(summary)}</span>
        {fallback && (
          <span className="rounded-full border border-amber-400/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-200">
            {fallback}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-4">
        <span>
          <span className="text-foreground">Wage:</span>
          {' '}
          {wage}
        </span>
        <span>
          <span className="text-foreground">Employment:</span>
          {' '}
          {formatEmployment(summary.employment)}
        </span>
        <span>
          <span className="text-foreground">Training:</span>
          {' '}
          {summary.trainingOptions.length || 'None cached'}
        </span>
        <span>
          <span className="text-foreground">Jobs:</span>
          {' '}
          {summary.jobAvailability?.activePostings?.toLocaleString('en-US') ?? 'None cached'}
        </span>
      </div>
    </div>
  )
}
