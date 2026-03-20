'use client'

import { useState, useEffect, useTransition } from 'react'
import { useAppStore } from '@/store/appStore'
import Link from 'next/link'
import { containerClassName } from '@/app/_styles/classes'
import { generateCareerRecommendationsAction } from '../actions'
import { StepIndicator } from '@/components/step-indicator'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

interface CareersClientProps {
  initialCareers: Career[]
}

const loadingMessages = [
  'Analyzing your interests and preferences...',
  'Matching your profile with potential careers...',
  'Considering job growth and salary trends...',
  'Finding careers that align with your values...',
  'Almost there! Just a few more calculations...',
  'Reviewing the latest labor market data...',
  'Personalizing your career recommendations...',
]

export default function CareersClient({ initialCareers }: CareersClientProps) {
  const { getDeckResults, interests } = useAppStore()
  const [careers, setCareers] = useState<Career[]>(initialCareers)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const hasExistingData = initialCareers.length > 0

  console.log({ interests })

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPending) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length)
      }, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPending])

  const generateCareerRecommendations = () => {
    startTransition(async () => {
      setError(null)

      try {
        const results = getDeckResults()
        const response = await generateCareerRecommendationsAction(results, interests)

        if (response.success && response.careers) {
          setCareers(response.careers)
        }
        else {
          setError(response.error || 'Failed to generate career recommendations')
        }
      }
      catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  const LoadingTable = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="loading loading-spinner loading-lg" />
        <p className="mt-4 text-lg font-medium">{loadingMessages[loadingMessageIndex]}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Career</th>
              <th>Description</th>
              <th>Why It Matches</th>
              <th>Job Growth</th>
              <th>Salary Range</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr key={index}>
                <td>
                  <div className="h-4 bg-base-300 rounded animate-pulse" />
                </td>
                <td>
                  <div className="h-4 bg-base-300 rounded animate-pulse" />
                </td>
                <td>
                  <div className="h-4 bg-base-300 rounded animate-pulse" />
                </td>
                <td>
                  <div className="h-4 bg-base-300 rounded animate-pulse" />
                </td>
                <td>
                  <div className="h-4 bg-base-300 rounded animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className={containerClassName}>
      <StepIndicator />
      <h1 className="text-3xl font-bold mb-8">Career Recommendations</h1>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-8">
        {isPending
          ? (
            <LoadingTable />
          )
          : careers.length === 0
            ? (
              <div className="text-center">
                <p className="text-xl mb-8">
                  Based on your assessment results and selected interests, we can generate personalized career recommendations.
                </p>
                <button
                  onClick={generateCareerRecommendations}
                  className="btn btn-primary"
                  disabled={isPending}
                >
                  Generate Career Recommendations
                </button>
              </div>
            )
            : (
              <>
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Career</th>
                        <th>Description</th>
                        <th>Why It Matches</th>
                        <th>Job Growth</th>
                        <th>Salary Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {careers.map(career => (
                        <tr key={career.onetId}>
                          <td>
                            <div className="flex flex-col gap-2">
                              <a
                                href={`https://www.onetonline.org/link/summary/${career.onetId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-primary font-medium"
                              >
                                {career.title}
                              </a>
                              <Link
                                href={`/careers/${career.onetId}`}
                                className="btn btn-xs btn-outline"
                              >
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                                Chat
                              </Link>
                            </div>
                          </td>
                          <td>{career.description}</td>
                          <td>{career.whyItMatches}</td>
                          <td>{career.jobGrowth}</td>
                          <td>{career.salaryRange}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={generateCareerRecommendations}
                    className="btn btn-primary"
                    disabled={isPending}
                  >
                    {hasExistingData ? 'Regenerate Recommendations' : 'Generate New Recommendations'}
                  </button>
                  <Link
                    href="/intake/summary"
                    className="btn btn-outline"
                  >
                    View Assessment Results
                  </Link>
                </div>
              </>
            )}
      </div>
    </div>
  )
}
