'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HollandCodeHero from './_components/HollandCodeHero'
import HollandCodeBanner from './_components/HollandCodeBanner'
import { ConfidenceDotsLegend } from './_components/ConfidenceLevelHint'
import { RiasecRadarChart } from './_components/RiasecRadarChart'
import WorkValuesPills from './_components/WorkValuesPills'
import WorkContextSliders from './_components/WorkContextSliders'
import { FlowStepper } from '@/components/flow-stepper'
import { Button } from '@/components/ui/button'
import type { AssessmentResult } from '@/lib/assessment'

export default function ProfilePage() {
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [profileInterests, setProfileInterests] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [resultRes, interestsRes] = await Promise.all([
          fetch('/api/assessment/result'),
          fetch('/api/user/interests'),
        ])
        const data = await resultRes.json()
        if (!cancelled) setResult(data.result as AssessmentResult | null)

        if (interestsRes.ok) {
          const intJson = await interestsRes.json().catch(() => ({})) as { interests?: unknown }
          if (!cancelled && Array.isArray(intJson.interests)) {
            setProfileInterests(intJson.interests.filter((x): x is string => typeof x === 'string'))
          }
        }
      }
      catch (err) {
        console.error('[profile] fetch result failed:', err)
      }
      finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="text-center pt-24 text-muted-foreground">Loading…</div>
  }

  if (!result) {
    return (
      <div className="container mx-auto px-4 lg:px-0 py-6 max-w-5xl relative">
        <FlowStepper />
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="font-serif text-2xl text-foreground mb-3">No Results Yet</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Complete the assessment to discover your career interests.
          </p>
          <Link
            href="/get-started/would-you-rather"
            className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold shadow-[var(--shadow-glow-sm)] no-underline"
          >
            Start the Assessment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-5xl relative">
      <FlowStepper />
      <HollandCodeBanner code={result.hollandCode} />

      <div className="w-full text-center mb-4 md:mb-5">
        <ConfidenceDotsLegend className="w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <HollandCodeHero result={result}>
          <WorkValuesPills result={result} />
          <WorkContextSliders result={result} />
        </HollandCodeHero>
        <RiasecRadarChart riasec={result.riasec} profileInterests={profileInterests} />
      </div>
      <Link
        href="/careers/matches"
        className="group relative flex items-center justify-between gap-6 mt-4 p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow-md)] hover:-translate-y-0.5 transition-all no-underline"
      >
        <div>
          <div className="text-xs uppercase tracking-[2px] opacity-80">Next step</div>
          <div className="font-serif text-2xl sm:text-3xl mt-1">See Your Career Matches</div>
          <div className="text-sm opacity-90 mt-1">Careers tailored to your Holland code and work style.</div>
        </div>
        <div className="text-3xl sm:text-4xl shrink-0 transition-transform group-hover:translate-x-1">→</div>
      </Link>
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        <Link
          href="/profile/answers"
          className="px-6 py-2.5 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm"
        >
          Review Your Answers
        </Link>
        <Button
          variant="ghost"
          asChild
          className="h-auto py-1.5 px-2 text-sm font-normal text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
        >
          <Link href="/get-started/would-you-rather">Retake Assessment</Link>
        </Button>
      </div>
    </div>
  )
}
