import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { createInterestsSlice, InterestsState } from './slices/interestsSlice'
import { createWouldYouRatherSlice, WouldYouRatherState } from './slices/wouldYouRatherSlice'
import { createAssessmentSlice, AssessmentState } from './slices/assessmentSlice'

export type AppState = InterestsState & WouldYouRatherState & AssessmentState

const withDevtools = process.env.NODE_ENV === 'development' ? devtools : ((fn: unknown) => fn) as typeof devtools

export const useAppStore = create<AppState>()(
  withDevtools(
    persist(
      (...a) => ({
        ...createInterestsSlice(...a),
        ...createWouldYouRatherSlice(...a),
        ...createAssessmentSlice(...a),
      }),
      {
        name: 'app-store',
        // Only persist interests + legacy wouldYouRather slice state.
        // Assessment state is intentionally excluded — server is the source of truth.
        partialize: state => ({
          interests: state.interests,
          currentQuestionIndex: state.currentQuestionIndex,
          answers: state.answers,
          skippedQuestions: state.skippedQuestions,
        }) as Partial<AppState>,
        // Custom serialization/deserialization for the skippedQuestions Set.
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name)
            if (!str) return null
            const parsed = JSON.parse(str)

            if (parsed.state?.skippedQuestions && Array.isArray(parsed.state.skippedQuestions)) {
              parsed.state.skippedQuestions = new Set(parsed.state.skippedQuestions)
            }

            return parsed
          },
          setItem: (name, value) => {
            const serialized = {
              ...value,
              state: {
                ...value.state,
                skippedQuestions: value.state.skippedQuestions ? Array.from(value.state.skippedQuestions) : [],
              },
            }
            localStorage.setItem(name, JSON.stringify(serialized))
          },
          removeItem: name => localStorage.removeItem(name),
        },
      },
    ),
  ),
)
