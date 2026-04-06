import { ExternalLink, TrendingUp, DollarSign, Target } from 'lucide-react'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

interface CareerDetailsProps {
  career: Career
}

export function CareerDetails({ career }: CareerDetailsProps) {
  return (
    <div className="p-6 bg-surface/50 border border-border rounded-2xl">
      <h2 className="font-serif text-xl text-foreground mb-5">{career.title}</h2>

      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5">Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{career.description}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-soft" />
            Why It Matches You
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{career.whyItMatches}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Job Growth
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{career.jobGrowth}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" />
            Salary Range
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{career.salaryRange}</p>
        </div>

        <div className="pt-4 border-t border-border">
          <a
            href={`https://www.onetonline.org/link/summary/${career.onetId}`}
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
