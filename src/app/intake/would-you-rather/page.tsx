'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useWouldYouRatherStore, questions } from '@/store/wouldYouRatherStore'

export default function WouldYouRather() {
  const { currentQuestionIndex, answers, setAnswer, nextQuestion } = useWouldYouRatherStore()
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const handleOptionSelect = (option: number) => {
    if (selectedOption !== null) return // Prevent multiple selections

    setSelectedOption(option)
    setShowCheckmark(true)
    setAnswer(currentQuestion.id, option)

    // Wait for checkmark animation before moving to next question
    setTimeout(() => {
      setShowCheckmark(false)
      setTimeout(() => {
        nextQuestion()
        setSelectedOption(null)
      }, 300)
    }, 1000)
  }

  if (currentQuestionIndex >= questions.length) {
    return (
      <div className="container mx-auto p-6 max-w-4xl text-center">
        <h1 className="text-3xl font-bold mb-8">Thank you for playing!</h1>
        <p className="text-xl mb-8">We've recorded your preferences.</p>
        <button 
          onClick={() => useWouldYouRatherStore.getState().resetGame()}
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
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-lg">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <progress 
          className="progress progress-primary w-full" 
          value={progress} 
          max="100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Option 1 */}
        <div 
          className={`card bg-base-100 shadow-xl cursor-pointer transition-all duration-300 ${
            selectedOption === 1 ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleOptionSelect(1)}
        >
          <figure className="relative aspect-square">
            <Image
              src={currentQuestion.option1.image}
              alt={currentQuestion.option1.text}
              fill
              className="object-cover"
            />
            {showCheckmark && selectedOption === 1 && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="text-6xl text-primary">✓</div>
              </div>
            )}
          </figure>
          <div className="card-body">
            <h2 className="card-title justify-center text-xl">
              {currentQuestion.option1.text}
            </h2>
          </div>
        </div>

        {/* Option 2 */}
        <div 
          className={`card bg-base-100 shadow-xl cursor-pointer transition-all duration-300 ${
            selectedOption === 2 ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleOptionSelect(2)}
        >
          <figure className="relative aspect-square">
            <Image
              src={currentQuestion.option2.image}
              alt={currentQuestion.option2.text}
              fill
              className="object-cover"
            />
            {showCheckmark && selectedOption === 2 && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="text-6xl text-primary">✓</div>
              </div>
            )}
          </figure>
          <div className="card-body">
            <h2 className="card-title justify-center text-xl">
              {currentQuestion.option2.text}
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}
