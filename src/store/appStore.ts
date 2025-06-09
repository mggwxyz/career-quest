import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { createInterestsSlice, InterestsState } from './slices/interestsSlice'
import { createWouldYouRatherSlice, WouldYouRatherState } from './slices/wouldYouRatherSlice'

export type AppState = InterestsState & WouldYouRatherState

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (...a) => ({
        ...createInterestsSlice(...a),
        ...createWouldYouRatherSlice(...a),
      }),
      {
        name: 'app-store',
      },
    ),
  ),
)
