'use client'

import { useAppStore } from '@/store/appStore'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { describeCode } from '@/app/_data/codeLabels'
import { containerClassName } from '@/app/_styles/classes'
import { StepIndicator } from '@/components/step-indicator'

export default function IntakeSummary() {
  const { getDeckResults, answers } = useAppStore()
  const router = useRouter()
  const results = getDeckResults()

  // Validation: redirect if no answers exist
  useEffect(() => {
    if (Object.keys(answers).length === 0) {
      toast.error('No assessment data found. Please complete the assessment first.')
      router.push('/intake/would-you-rather')
    }
  }, [answers, router])

  const hasResults = results.riasec && Object.keys(results.riasec).length > 0

  return (
    <div className={containerClassName}>
      <StepIndicator />
      <h1 className="text-3xl font-bold mb-8">Your Assessment Results</h1>

      {!hasResults
        ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-4">No Assessment Results Yet</h2>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto mb-8">
              You haven&apos;t completed the &quot;Would You Rather?&quot; assessment yet. Take the quiz to discover your career interests and get personalized recommendations.
            </p>
            <Link href="/intake/would-you-rather" className="btn btn-primary btn-lg">
              Start the Assessment
            </Link>
          </div>
        )
        : (
          <div className="space-y-12">
            {/* RIASEC Results */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">RIASEC Interest Profile</h2>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(results.riasec || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count]) => (
                    <div
                      key={code}
                      className="bg-base-200 p-4 rounded-lg"
                    >
                      <h3 className="font-medium text-lg">{describeCode(code)}</h3>
                      <p className="text-base-content/70">
                        Selected
                        {' '}
                        {count}
                        {' '}
                        times
                      </p>
                    </div>
                  ))}
              </div>
            </section>

            {/* Work Values Results */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Work Value Motivators</h2>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(results.workvalue || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count]) => (
                    <div
                      key={code}
                      className="bg-base-200 p-4 rounded-lg"
                    >
                      <h3 className="font-medium text-lg">{describeCode(code)}</h3>
                      <p className="text-base-content/70">
                        Selected
                        {' '}
                        {count}
                        {' '}
                        times
                      </p>
                    </div>
                  ))}
              </div>
            </section>

            {/* Environment Preferences */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Workplace Environment Preferences</h2>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(results.env || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count]) => (
                    <div
                      key={code}
                      className="bg-base-200 p-4 rounded-lg"
                    >
                      <h3 className="font-medium text-lg">{describeCode(code)}</h3>
                      <p className="text-base-content/70">
                        Selected
                        {' '}
                        {count}
                        {' '}
                        times
                      </p>
                    </div>
                  ))}
              </div>
            </section>

            <div className="flex justify-center gap-4 mt-8">
              <Link
                href="/careers"
                className="btn btn-primary"
              >
                Explore Career Matches
              </Link>
              <Link
                href="/intake/would-you-rather"
                className="btn btn-outline"
              >
                Retake Assessment
              </Link>
            </div>
          </div>
        )}
    </div>
  )
}
