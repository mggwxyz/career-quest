import { StateCreator } from 'zustand'
import { AssessmentResult, GradeBand, Item, Posterior } from '@/lib/assessment'

export type AssessmentPhase = 'grade' | 'intro' | 'question' | 'complete' | 'loading'

export interface AssessmentState {
  phase: AssessmentPhase
  sessionId: string | null
  gradeBand: GradeBand | null
  currentItem: Item | null
  lastShownItem: Item | null
  itemsAnswered: number
  posteriorSnapshot: Posterior | null
  result: AssessmentResult | null
  inconsistencyDismissed: boolean

  setPhase: (phase: AssessmentPhase) => void
  setGradeBand: (band: GradeBand | null) => void
  startSession: (sessionId: string, firstItem: Item) => void
  receiveNext: (item: Item, itemsAnswered: number, posteriorSnapshot: Posterior | null) => void
  receiveStop: (result: AssessmentResult) => void
  dismissInconsistency: () => void
  reset: () => void
}

const initial: Pick<
  AssessmentState,
  | 'phase' | 'sessionId' | 'gradeBand' | 'currentItem' | 'lastShownItem'
  | 'itemsAnswered' | 'posteriorSnapshot' | 'result' | 'inconsistencyDismissed'
> = {
  phase: 'grade',
  sessionId: null,
  gradeBand: null,
  currentItem: null,
  lastShownItem: null,
  itemsAnswered: 0,
  posteriorSnapshot: null,
  result: null,
  inconsistencyDismissed: false,
}

export const createAssessmentSlice: StateCreator<AssessmentState> = set => ({
  ...initial,
  setPhase: phase => set({ phase }),
  setGradeBand: band => set({ gradeBand: band, phase: 'intro' }),
  startSession: (sessionId, firstItem) => set({
    sessionId,
    currentItem: firstItem,
    lastShownItem: null,
    itemsAnswered: 0,
    phase: 'question',
  }),
  receiveNext: (item, itemsAnswered, posteriorSnapshot) => set(state => ({
    lastShownItem: state.currentItem,
    currentItem: item,
    itemsAnswered,
    posteriorSnapshot,
  })),
  receiveStop: result => set({ result, phase: 'complete', posteriorSnapshot: null }),
  dismissInconsistency: () => set({ inconsistencyDismissed: true }),
  reset: () => set({ ...initial }),
})
