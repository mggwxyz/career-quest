import { Target, TrendingUp } from 'lucide-react'
import type { CareerDetail } from '@/lib/onet/schemas'
import type { OccupationRow } from '@/lib/onet/occupations'
import { JOB_ZONE_NAMES } from '@/lib/onet/projectors'

interface Props {
  occupation: OccupationRow
  detail: CareerDetail | null
  whyItMatches: string | null
}

function formatSalary(occupation: OccupationRow, detail: CareerDetail | null): string {
  const annual = detail?.salaryAnnualMedian ?? occupation.salaryAnnualMedian
  if (typeof annual === 'number') return `$${annual.toLocaleString('en-US')}`
  const hourly = detail?.salaryHourlyMedian ?? occupation.salaryHourlyMedian
  if (typeof hourly === 'number') return `$${hourly.toLocaleString('en-US')}/hr`
  return 'varies'
}

const pillClass = 'text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground'

export function CareerDetailsHeader({ occupation, detail, whyItMatches }: Props) {
  const salary = formatSalary(occupation, detail)
  const outlookDescription = detail?.outlookDescription ?? null

  return (
    <header className="py-6 px-6 bg-surface/50 border border-border rounded-2xl">
      <h1 className="font-serif text-2xl lg:text-3xl text-foreground mb-2">{occupation.title}</h1>

      {occupation.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
          {occupation.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {occupation.riasecAll.length > 0 && (
          <span className={pillClass}>{occupation.riasecAll.join(' · ')}</span>
        )}
        {occupation.brightOutlook && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-400 text-black font-medium">
            Bright Outlook
          </span>
        )}
        {outlookDescription && (
          <span className={pillClass}>{outlookDescription}</span>
        )}
        <span className={`${pillClass} inline-flex items-center gap-1`}>
          <TrendingUp className="w-3 h-3 text-green-400" />
          {`Median ${salary}`}
        </span>
        <span className={pillClass}>{`Job Zone ${occupation.jobZone} · ${JOB_ZONE_NAMES[occupation.jobZone]}`}</span>
      </div>

      {whyItMatches && (
        <div className="mt-4 p-4 rounded-xl border border-primary-soft/30 bg-primary-soft/10">
          <h2 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-soft" />
            Why it fits you
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{whyItMatches}</p>
        </div>
      )}
    </header>
  )
}
