import { create } from 'zustand'
import { createWouldYouRatherSlice, WouldYouRatherState } from '../wouldYouRatherSlice'
import { questions } from '@/app/_data/questions'

function makeStore() {
  return create<WouldYouRatherState>()((...a) => createWouldYouRatherSlice(...a))
}

describe('wouldYouRatherSlice — initial state', () => {
  it('starts at index 0 with empty answers and empty skip set', () => {
    const state = makeStore().getState()
    expect(state.currentQuestionIndex).toBe(0)
    expect(state.answers).toEqual({})
    expect(state.skippedQuestions.size).toBe(0)
  })
})

describe('wouldYouRatherSlice — setAnswer', () => {
  it('stores the selected option', () => {
    const store = makeStore()
    store.getState().setAnswer('q1', 2)
    expect(store.getState().answers).toEqual({ q1: 2 })
  })

  it('overwrites a previous answer for the same question', () => {
    const store = makeStore()
    store.getState().setAnswer('q1', 1)
    store.getState().setAnswer('q1', 2)
    expect(store.getState().answers).toEqual({ q1: 2 })
  })

  it('removes the question from skippedQuestions if it was previously skipped', () => {
    const store = makeStore()
    store.getState().skipQuestion('q1')
    expect(store.getState().skippedQuestions.has('q1')).toBe(true)

    store.getState().setAnswer('q1', 1)
    expect(store.getState().skippedQuestions.has('q1')).toBe(false)
    expect(store.getState().answers).toEqual({ q1: 1 })
  })
})

describe('wouldYouRatherSlice — skipQuestion', () => {
  it('adds the question to skippedQuestions', () => {
    const store = makeStore()
    store.getState().skipQuestion('q1')
    expect(store.getState().skippedQuestions.has('q1')).toBe(true)
  })

  it('removes the question from answers if it was previously answered', () => {
    const store = makeStore()
    store.getState().setAnswer('q1', 1)
    store.getState().skipQuestion('q1')
    expect(store.getState().answers).toEqual({})
    expect(store.getState().skippedQuestions.has('q1')).toBe(true)
  })
})

describe('wouldYouRatherSlice — navigation', () => {
  it('nextQuestion increments the index', () => {
    const store = makeStore()
    store.getState().nextQuestion()
    store.getState().nextQuestion()
    expect(store.getState().currentQuestionIndex).toBe(2)
  })

  it('previousQuestion decrements but never goes below 0', () => {
    const store = makeStore()
    store.getState().nextQuestion()
    store.getState().nextQuestion()
    store.getState().previousQuestion()
    expect(store.getState().currentQuestionIndex).toBe(1)

    store.getState().previousQuestion()
    store.getState().previousQuestion()
    store.getState().previousQuestion()
    expect(store.getState().currentQuestionIndex).toBe(0)
  })
})

describe('wouldYouRatherSlice — hydrateFromDB', () => {
  it('replaces answers and rebuilds skippedQuestions as a Set', () => {
    const store = makeStore()
    store.getState().hydrateFromDB({ q1: 1, q2: 2 }, ['q3'])
    const state = store.getState()
    expect(state.answers).toEqual({ q1: 1, q2: 2 })
    expect(state.skippedQuestions).toBeInstanceOf(Set)
    expect(state.skippedQuestions.has('q3')).toBe(true)
    expect(state.skippedQuestions.size).toBe(1)
  })
})

describe('wouldYouRatherSlice — resetGame', () => {
  it('resets index, answers, and skipped set', () => {
    const store = makeStore()
    store.getState().setAnswer('q1', 1)
    store.getState().skipQuestion('q2')
    store.getState().nextQuestion()

    store.getState().resetGame()

    const state = store.getState()
    expect(state.currentQuestionIndex).toBe(0)
    expect(state.answers).toEqual({})
    expect(state.skippedQuestions.size).toBe(0)
  })
})

describe('wouldYouRatherSlice — getDeckResults', () => {
  it('returns an object keyed by deck id with empty tallies when no answers given', () => {
    const store = makeStore()
    const results = store.getState().getDeckResults()
    questions.decks.forEach((deck) => {
      expect(results[deck.id]).toEqual({})
    })
  })

  it('tallies codes from answered questions into the correct deck', () => {
    const store = makeStore()
    const firstDeck = questions.decks[0]
    const firstQuestion = firstDeck.questions[0]
    const chosenOption = firstQuestion.option1
    const chosenCodes = chosenOption.codes

    // IMPORTANT: setAnswer accepts questionId as string. The slice uses
    // state.answers[question.id] for lookup; if question.id is number in the
    // data, the selector does a `firstQuestion.id.toString()` comparison elsewhere.
    // The selector in wouldYouRatherSlice.ts reads `state.answers[question.id]`
    // WITHOUT toString — so we must set the answer with the raw id value.
    store.getState().setAnswer(String(firstQuestion.id), 1)

    const results = store.getState().getDeckResults()
    chosenCodes.forEach((code) => {
      expect(results[firstDeck.id][code]).toBe(1)
    })
  })

  it('skips questions that are in the skipped set during tallying', () => {
    const store = makeStore()
    const firstDeck = questions.decks[0]
    const firstQuestion = firstDeck.questions[0]
    const idStr = String(firstQuestion.id)

    store.getState().setAnswer(idStr, 1)
    store.getState().skipQuestion(idStr)

    const results = store.getState().getDeckResults()
    expect(results[firstDeck.id]).toEqual({})
  })
})
