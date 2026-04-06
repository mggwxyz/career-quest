import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { createInterestsSlice, InterestsState } from './slices/interestsSlice'
import { createWouldYouRatherSlice, WouldYouRatherState } from './slices/wouldYouRatherSlice'

export type AppState = InterestsState & WouldYouRatherState

const withDevtools = process.env.NODE_ENV === 'development' ? devtools : ((fn: unknown) => fn) as typeof devtools

export const useAppStore = create<AppState>()(
  withDevtools(
    persist(
      (...a) => ({
        ...createInterestsSlice(...a),
        ...createWouldYouRatherSlice(...a),
      }),
      {
        name: 'app-store',
        // Custom serialization/deserialization for Set
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name)
            if (!str) return null
            const parsed = JSON.parse(str)

            // Convert skippedQuestions array back to Set
            if (parsed.state?.skippedQuestions && Array.isArray(parsed.state.skippedQuestions)) {
              parsed.state.skippedQuestions = new Set(parsed.state.skippedQuestions)
            }

            return parsed
          },
          setItem: (name, value) => {
            // Convert Set to array for serialization
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
