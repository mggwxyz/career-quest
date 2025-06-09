import { StateCreator } from 'zustand'

export interface InterestsState {
  interests: string[]
  addInterest: (interest: string) => void
  removeInterest: (interest: string) => void
  clearInterests: () => void
}

export const createInterestsSlice: StateCreator<InterestsState> = set => ({
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
})
