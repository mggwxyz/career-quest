import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Bookmark,
  Brain,
  ClipboardList,
  Eye,
  MessageCircle,
  NotebookText,
  Sparkles,
  Star,
} from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import {
  getPortfolioDashboard,
  type PortfolioAssessmentAttempt,
  type PortfolioCareer,
  type PortfolioNextAction,
  type PortfolioRecommendationRun,
} from '@/lib/career/portfolio'
import { containerClassName } from '@/app/_styles/classes'
import { SceneImage } from '@/components/scene-image'
import { CareerActionButtons } from '@/components/career-action-buttons'

function formatDate(date: Date | null): string {
  if (!date) return 'Not completed'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function careerHref(career: PortfolioCareer): string {
  return `/careers/${career.slug ?? career.onetId}`
}

function SectionHeader({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode
  title: string
  detail?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/70 text-primary-soft">
          {icon}
        </span>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

function EmptySection({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/30 p-5 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function CareerRows({
  careers,
  empty,
  showActions = true,
}: {
  careers: PortfolioCareer[]
  empty: React.ReactNode
  showActions?: boolean
}) {
  if (careers.length === 0) return <EmptySection>{empty}</EmptySection>

  return (
    <div className="grid gap-3">
      {careers.map(career => (
        <article
          key={career.onetId}
          className="grid gap-4 rounded-xl border border-border bg-surface/50 p-4 sm:grid-cols-[112px_1fr] sm:items-start"
        >
          <Link href={careerHref(career)} className="block overflow-hidden rounded-lg border border-border no-underline">
            <SceneImage
              onetId={career.onetId}
              alt={`${career.title} at work`}
              className="aspect-[3/2] w-full"
              sizes="112px"
            />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <Link
                  href={careerHref(career)}
                  className="font-semibold text-foreground no-underline hover:text-primary-soft"
                >
                  {career.title}
                </Link>
                {career.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {career.description}
                  </p>
                )}
              </div>
              {showActions && (
                <CareerActionButtons
                  compact
                  showDismiss={false}
                  onetId={career.onetId}
                  title={career.title}
                  slug={career.slug}
                  state={career.state}
                />
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {career.salaryAnnualMedian != null && (
                <span>
                  <span className="text-foreground">Salary:</span>
                  {' $'}
                  {career.salaryAnnualMedian.toLocaleString()}
                  /yr
                </span>
              )}
              {career.outlookCategory && (
                <span>
                  <span className="text-foreground">Growth:</span>
                  {' '}
                  {career.outlookCategory}
                </span>
              )}
              {career.activityAt && <span>{formatDate(career.activityAt)}</span>}
            </div>
            {career.whyItMatches && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="text-accent">Why it fits:</span>
                {' '}
                {career.whyItMatches}
              </p>
            )}
            {career.note && (
              <p className="mt-2 rounded-lg border border-border bg-background/40 p-2 text-xs text-muted-foreground">
                {career.note}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function AssessmentRows({ attempts }: { attempts: PortfolioAssessmentAttempt[] }) {
  if (attempts.length === 0) {
    return (
      <EmptySection>
        <Link href="/discover/would-you-rather" className="text-primary-soft hover:underline">
          Start the assessment
        </Link>
        {' '}
        to create your first profile.
      </EmptySection>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface/70 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Attempt</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Profile</th>
            <th className="px-4 py-3 font-medium">Answered</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {attempts.map(attempt => (
            <tr key={attempt.id} className="bg-surface/30">
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(attempt.completedAt ?? attempt.abandonedAt ?? attempt.startedAt)}
              </td>
              <td className="px-4 py-3 capitalize text-foreground">{attempt.status}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {attempt.hollandCode ?? 'Pending'}
                {attempt.inconsistency ? ' · review suggested' : ''}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{attempt.itemsAnswered ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecommendationRuns({ runs }: { runs: PortfolioRecommendationRun[] }) {
  if (runs.length === 0) {
    return (
      <EmptySection>
        No recommendation runs yet. Generate matches once your assessment is complete.
      </EmptySection>
    )
  }

  return (
    <div className="grid gap-2">
      {runs.map(run => (
        <div key={run.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-foreground">{formatDate(run.createdAt)}</p>
            <p className="text-xs text-muted-foreground">{run.model}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>
              {run.careerCount}
              {' '}
              careers
            </p>
            {run.durationMs != null && (
              <p>
                {Math.round(run.durationMs / 1000)}
                s
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function NextActionRows({ actions }: { actions: PortfolioNextAction[] }) {
  if (actions.length === 0) {
    return <EmptySection>Your portfolio is current. Revisit a career or start a new exploration branch.</EmptySection>
  }

  return (
    <div className="grid gap-3">
      {actions.map(action => (
        <Link
          key={`${action.href}-${action.label}`}
          href={action.href}
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/50 p-4 text-foreground no-underline hover:border-border-hover"
        >
          <span>
            <span className="block text-sm font-semibold">{action.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{action.detail}</span>
          </span>
          <span className="text-lg text-primary-soft">→</span>
        </Link>
      ))}
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect('/auth/login?redirect=/dashboard')

  const dashboard = await getPortfolioDashboard(session.user.id)

  return (
    <div className={containerClassName}>
      <div className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[2px] text-muted-foreground">Portfolio</p>
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Career Portfolio</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Return to saved careers, shortlist decisions, recent activity, and assessment history without starting from fresh matches.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-border bg-surface/50 p-5">
        <SectionHeader icon={<Brain className="h-4 w-4" />} title="Profile summary" />
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Holland code</p>
            <p className="mt-1 text-2xl font-serif text-foreground">{dashboard.profile.hollandCode ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saved careers</p>
            <p className="mt-1 text-2xl font-serif text-foreground">{dashboard.savedCareers.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Assessments</p>
            <p className="mt-1 text-2xl font-serif text-foreground">{dashboard.profile.completedAssessments}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recommendation runs</p>
            <p className="mt-1 text-2xl font-serif text-foreground">{dashboard.profile.recommendationRuns}</p>
          </div>
        </div>
        {dashboard.profile.interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {dashboard.profile.interests.slice(0, 10).map(interest => (
              <span key={interest} className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-xs text-muted-foreground">
                {interest}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section>
            <SectionHeader icon={<Bookmark className="h-4 w-4" />} title="Saved careers" />
            <CareerRows
              careers={dashboard.savedCareers}
              empty={(
                <>
                  Save careers from
                  {' '}
                  <Link href="/discover/matches" className="text-primary-soft hover:underline">matches</Link>
                  {' '}
                  or
                  {' '}
                  <Link href="/careers" className="text-primary-soft hover:underline">browse</Link>
                  .
                </>
              )}
            />
          </section>

          <section>
            <SectionHeader icon={<Star className="h-4 w-4" />} title="Shortlisted careers" />
            <CareerRows
              careers={dashboard.shortlistedCareers}
              empty="Shortlist saved careers when they are ready for deeper comparison."
            />
          </section>

          <section>
            <SectionHeader icon={<Eye className="h-4 w-4" />} title="Recently viewed careers" />
            <CareerRows
              careers={dashboard.recentlyViewedCareers}
              showActions={false}
              empty="Open a career detail page and it will appear here."
            />
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="Recommended next actions" />
            <NextActionRows actions={dashboard.nextActions} />
          </section>

          <section>
            <SectionHeader icon={<ClipboardList className="h-4 w-4" />} title="Assessment attempts" />
            <AssessmentRows attempts={dashboard.assessmentAttempts} />
          </section>

          <section>
            <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="Recommendation runs" />
            <RecommendationRuns runs={dashboard.recommendationRunHistory} />
          </section>

          <section>
            <SectionHeader icon={<MessageCircle className="h-4 w-4" />} title="Recent chats" />
            <CareerRows
              careers={dashboard.recentChatCareers}
              showActions={false}
              empty="Ask a question on a career detail page to track that conversation here."
            />
          </section>

          <section>
            <SectionHeader icon={<NotebookText className="h-4 w-4" />} title="Recent notes" />
            <CareerRows
              careers={dashboard.recentNotes}
              showActions={false}
              empty="Notes saved from career detail pages will show up here."
            />
          </section>
        </div>
      </div>
    </div>
  )
}
