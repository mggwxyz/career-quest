import { StateCreator } from 'zustand'
import { questions } from '@/app/_data/questions'

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
  answers: Record<string, number>
  setAnswer: (questionId: string, option: number) => void
  nextQuestion: () => void
  previousQuestion: () => void
  resetGame: () => void
  getDeckResults: () => Record<string, Record<string, number>>
}

export const createWouldYouRatherSlice: StateCreator<WouldYouRatherState> = (set, get) => ({
  currentQuestionIndex: 0,
  answers: {},
  setAnswer: (questionId: string, option: number) =>
    set(state => ({
      answers: {
        ...state.answers,
        [questionId]: option,
      },
    })),
  nextQuestion: () =>
    set(state => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
    })),
  previousQuestion: () =>
    set(state => ({
      currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
    })),
  resetGame: () =>
    set({
      currentQuestionIndex: 0,
      answers: {},
    }),
  getDeckResults: () => {
    const state = get()
    const results: Record<string, Record<string, number>> = {}

    questions.decks.forEach((deck) => {
      const deckResults: Record<string, number> = {}

      deck.questions.forEach((question) => {
        const selectedOption = state.answers[question.id]
        if (selectedOption === undefined) return

        const chosenOption = selectedOption === 1 ? question.option1 : question.option2
        chosenOption.codes.forEach((code) => {
          deckResults[code] = (deckResults[code] || 0) + 1
        })
      })

      results[deck.id] = deckResults
    })

    return results
  },
})
