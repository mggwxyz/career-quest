'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import Link from 'next/link'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

export default function Careers() {
  const { getDeckResults } = useAppStore()
  const [careers, setCareers] = useState<Career[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        body: JSON.stringify(results),
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Career Recommendations</h1>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {careers.length === 0
        ? (
          <div className="text-center">
            <p className="text-xl mb-8">
              Based on your assessment results, we can generate personalized career recommendations.
            </p>
            <button
              onClick={generateCareerRecommendations}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Generating Recommendations...' : 'Generate Career Recommendations'}
            </button>
          </div>
        )
        : (
          <div className="space-y-8">
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
                        <a
                          href={`https://www.onetonline.org/link/summary/${career.onetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary font-medium"
                        >
                          {career.title}
                        </a>
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
                {loading ? 'Regenerating...' : 'Regenerate Recommendations'}
              </button>
              <Link
                href="/intake/summary"
                className="btn btn-outline"
              >
                View Assessment Results
              </Link>
            </div>
          </div>
        )}
    </div>
  )
}
