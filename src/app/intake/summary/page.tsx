'use client'

import { useAppStore } from '@/store/appStore'
import { useShallow } from 'zustand/react/shallow'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { describeCode } from '@/app/_data/codeLabels'
import { CosmicBackground } from '@/components/cosmic-background'

const riasecColors: Record<string, string> = {
  R: 'from-red-500 to-red-600',
  I: 'from-indigo-500 to-indigo-600',
  A: 'from-purple-500 to-purple-600',
  S: 'from-cyan-500 to-cyan-600',
  E: 'from-amber-500 to-amber-600',
  C: 'from-green-500 to-green-600',
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
      router.push('/intake/would-you-rather')
    }
  }, [answers, router])

  const hasResults = results.riasec && Object.keys(results.riasec).length > 0
  const maxRiasec = hasResults ? Math.max(...Object.values(results.riasec)) : 1

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      <CosmicBackground />

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
              href="/intake/would-you-rather"
              className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline"
            >
              Start the Assessment
            </Link>
          </div>
        )
        : (
          <>
            {/* RIASEC bars — full width card */}
            <div className="p-6 bg-surface/50 border border-border rounded-2xl mb-6">
              <h2 className="font-serif text-lg text-foreground mb-5">Interest Profile (RIASEC)</h2>
              <div className="flex flex-col gap-3">
                {Object.entries(results.riasec || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count], i) => {
                    const pct = Math.round((count / maxRiasec) * 100)
                    const colorClass = riasecColors[code] || 'from-primary to-secondary'
                    return (
                      <div key={code} className="flex items-center gap-3">
                        <span className="w-28 text-xs text-muted-foreground">{describeCode(code)}</span>
                        <div className="flex-1 h-2 rounded-full bg-primary/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
                            style={{
                              width: `${pct}%`,
                              transition: `width 0.8s ease ${i * 0.1}s`,
                            }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs font-semibold text-primary-soft">
                          {pct}
                          %
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Work Values + Environment — 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="p-6 bg-surface/50 border border-border rounded-2xl">
                <h2 className="font-serif text-lg text-foreground mb-4">Work Values</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(results.workvalue || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, count], i) => {
                      const isTop = i < 2
                      return (
                        <span
                          key={code}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                            isTop
                              ? 'border-accent/30 bg-accent/10 text-accent'
                              : 'border-border bg-primary/5 text-primary-soft'
                          }`}
                        >
                          {describeCode(code)}
                          {' ('}
                          {count}
                          )
                        </span>
                      )
                    })}
                </div>
              </div>

              <div className="p-6 bg-surface/50 border border-border rounded-2xl">
                <h2 className="font-serif text-lg text-foreground mb-4">Environment</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(results.env || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, count], i) => {
                      const isTop = i < 2
                      return (
                        <span
                          key={code}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                            isTop
                              ? 'border-accent/30 bg-accent/10 text-accent'
                              : 'border-border bg-primary/5 text-primary-soft'
                          }`}
                        >
                          {describeCode(code)}
                          {' ('}
                          {count}
                          )
                        </span>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Link
                href="/intake/would-you-rather"
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
