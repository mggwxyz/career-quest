import { useAppStore } from '@/store/appStore'

const STORE_KEY = 'app-store'

describe('appStore Set serialization', () => {
  beforeEach(() => {
    // Clear localStorage and reset store state so each test is isolated
    localStorage.clear()
    useAppStore.setState({
      interests: [],
      currentQuestionIndex: 0,
      answers: {},
      skippedQuestions: new Set<string>(),
    })
  })

  it('persists skippedQuestions to localStorage as an array (not a Set)', () => {
    useAppStore.getState().skipQuestion('q1')
    useAppStore.getState().skipQuestion('q2')

    const raw = localStorage.getItem(STORE_KEY)
    expect(raw).not.toBeNull()

    const parsed = JSON.parse(raw!)
    expect(Array.isArray(parsed.state.skippedQuestions)).toBe(true)
    expect([...parsed.state.skippedQuestions].sort()).toEqual(['q1', 'q2'])
  })

  it('rehydrates an array in localStorage back into a Set on load', async () => {
    // Seed localStorage directly with array form
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        state: {
          interests: [],
          currentQuestionIndex: 0,
          answers: { q1: 1 },
          skippedQuestions: ['q2', 'q3'],
        },
        version: 0,
      }),
    )

    // Trigger rehydration
    await useAppStore.persist.rehydrate()

    const state = useAppStore.getState()
    expect(state.skippedQuestions).toBeInstanceOf(Set)
    expect(state.skippedQuestions.has('q2')).toBe(true)
    expect(state.skippedQuestions.has('q3')).toBe(true)
    expect(state.skippedQuestions.size).toBe(2)
    expect(state.answers).toEqual({ q1: 1 })
  })

  it('handles empty storage (no key set) without errors', async () => {
    localStorage.clear()
    // Should still provide the initial Set
    await useAppStore.persist.rehydrate()
    expect(useAppStore.getState().skippedQuestions).toBeInstanceOf(Set)
    expect(useAppStore.getState().skippedQuestions.size).toBe(0)
  })

  it('round-trips a skippedQuestions set through persist and rehydrate', async () => {
    // Write via actions
    useAppStore.getState().skipQuestion('a')
    useAppStore.getState().skipQuestion('b')
    useAppStore.getState().skipQuestion('c')

    // Capture persisted data before wiping in-memory state.
    // NOTE: calling setState goes through the persist middleware and would
    // overwrite localStorage, so we must snapshot and restore storage manually.
    const savedStorage = localStorage.getItem(STORE_KEY)

    useAppStore.setState({
      skippedQuestions: new Set<string>(),
    })

    // Restore the persisted snapshot so rehydrate() has data to work from
    if (savedStorage) {
      localStorage.setItem(STORE_KEY, savedStorage)
    }

    // Rehydrate from localStorage
    await useAppStore.persist.rehydrate()

    const rehydrated = useAppStore.getState().skippedQuestions
    expect(rehydrated).toBeInstanceOf(Set)
    expect([...rehydrated].sort()).toEqual(['a', 'b', 'c'])
  })
})
