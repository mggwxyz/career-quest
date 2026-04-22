import Link from 'next/link'
import { ExternalLink, TrendingUp, Target, GraduationCap, Wrench } from 'lucide-react'
import type { CareerDetail } from '@/lib/onet/schemas'
import type { OccupationRow } from '@/lib/onet/occupations'
import { JOB_ZONE_NAMES, JOB_ZONE_DESCRIPTIONS } from '@/lib/onet/projectors'

interface RelatedCareer {
  code: string
  title: string
  slug: string | null
}

interface Props {
  occupation: OccupationRow
  detail: CareerDetail | null
  whyItMatches: string | null
  relatedCareers: RelatedCareer[]
}

function formatSalary(detail: CareerDetail): string {
  if (typeof detail.salaryAnnualMedian === 'number') {
    return `$${detail.salaryAnnualMedian.toLocaleString('en-US')}`
  }
  if (typeof detail.salaryHourlyMedian === 'number') {
    return `$${detail.salaryHourlyMedian.toLocaleString('en-US')}/hr`
  }
  return 'varies'
}

export function CareerDetailsPanel({ occupation, detail, whyItMatches, relatedCareers }: Props) {
  const tasks = detail?.tasks.slice(0, 5) ?? []
  const skills = detail?.skills.slice(0, 10) ?? []
  const knowledge = detail?.knowledge.slice(0, 5) ?? []
  const tech = detail?.technology.slice(0, 8) ?? []
  const related = relatedCareers.slice(0, 6)
  const salary = detail ? formatSalary(detail) : 'varies'

  return (
    <div className="p-6 bg-surface/50 border border-border rounded-2xl">
      <h2 className="font-serif text-xl text-foreground mb-1">{occupation.title}</h2>
      <div className="text-xs text-muted-foreground mb-5 flex flex-wrap gap-2">
        <span>{`Job Zone ${occupation.jobZone} · ${JOB_ZONE_NAMES[occupation.jobZone]}`}</span>
        {occupation.brightOutlook && <span className="px-2 py-0.5 rounded-full bg-green-400 text-black font-medium">Bright Outlook</span>}
        <span>{occupation.riasecAll.join(' · ')}</span>
      </div>

      <div className="space-y-5">
        {occupation.description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{occupation.description}</p>
          </div>
        )}

        {whyItMatches && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-soft" />
              Why it fits you
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{whyItMatches}</p>
          </div>
        )}

        {tasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">What they do</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              {tasks.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Skills</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{skills.join(' · ')}</p>
          </div>
        )}

        {knowledge.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Knowledge areas</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{knowledge.join(' · ')}</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-accent" />
            Education
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{JOB_ZONE_DESCRIPTIONS[occupation.jobZone]}</p>
        </div>

        {tech.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary-soft" />
              Technology used
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{tech.join(' · ')}</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Salary & outlook
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Median:
            {' '}
            <strong className="text-foreground">{salary}</strong>
            {detail?.outlookDescription && ` · Outlook: ${detail.outlookDescription}`}
          </p>
        </div>

        {related.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Related careers</h3>
            <div className="flex flex-wrap gap-2">
              {related.map(r => (
                <Link key={r.code} href={`/careers/${r.slug ?? r.code}`} className="text-xs px-3 py-1 rounded-full border border-border hover:border-border-hover text-muted-foreground no-underline">
                  {r.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {!detail && (
          <div className="p-3 rounded-xl border border-border bg-surface/30 text-xs text-muted-foreground">
            More details are refreshing — check back soon.
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <a
            href={`https://www.onetonline.org/link/summary/${occupation.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-border text-sm text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all no-underline w-full justify-center"
          >
            <ExternalLink className="w-4 h-4" />
            View on O*NET
          </a>
        </div>
      </div>
    </div>
  )
}
