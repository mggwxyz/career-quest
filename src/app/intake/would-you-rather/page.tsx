'use client'

import { useState } from 'react'
import { WouldYouRatherQuestion } from '@/store/slices/wouldYouRatherSlice'
import { questions } from '@/app/_data/questions'
import OptionCard from './_components/OptionCard'
import { useAppStore } from '@/store/appStore'
import Link from 'next/link'
import { containerClassName } from '@/app/_styles/classes'
import { StepIndicator } from '@/components/step-indicator'

const allQuestions = questions.decks.flatMap(deck => deck.questions)

export default function WouldYouRather() {
  const { currentQuestionIndex, setAnswer, nextQuestion, previousQuestion, resetGame } = useAppStore()
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)

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
    }, 500)
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
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Would You Rather?</h1>
          {currentQuestionIndex > 0 && (
            <button
              onClick={previousQuestion}
              className="btn btn-outline btn-sm"
            >
              ← Previous Question
            </button>
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
        <progress
          className="progress progress-primary w-full"
          value={progress}
          max="100"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-8">
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
  )
}
