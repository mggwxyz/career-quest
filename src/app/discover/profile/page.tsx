'use client'

import { useAppStore } from '@/store/appStore'
import { useShallow } from 'zustand/react/shallow'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { TraitHeroCard } from './_components/TraitHeroCard'
import { RiasecRadarChart } from './_components/RiasecRadarChart'
import { IllustratedTraitCard } from './_components/IllustratedTraitCard'
import { WORK_VALUE_IMAGES, ENV_IMAGES, type ProfileImageEntry } from '@/app/_data/profileImages'

type Rank = 1 | 2 | 3

function topThree(counts: Record<string, number> | undefined): [string, number][] {
  if (!counts) return []
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
}

function pickImageEntries(
  top: [string, number][],
  source: Record<string, ProfileImageEntry>,
): { entry: ProfileImageEntry, rank: Rank }[] {
  return top
    .map(([code], i) => {
      const entry = source[code]
      if (!entry) return null
      return { entry, rank: (i + 1) as Rank }
    })
    .filter((v): v is { entry: ProfileImageEntry, rank: Rank } => v !== null)
}

export default function IntakeSummary() {
  const { getDeckResults, answers } = useAppStore(
    useShallow(s => ({
      getDeckResults: s.getDeckResults,
      answers: s.answers,
    })),
  )
  const router = useRouter()
  const results = getDeckResults()

  useEffect(() => {
    if (Object.keys(answers).length === 0) {
      toast.error('No assessment data found. Please complete the assessment first.')
      router.push('/discover/preferences')
    }
  }, [answers, router])

  const riasec = results.riasec ?? {}
  const hasResults = Object.keys(riasec).length > 0
  const maxRiasec = Math.max(...Object.values(riasec), 1)
  const topRiasec = topThree(riasec)
  const topWorkValues = pickImageEntries(topThree(results.workvalue), WORK_VALUE_IMAGES)
  const topEnv = pickImageEntries(topThree(results.env), ENV_IMAGES)

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      <div className="text-center mb-10 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Your Profile</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what your answers reveal about your career personality
        </p>
      </div>

      {!hasResults
        ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="font-serif text-2xl text-foreground mb-3">No Results Yet</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Complete the assessment to discover your career interests and get personalized recommendations.
            </p>
            <Link
              href="/discover/preferences"
              className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline"
            >
              Start the Assessment
            </Link>
          </div>
        )
        : (
          <>
            {/* Section 1 — Top 3 Trait Hero Cards */}
            <section className="mb-10">
              <div className="text-[10px] text-muted-foreground uppercase tracking-[2px] text-center mb-4">
                Your Top Traits
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topRiasec.map(([code, count], i) => (
                  <TraitHeroCard
                    key={code}
                    code={code}
                    rank={(i + 1) as Rank}
                    count={count}
                    maxCount={maxRiasec}
                  />
                ))}
              </div>
            </section>

            {/* Section 2 — RIASEC Radar Chart */}
            <section className="mb-10">
              <RiasecRadarChart riasec={riasec} />
            </section>

            {/* Section 3 — Top 3 Work Values */}
            {topWorkValues.length > 0 && (
              <section className="mb-10">
                <h2 className="font-serif text-lg text-foreground mb-1">What You Value</h2>
                <p className="text-xs text-muted-foreground mb-4">Top 3 work values</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {topWorkValues.map(({ entry, rank }) => (
                    <IllustratedTraitCard key={entry.filename} entry={entry} rank={rank} />
                  ))}
                </div>
              </section>
            )}

            {/* Section 4 — Top 3 Environment Preferences */}
            {topEnv.length > 0 && (
              <section className="mb-10">
                <h2 className="font-serif text-lg text-foreground mb-1">Your Ideal Environment</h2>
                <p className="text-xs text-muted-foreground mb-4">Top 3 workplace preferences</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {topEnv.map(({ entry, rank }) => (
                    <IllustratedTraitCard key={entry.filename} entry={entry} rank={rank} />
                  ))}
                </div>
              </section>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link
                href="/discover/preferences"
                className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm"
              >
                Retake Assessment
              </Link>
              <Link
                href="/careers"
                className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline"
              >
                Explore Careers →
              </Link>
            </div>
          </>
        )}
    </div>
  )
}
