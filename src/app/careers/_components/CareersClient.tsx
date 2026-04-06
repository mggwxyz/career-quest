'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { useShallow } from 'zustand/react/shallow'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import Link from 'next/link'
import { generateCareerRecommendationsAction } from '../actions'
import { toast } from 'sonner'
import { CareerRecommendation } from '@/lib/schemas/career'
import { StarField } from '@/components/star-field'

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
  const { getDeckResults, interests, answers } = useAppStore(
    useShallow(s => ({
      getDeckResults: s.getDeckResults,
      interests: s.interests,
      answers: s.answers,
    })),
  )
  const [careers, setCareers] = useState<CareerRecommendation[]>(initialCareers)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const hasExistingData = initialCareers.length > 0
  const router = useRouter()
  const { isAnonymous } = useAuth()

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
      if (interval)
        clearInterval(interval)
    }
  }, [isPending])

  const generateCareerRecommendations = () => {
    startTransition(async () => {
      setError(null)
      const loadingToastId = toast.loading('Generating career recommendations...')
      try {
        const results = getDeckResults()
        const response = await generateCareerRecommendationsAction(results, interests)
        if (response.success && response.careers) {
          setCareers(response.careers)
          toast.success('Career recommendations generated!', { id: loadingToastId })
        }
        else {
          const msg = response.error || 'Failed to generate recommendations'
          setError(msg)
          toast.error(msg, { id: loadingToastId })
        }
      }
      catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred'
        setError(msg)
        toast.error(msg, { id: loadingToastId })
      }
    })
  }

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-5xl relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: `
            radial-gradient(ellipse 500px 350px at 20% 30%, rgba(88, 28, 135, 0.2) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 80% 70%, rgba(30, 58, 138, 0.15) 0%, transparent 70%)
          `,
          }}
        />
        <StarField count={40} />
      </div>

      <div className="text-center mb-10 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Your Career Matches</h1>
        <p className="text-sm text-muted-foreground">Ranked by how well they fit your profile</p>
      </div>

      {/* Error state */}
      {error && (
        <div role="alert" className="p-4 mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 text-center">
          <p className="text-sm text-destructive font-medium mb-2">Career Generation Failed</p>
          <p className="text-xs text-muted-foreground mb-3">{error}</p>
          <button onClick={generateCareerRecommendations} disabled={isPending} className="text-xs text-primary-soft hover:underline">
            Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {isPending
        ? (
          <div className="text-center py-12">
            <div className="loading loading-spinner loading-lg text-primary mb-4" />
            <p className="text-muted-foreground">{loadingMessages[loadingMessageIndex]}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 max-w-4xl mx-auto">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-6 rounded-2xl border border-border bg-surface/50 animate-pulse">
                  <div className="flex justify-between mb-3">
                    <div className="h-4 w-32 bg-primary/10 rounded" />
                    <div className="h-4 w-16 bg-primary/10 rounded-full" />
                  </div>
                  <div className="h-3 w-full bg-primary/5 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-primary/5 rounded" />
                </div>
              ))}
            </div>
          </div>
        )
        : careers.length === 0
          ? (
            /* Empty states */
            <div className="text-center py-12">
              {isAnonymous
                ? (
                  <div className="p-8 rounded-2xl border border-border bg-surface/50 max-w-lg mx-auto">
                    <h3 className="font-serif text-xl text-foreground mb-3">Get AI-Powered Career Matches</h3>
                    <p className="text-sm text-muted-foreground mb-6">Sign in to generate personalized career recommendations based on your assessment results.</p>
                    <div className="flex gap-3 justify-center">
                      <Link href="/auth/login" className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold text-sm no-underline">Log In</Link>
                      <Link href="/auth/sign-up" className="px-6 py-2.5 rounded-full border border-border text-primary-soft text-sm font-medium no-underline">Sign Up</Link>
                    </div>
                  </div>
                )
                : (
                  <>
                    <div className="text-5xl mb-4">🎯</div>
                    <h2 className="font-serif text-2xl text-foreground mb-3">Ready to Find Your Perfect Career?</h2>
                    <p className="text-muted-foreground max-w-lg mx-auto mb-8">Based on your assessment results and selected interests, we can generate personalized career recommendations.</p>
                    <button onClick={generateCareerRecommendations} disabled={isPending} className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] transition-all">
                      Generate Career Recommendations
                    </button>
                  </>
                )}
            </div>
          )
          : (
            /* Career cards grid */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto mb-10">
                {careers.map((career, index) => (
                  <motion.div
                    key={career.onetId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.08 }}
                  >
                    <Link
                      href={`/careers/${career.onetId}`}
                      className="block p-6 rounded-2xl border border-border bg-surface/50 hover:border-border-hover hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all no-underline group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-base font-semibold text-foreground group-hover:text-primary-soft transition-colors">{career.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{career.description}</p>
                      <div className="flex gap-4 text-xs mb-3">
                        <span>
                          <span className="text-text-dim">Growth:</span>
                          {' '}
                          <span className="text-green-400 font-medium">{career.jobGrowth}</span>
                        </span>
                        <span>
                          <span className="text-text-dim">Salary:</span>
                          {' '}
                          <span className="text-primary-soft font-medium">{career.salaryRange}</span>
                        </span>
                      </div>
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="text-accent font-medium">Why it fits: </span>
                          {career.whyItMatches}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={generateCareerRecommendations} disabled={isPending} className="px-7 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] transition-all text-sm">
                  {hasExistingData ? 'Regenerate' : 'Generate New'}
                </button>
                <Link href="/intake/summary" className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm">
                  View Results
                </Link>
              </div>
            </>
          )}
    </div>
  )
}
