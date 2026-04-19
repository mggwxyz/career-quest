import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createInterestsSlice, InterestsState } from './slices/interestsSlice'
import { createAssessmentSlice, AssessmentState } from './slices/assessmentSlice'

export type AppState = InterestsState & AssessmentState

const withDevtools = process.env.NODE_ENV === 'development' ? devtools : ((fn: unknown) => fn) as typeof devtools

export const useAppStore = create<AppState>()(
  withDevtools(
    (...a) => ({
      ...createInterestsSlice(...a),
      ...createAssessmentSlice(...a),
    }),
  ),
)
