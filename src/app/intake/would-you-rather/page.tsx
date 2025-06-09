'use client'

import { useState } from 'react'
import { WouldYouRatherQuestion } from '@/store/wouldYouRatherStore'
import { questions } from '@/app/_data/questions'
import OptionCard from './_components/OptionCard'
import { useAppStore } from '@/store/appStore'

const allQuestions = questions.decks.flatMap(deck => deck.questions)

export default function WouldYouRather() {
  const { currentQuestionIndex, setAnswer, nextQuestion, resetGame } = useAppStore()
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
      <div className="container mx-auto p-6 max-w-4xl text-center">
        <h1 className="text-3xl font-bold mb-8">Thank you for playing!</h1>
        <p className="text-xl mb-8">We&apos;ve recorded your preferences.</p>
        <button
          onClick={() => resetGame()}
          className="btn btn-primary"
        >
          Play Again
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Would You Rather?</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
