'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HollandCodeHero from './_components/HollandCodeHero'
import { RiasecRadarChart } from './_components/RiasecRadarChart'
import WorkValuesPills from './_components/WorkValuesPills'
import WorkContextSliders from './_components/WorkContextSliders'
import type { AssessmentResult } from '@/lib/assessment'

export default function ProfilePage() {
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/assessment/result')
        const data = await res.json()
        if (!cancelled) setResult(data.result as AssessmentResult | null)
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
      <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="font-serif text-2xl text-foreground mb-3">No Results Yet</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Complete the assessment to discover your career interests.
          </p>
          <Link
            href="/discover/preferences"
            className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold shadow-[var(--shadow-glow-sm)] no-underline"
          >
            Start the Assessment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      <HollandCodeHero result={result} />
      <RiasecRadarChart riasec={result.riasec} />
      <div className="mt-10" />
      <WorkValuesPills result={result} />
      <WorkContextSliders result={result} />
      <div className="flex justify-center gap-4 mt-8">
        <Link
          href="/discover/preferences"
          className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm"
        >
          Retake Assessment
        </Link>
        <Link
          href="/careers"
          className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold shadow-[var(--shadow-glow-sm)] no-underline"
        >
          Explore Careers →
        </Link>
      </div>
    </div>
  )
}
