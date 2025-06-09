import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'

interface InterestState {
  interests: string[]
  addInterest: (interest: string) => void
  removeInterest: (interest: string) => void
  clearInterests: () => void
}

interface WouldYouRatherState {
  currentQuestionIndex: number
  answers: Record<string, number>
  setAnswer: (questionId: string, answer: number) => void
  nextQuestion: () => void
  resetGame: () => void
}

interface AppState extends InterestState, WouldYouRatherState {
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      set => ({
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
        setAnswer: (questionId, answer) =>
          set(state => ({
            answers: { ...state.answers, [questionId]: answer },
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
