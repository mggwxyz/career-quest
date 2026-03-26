'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { useRouter } from 'next/navigation'
import { useIsLoggedIn } from '@/hooks/use-is-logged-in'
import Link from 'next/link'
import { containerClassName } from '@/app/_styles/classes'
import { generateCareerRecommendationsAction } from '../actions'
import { StepIndicator } from '@/components/step-indicator'
import { toast } from 'sonner'
import { CareerRecommendation } from '@/lib/schemas/career'

interface CareersClientProps {
  initialCareers: CareerRecommendation[]
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
  const { getDeckResults, interests, answers } = useAppStore()
  const [careers, setCareers] = useState<CareerRecommendation[]>(initialCareers)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const hasExistingData = initialCareers.length > 0
  const router = useRouter()
  const isLoggedIn = useIsLoggedIn()

  // Validation: redirect if no assessment results exist
  useEffect(() => {
    const results = getDeckResults()
    const hasResults = Object.values(results).some(deck => Object.keys(deck).length > 0)

    if (!hasResults && Object.keys(answers).length === 0) {
      toast.error('No assessment results found. Please complete the assessment first.')
      router.push('/intake/interests')
    }
  }, [answers, getDeckResults, router])

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

      // Show loading toast
      const loadingToastId = toast.loading('Generating career recommendations...')

      try {
        const results = getDeckResults()
        const response = await generateCareerRecommendationsAction(results, interests)

        if (response.success && response.careers) {
          setCareers(response.careers)

          // Show success toast
          toast.success('Career recommendations generated successfully!', {
            id: loadingToastId,
          })
        }
        else {
          const errorMessage = response.error || 'Failed to generate career recommendations'
          setError(errorMessage)

          // Show error toast
          toast.error(errorMessage, {
            id: loadingToastId,
          })
        }
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)

        // Show error toast
        toast.error(errorMessage, {
          id: loadingToastId,
        })
      }
    })
  }

  const LoadingState = () => (
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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Career Generation Failed</span>
            <span>{error}</span>
            <button
              onClick={generateCareerRecommendations}
              className="btn btn-sm btn-ghost"
              disabled={isPending}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {isPending
          ? (
            <LoadingState />
          )
          : careers.length === 0
            ? (
              <div className="text-center py-12">
                {!isLoggedIn
                  ? (
                    <>
                      <h2 className="text-2xl font-semibold mb-4">Your RIASEC Results</h2>
                      <p className="text-lg mb-6">
                        Based on your assessment, here are your interests and preferences:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {Object.entries(getDeckResults()).map(([deckName, results]) => (
                          <div key={deckName} className="bg-base-200 p-4 rounded-lg">
                            <h3 className="font-semibold capitalize mb-2">{deckName}</h3>
                            <div className="space-y-1">
                              {Object.entries(results)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 3)
                                .map(([code, count]) => (
                                  <div key={code} className="text-sm">
                                    {code}
                                    :
                                    {count}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-info/10 border border-info/20 rounded-lg p-6 mb-6">
                        <h3 className="text-xl font-semibold mb-3">Get AI-Powered Career Matches!</h3>
                        <p className="mb-4">
                          Sign up or log in to get personalized AI career recommendations based on your assessment results.
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Link href="/auth/login" className="btn btn-primary">
                            Log In
                          </Link>
                          <Link href="/auth/sign-up" className="btn btn-outline">
                            Sign Up
                          </Link>
                        </div>
                      </div>
                    </>
                  )
                  : (
                    <>
                      <div className="mb-8">
                        <div className="text-6xl mb-4">🎯</div>
                        <h2 className="text-2xl font-bold mb-4">Ready to Find Your Perfect Career?</h2>
                        <p className="text-lg text-base-content/70 max-w-2xl mx-auto mb-8">
                          Based on your assessment results and selected interests, we can generate personalized career recommendations that match your unique profile.
                        </p>
                      </div>
                      <button
                        onClick={generateCareerRecommendations}
                        className="btn btn-primary btn-lg"
                        disabled={isPending}
                      >
                        Generate Career Recommendations
                      </button>
                      <div className="mt-4">
                        <Link href="/intake/interests" className="link link-primary">
                          Or go back to update your interests
                        </Link>
                      </div>
                    </>
                  )}
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
                      {careers.map((career, index) => (
                        <motion.tr
                          key={career.onetId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.1,
                            ease: 'easeOut',
                          }}
                          whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                        >
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
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                              </motion.div>
                            </div>
                          </td>
                          <td>{career.description}</td>
                          <td>{career.whyItMatches}</td>
                          <td>{career.jobGrowth}</td>
                          <td>{career.salaryRange}</td>
                        </motion.tr>
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
