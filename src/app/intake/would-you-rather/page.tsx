'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WouldYouRatherQuestion } from '@/store/slices/wouldYouRatherSlice'
import { questions } from '@/app/_data/questions'
import OptionCard from './_components/OptionCard'
import { useAppStore } from '@/store/appStore'
import Link from 'next/link'
import { toast } from 'sonner'
import { StarField } from '@/components/star-field'

const allQuestions = questions.decks.flatMap(deck => deck.questions)

export default function WouldYouRather() {
  const { currentQuestionIndex, setAnswer, skipQuestion, nextQuestion, previousQuestion, resetGame, hydrateFromDB, answers, skippedQuestions } = useAppStore()
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  const loadSavedProgress = useCallback(async () => {
    try {
      const response = await fetch('/api/user/progress')
      const data = await response.json()
      if (response.ok && data.progress?.answers) {
        hydrateFromDB(data.progress.answers, data.progress.skippedQuestions || [])
      }
    }
    catch {
      // Silent fail
    }
    finally {
      setIsHydrated(true)
    }
  }, [hydrateFromDB])

  const saveProgressToDB = useCallback(async () => {
    try {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          skippedQuestions: Array.from(skippedQuestions),
        }),
      })
    }
    catch {
      // Silent fail
    }
  }, [answers, skippedQuestions])

  useEffect(() => {
    if (!isHydrated) loadSavedProgress()
  }, [isHydrated, loadSavedProgress])

  useEffect(() => {
    if (isHydrated && (Object.keys(answers).length > 0 || skippedQuestions.size > 0)) {
      saveProgressToDB()
    }
  }, [answers, skippedQuestions, isHydrated, saveProgressToDB])

  const currentQuestion: WouldYouRatherQuestion = allQuestions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100

  const handleOptionSelect = (option: number) => {
    if (selectedOption !== null) return
    setSelectedOption(option)
    setShowCheckmark(true)
    setAnswer(currentQuestion.id.toString(), option)

    setTimeout(() => {
      setShowCheckmark(false)
      setSelectedOption(null)
      nextQuestion()
      if (currentQuestionIndex === allQuestions.length - 1) {
        toast.success('Assessment completed!', {
          description: 'Your preferences have been recorded. Ready to explore your career matches?',
        })
      }
    }, 500)
  }

  const handleSkipQuestion = () => {
    if (selectedOption !== null) return
    skipQuestion(currentQuestion.id.toString())
    nextQuestion()
  }

  // Completion screen
  if (currentQuestionIndex >= allQuestions.length) {
    return (
      <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 500px 350px at 30% 30%, rgba(88, 28, 135, 0.2) 0%, transparent 70%)`,
            }}
          />
          <StarField count={40} />
        </div>
        <div className="text-center pt-20">
          <h1 className="font-serif text-3xl text-foreground mb-4">Assessment Complete</h1>
          <p className="text-lg text-muted-foreground mb-10">We&apos;ve recorded your preferences.</p>
          <div className="flex flex-col gap-3 items-center">
            <Link href="/intake/summary" className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline">
              View Your Results
            </Link>
            <Link href="/careers" className="px-8 py-3 rounded-full border border-border text-primary-soft font-medium hover:border-border-hover transition-all no-underline">
              Explore Career Matches
            </Link>
            <button onClick={() => resetGame()} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
              Start Over
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
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

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-1 rounded-full bg-primary/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_8px_rgba(124,58,237,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-text-dim whitespace-nowrap">
          {currentQuestionIndex + 1}
          {' '}
          of
          {' '}
          {allQuestions.length}
        </span>
      </div>

      {/* Question title */}
      <div className="text-center mb-8 mt-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Would you rather...</h1>
      </div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="relative max-w-3xl mx-auto">
            {/* "or" badge — desktop only */}
            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-10 h-10 rounded-full bg-background/90 border border-border flex items-center justify-center font-serif text-sm italic text-muted-foreground shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                or
              </div>
            </div>

            {/* Mobile: stacked */}
            <div className="block sm:hidden space-y-4">
              <OptionCard
                option={currentQuestion.option1}
                isSelected={selectedOption === 1}
                showCheckmark={showCheckmark}
                onClick={() => handleOptionSelect(1)}
              />
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-background/90 border border-border flex items-center justify-center font-serif text-sm italic text-muted-foreground">
                  or
                </div>
              </div>
              <OptionCard
                option={currentQuestion.option2}
                isSelected={selectedOption === 2}
                showCheckmark={showCheckmark}
                onClick={() => handleOptionSelect(2)}
              />
            </div>

            {/* Desktop: side by side */}
            <div className="hidden sm:grid grid-cols-2 gap-6">
              <OptionCard
                option={currentQuestion.option1}
                isSelected={selectedOption === 1}
                showCheckmark={showCheckmark}
                onClick={() => handleOptionSelect(1)}
              />
              <OptionCard
                option={currentQuestion.option2}
                isSelected={selectedOption === 2}
                showCheckmark={showCheckmark}
                onClick={() => handleOptionSelect(2)}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="flex justify-center gap-3 mt-6">
        {currentQuestionIndex > 0 && (
          <button
            onClick={previousQuestion}
            className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all"
          >
            ← Back
          </button>
        )}
        <button
          onClick={handleSkipQuestion}
          disabled={selectedOption !== null}
          className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all disabled:opacity-30"
        >
          Skip →
        </button>
      </div>
    </div>
  )
}
