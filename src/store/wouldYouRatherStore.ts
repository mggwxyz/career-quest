import { questions } from '@/app/_data/questions'
import { create } from 'zustand'

export interface WouldYouRatherQuestionOption {
  id: string
  text: string
  imageUrl: string
  prompt: string
  codes: string[]
}

export interface WouldYouRatherQuestion {
  id: string
  option1: WouldYouRatherQuestionOption
  option2: WouldYouRatherQuestionOption
}

export interface WouldYouRatherState {
  currentQuestionIndex: number
  answers: Record<string, number> // Maps question ID to selected option (1 or 2)
  setAnswer: (questionId: string, option: number) => void
  nextQuestion: () => void
  resetGame: () => void
  getDeckResults: () => Record<string, Record<string, number>>
}

export const useWouldYouRatherStore = create<WouldYouRatherState>((set, get) => ({
  currentQuestionIndex: 0,
  answers: {},
  setAnswer: (questionId, option) =>
    set(state => ({
      answers: { ...state.answers, [questionId]: option },
    })),
  nextQuestion: () =>
    set(state => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
    })),
  resetGame: () =>
    set({
      currentQuestionIndex: 0,
      answers: {},
    }),
  getDeckResults: () => {
    const state = get()
    const results: Record<string, Record<string, number>> = {}

    // Process each deck
    questions.decks.forEach((deck) => {
      const deckResults: Record<string, number> = {}

      // Process each question in the deck
      deck.questions.forEach((question) => {
        const selectedOption = state.answers[question.id]
        if (selectedOption === undefined) return

        // Get the selected option's codes
        const selectedOptionData = selectedOption === 1 ? question.option1 : question.option2

        // Increment count for each code
        selectedOptionData.codes.forEach((code) => {
          deckResults[code] = (deckResults[code] || 0) + 1
        })
      })

      results[deck.id] = deckResults
    })

    return results
  },
}))
