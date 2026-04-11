import { create } from 'zustand'
import { createInterestsSlice, InterestsState } from '../interestsSlice'

function makeStore() {
  return create<InterestsState>()((...a) => createInterestsSlice(...a))
}

describe('interestsSlice', () => {
  it('starts with empty interests', () => {
    const store = makeStore()
    expect(store.getState().interests).toEqual([])
  })

  it('addInterest appends new interest', () => {
    const store = makeStore()
    store.getState().addInterest('🎨 Art & Design')
    expect(store.getState().interests).toEqual(['🎨 Art & Design'])

    store.getState().addInterest('🔬 Science')
    expect(store.getState().interests).toEqual(['🎨 Art & Design', '🔬 Science'])
  })

  it('removeInterest removes matching interest', () => {
    const store = makeStore()
    store.getState().setInterests(['a', 'b', 'c'])
    store.getState().removeInterest('b')
    expect(store.getState().interests).toEqual(['a', 'c'])
  })

  it('removeInterest is a no-op when the interest is absent', () => {
    const store = makeStore()
    store.getState().setInterests(['a', 'b'])
    store.getState().removeInterest('missing')
    expect(store.getState().interests).toEqual(['a', 'b'])
  })

  it('clearInterests resets to empty array', () => {
    const store = makeStore()
    store.getState().setInterests(['a', 'b', 'c'])
    store.getState().clearInterests()
    expect(store.getState().interests).toEqual([])
  })

  it('setInterests replaces the whole list', () => {
    const store = makeStore()
    store.getState().setInterests(['a', 'b'])
    store.getState().setInterests(['x', 'y', 'z'])
    expect(store.getState().interests).toEqual(['x', 'y', 'z'])
  })

  it('addInterest does not de-duplicate (documented current behavior)', () => {
    const store = makeStore()
    store.getState().addInterest('dup')
    store.getState().addInterest('dup')
    expect(store.getState().interests).toEqual(['dup', 'dup'])
  })
})
