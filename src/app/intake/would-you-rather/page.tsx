'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WouldYouRatherQuestion } from '@/store/slices/wouldYouRatherSlice'
import { questions } from '@/app/_data/questions'
import OptionCard from './_components/OptionCard'
import { useAppStore } from '@/store/appStore'
import { useIsLoggedIn } from '@/hooks/use-is-logged-in'
import Link from 'next/link'
import { containerClassName } from '@/app/_styles/classes'
import { toast } from 'sonner'
import { StepIndicator } from '@/components/step-indicator'

const allQuestions = questions.decks.flatMap(deck => deck.questions)

export default function WouldYouRather() {
  const { currentQuestionIndex, setAnswer, skipQuestion, nextQuestion, previousQuestion, resetGame, hydrateFromDB, answers, skippedQuestions } = useAppStore()
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const isLoggedIn = useIsLoggedIn()

  // Load saved progress from DB for logged-in users
  useEffect(() => {
    if (isLoggedIn && !isHydrated) {
      loadSavedProgress()
    }
  }, [isLoggedIn, isHydrated, loadSavedProgress])

  // Save progress to DB when answers change for logged-in users
  useEffect(() => {
    if (isLoggedIn && isHydrated && Object.keys(answers).length > 0) {
      saveProgressToDB()
    }
  }, [answers, skippedQuestions, isLoggedIn, isHydrated, saveProgressToDB])

  const loadSavedProgress = useCallback(async () => {
    try {
      const response = await fetch('/api/user/progress')
      const data = await response.json()

      if (response.ok && data.progress?.answers) {
        hydrateFromDB(data.progress.answers, data.progress.skippedQuestions)
      }
    }
    catch (error) {
      console.error('Error loading saved progress:', error)
    }
    finally {
      setIsHydrated(true)
    }
  }, [hydrateFromDB])

  const saveProgressToDB = useCallback(async () => {
    try {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          skippedQuestions: Array.from(skippedQuestions),
        }),
      })
    }
    catch (error) {
      console.error('Error saving progress:', error)
    }
  }, [answers, skippedQuestions])

  const currentQuestion: WouldYouRatherQuestion = allQuestions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100

  const handleOptionSelect = (option: number) => {
    if (selectedOption !== null) return // Prevent multiple selections

    setSelectedOption(option)
    setShowCheckmark(true)
    setAnswer(currentQuestion.id.toString(), option)

    // Wait for checkmark animation before moving to next question
    setTimeout(() => {
      setShowCheckmark(false)
      setSelectedOption(null)
      nextQuestion()

      // Show completion toast if this was the last question
      if (currentQuestionIndex === allQuestions.length - 1) {
        toast.success('🎉 Assessment completed! Great job!', {
          description: 'Your preferences have been recorded. Ready to explore your career matches?',
        })
      }
    }, 500)
  }

  const handleSkipQuestion = () => {
    if (selectedOption !== null) return // Prevent skipping if already selected

    skipQuestion(currentQuestion.id.toString())
    nextQuestion()
  }

  if (currentQuestionIndex >= allQuestions.length) {
    return (
      <div className={containerClassName}>
        <StepIndicator />
        <h1 className="text-3xl font-bold mb-8">Thank you for playing!</h1>
        <p className="text-xl mb-8">We&apos;ve recorded your preferences.</p>
        <div className="flex flex-col gap-4 items-center">
          <Link
            href="/intake/summary"
            className="btn btn-primary"
          >
            View Your Results
          </Link>
          <Link
            href="/careers"
            className="btn btn-secondary"
          >
            Explore Career Matches
          </Link>
          <button
            onClick={() => resetGame()}
            className="btn btn-outline"
          >
            Play Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      <StepIndicator />
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Would You Rather?</h1>
          {currentQuestionIndex > 0 && (
            <motion.button
              onClick={previousQuestion}
              className="btn btn-outline btn-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ← Previous Question
            </motion.button>
          )}
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg">
            Question
            {' '}
            {currentQuestionIndex + 1}
            {' '}
            of
            {' '}
            {allQuestions.length}
          </span>
          <span className="text-lg">
            {Math.round(progress)}
            % Complete
          </span>
        </div>
        <motion.progress
          className="progress progress-primary w-full"
          value={progress}
          max="100"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Mobile: Stacked layout with VS divider */}
          <div className="block sm:hidden space-y-4">
            <OptionCard
              option={currentQuestion.option1}
              isSelected={selectedOption === 1}
              showCheckmark={showCheckmark}
              onClick={() => handleOptionSelect(1)}
            />
            <motion.div
              className="flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <div className="bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                VS
              </div>
            </motion.div>
            <OptionCard
              option={currentQuestion.option2}
              isSelected={selectedOption === 2}
              showCheckmark={showCheckmark}
              onClick={() => handleOptionSelect(2)}
            />
          </div>

          {/* Desktop: Side-by-side layout */}
          <div className="hidden sm:grid grid-cols-2 gap-4 md:gap-8">
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
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center mt-6">
        <button
          onClick={handleSkipQuestion}
          className="btn btn-ghost btn-sm"
          disabled={selectedOption !== null}
        >
          Skip Question
        </button>
      </div>
    </div>
  )
}
