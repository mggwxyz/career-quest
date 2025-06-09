import { create } from 'zustand'

interface InterestsState {
  selectedInterests: string[]
  addInterest: (interest: string) => void
  removeInterest: (interest: string) => void
}

export const useInterestsStore = create<InterestsState>((set) => ({
  selectedInterests: [],
  addInterest: (interest) =>
    set((state) => ({
      selectedInterests: [...state.selectedInterests, interest],
    })),
  removeInterest: (interest) =>
    set((state) => ({
      selectedInterests: state.selectedInterests.filter((i) => i !== interest),
    })),
})) 