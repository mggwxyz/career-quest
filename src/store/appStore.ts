import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { questions } from '@/app/_data/questions'

interface InterestState {
  interests: string[]
  addInterest: (interest: string) => void
  removeInterest: (interest: string) => void
  clearInterests: () => void
}

interface WouldYouRatherState {
  currentQuestionIndex: number
  answers: Record<string, number>
  setAnswer: (questionId: string, option: number) => void
  nextQuestion: () => void
  resetGame: () => void
  getDeckResults: () => Record<string, Record<string, number>>
}

interface AppState extends InterestState, WouldYouRatherState {
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Interest slice
        interests: [],
        addInterest: interest =>
          set(state => ({
            interests: [...state.interests, interest],
          })),
        removeInterest: interest =>
          set(state => ({
            interests: state.interests.filter(i => i !== interest),
          })),
        clearInterests: () => set({ interests: [] }),

        // Would You Rather slice
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
      }),
      {
        name: 'app-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: state => ({
          interests: state.interests,
          answers: state.answers,
        }),
      },
    ),
    {
      name: 'app-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
)
