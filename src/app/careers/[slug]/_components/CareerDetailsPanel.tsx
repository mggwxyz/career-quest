import Link from 'next/link'
import { ExternalLink, GraduationCap, Wrench } from 'lucide-react'
import type { CareerDetail } from '@/lib/onet/schemas'
import type { OccupationRow } from '@/lib/onet/occupations'
import { JOB_ZONE_DESCRIPTIONS } from '@/lib/onet/projectors'

interface RelatedCareer {
  code: string
  title: string
  slug: string | null
}

interface Props {
  occupation: OccupationRow
  detail: CareerDetail | null
  relatedCareers: RelatedCareer[]
}

export function CareerDetailsPanel({ occupation, detail, relatedCareers }: Props) {
  const tasks = detail?.tasks.slice(0, 5) ?? []
  const skills = detail?.skills.slice(0, 10) ?? []
  const knowledge = detail?.knowledge.slice(0, 5) ?? []
  const tech = detail?.technology.slice(0, 8) ?? []
  const related = relatedCareers.slice(0, 6)

  return (
    <div className="p-6 bg-surface/50 border border-border rounded-2xl">
      <div className="space-y-5">
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
