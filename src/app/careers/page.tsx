'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import Link from 'next/link'
import { containerClassName } from '../_styles/classes'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
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

export default function Careers() {
  const { getDeckResults, interests } = useAppStore()
  const [careers, setCareers] = useState<Career[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  console.log({ interests })

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length)
      }, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [loading])

  const generateCareerRecommendations = async () => {
    setLoading(true)
    setError(null)

    try {
      const results = getDeckResults()
      const response = await fetch('/api/careers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ results, interests }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate career recommendations')
      }

      const data = await response.json()
      setCareers(data.careers)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
    finally {
      setLoading(false)
    }
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
      <h1 className="text-3xl font-bold mb-8">Career Recommendations</h1>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-8">
        {loading
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
                  disabled={loading}
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
                                Chat about this career
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
                    disabled={loading}
                  >
                    Regenerate Recommendations
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
