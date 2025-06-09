import { questions } from '@/app/_data/questions'
import { get } from 'http'
import { create } from 'zustand'

export interface WouldYouRatherQuestionOption {
  text: string
  imageUrl: string
  prompt: string
  codes: string[]
}

export interface WouldYouRatherQuestion {
  id: number
  option1: WouldYouRatherQuestionOption
  option2: WouldYouRatherQuestionOption
}

export interface WouldYouRatherState {
  currentQuestionIndex: number
  answers: Record<number, number> // Maps question ID to selected option (1 or 2)
  setAnswer: (questionId: number, option: number) => void
  nextQuestion: () => void
  resetGame: () => void
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
  getResults: () => {
    const answers = get().answers
    const results = questions.decks.flatMap(deck => deck.questions).map((question) => {
      const answer = answers[question.id]
      return { ...question, answer }
    })
    return results
  },
}))
