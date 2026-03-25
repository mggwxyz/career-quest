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
  skippedQuestions: Set<string>
  setAnswer: (questionId: string, option: number) => void
  skipQuestion: (questionId: string) => void
  nextQuestion: () => void
  previousQuestion: () => void
  resetGame: () => void
  hydrateFromDB: (answers: Record<string, number>, skippedQuestions: string[]) => void
  getDeckResults: () => Record<string, Record<string, number>>
}

export const createWouldYouRatherSlice: StateCreator<WouldYouRatherState> = (set, get) => ({
  currentQuestionIndex: 0,
  answers: {},
  skippedQuestions: new Set<string>(),
  setAnswer: (questionId: string, option: number) =>
    set((state) => {
      // Remove from skipped if it was previously skipped
      const newSkipped = new Set(state.skippedQuestions)
      newSkipped.delete(questionId)

      return {
        answers: {
          ...state.answers,
          [questionId]: option,
        },
        skippedQuestions: newSkipped,
      }
    }),
  skipQuestion: (questionId: string) =>
    set((state) => {
      // Remove from answers if it was previously answered
      const newAnswers = { ...state.answers }
      delete newAnswers[questionId]

      return {
        answers: newAnswers,
        skippedQuestions: new Set([...state.skippedQuestions, questionId]),
      }
    }),
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
      skippedQuestions: new Set<string>(),
    }),
  hydrateFromDB: (answers: Record<string, number>, skippedQuestions: string[]) =>
    set({
      answers,
      skippedQuestions: new Set(skippedQuestions),
    }),
  getDeckResults: () => {
    const state = get()
    const results: Record<string, Record<string, number>> = {}

    questions.decks.forEach((deck) => {
      const deckResults: Record<string, number> = {}

      deck.questions.forEach((question) => {
        // Skip questions that were explicitly skipped
        if (state.skippedQuestions.has(question.id)) return

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
