'use client'

import { useAppStore } from '@/store/appStore'
import Link from 'next/link'
import { describeCode } from '@/app/_data/codeLabels'
import { containerClassName } from '@/app/_styles/classes'
import { StepIndicator } from '@/components/step-indicator'

export default function IntakeSummary() {
  const { getDeckResults } = useAppStore()
  const results = getDeckResults()

  return (
    <div className={containerClassName}>
      <StepIndicator />
      <h1 className="text-3xl font-bold mb-8">Your Assessment Results</h1>

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
    </div>
  )
}
