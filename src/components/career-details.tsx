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
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-xl mb-4">{career.title}</h2>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-base-content/80">{career.description}</p>
          </div>

          {/* Why It Matches */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Why It Matches You
            </h3>
            <p className="text-sm text-base-content/80">{career.whyItMatches}</p>
          </div>

          {/* Job Growth */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Job Growth
            </h3>
            <p className="text-sm text-base-content/80">{career.jobGrowth}</p>
          </div>

          {/* Salary Range */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Salary Range
            </h3>
            <p className="text-sm text-base-content/80">{career.salaryRange}</p>
          </div>

          {/* O*NET Link */}
          <div className="pt-4 border-t border-base-300">
            <a
              href={`https://www.onetonline.org/link/summary/${career.onetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on O*NET
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
