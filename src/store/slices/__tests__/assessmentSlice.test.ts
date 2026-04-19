import { describe, it, expect } from 'vitest'
import { create } from 'zustand'
import { createAssessmentSlice, AssessmentState } from '../assessmentSlice'
import { items } from '@/app/_data/items'

function makeStore() {
  return create<AssessmentState>()((...a) => createAssessmentSlice(...a))
}

describe('assessmentSlice', () => {
  it('starts in grade phase', () => {
    const s = makeStore().getState()
    expect(s.phase).toBe('grade')
    expect(s.sessionId).toBeNull()
    expect(s.currentItem).toBeNull()
  })

  it('setGradeBand updates band and moves to intro', () => {
    const store = makeStore()
    store.getState().setGradeBand('middle')
    const s = store.getState()
    expect(s.gradeBand).toBe('middle')
    expect(s.phase).toBe('intro')
  })

  it('setGradeBand(null) (skip) still moves to intro', () => {
    const store = makeStore()
    store.getState().setGradeBand(null)
    expect(store.getState().phase).toBe('intro')
    expect(store.getState().gradeBand).toBeNull()
  })

  it('startSession transitions to question with current item', () => {
    const store = makeStore()
    const item = items[0]
    store.getState().startSession('sess-1', item)
    const s = store.getState()
    expect(s.phase).toBe('question')
    expect(s.sessionId).toBe('sess-1')
    expect(s.currentItem).toBe(item)
  })

  it('receiveNext swaps currentItem to lastShownItem', () => {
    const store = makeStore()
    store.getState().startSession('s', items[0])
    store.getState().receiveNext(items[1], 1, null)
    const s = store.getState()
    expect(s.lastShownItem).toBe(items[0])
    expect(s.currentItem).toBe(items[1])
    expect(s.itemsAnswered).toBe(1)
  })

  it('receiveStop transitions to complete with result', () => {
    const store = makeStore()
    const result = { hollandCode: 'SAE' } as unknown as AssessmentState['result']
    store.getState().receiveStop(result!)
    const s = store.getState()
    expect(s.phase).toBe('complete')
    expect(s.result).toEqual(result)
  })

  it('reset clears all state', () => {
    const store = makeStore()
    store.getState().setGradeBand('middle')
    store.getState().startSession('s', items[0])
    store.getState().reset()
    const s = store.getState()
    expect(s.phase).toBe('grade')
    expect(s.sessionId).toBeNull()
    expect(s.gradeBand).toBeNull()
    expect(s.currentItem).toBeNull()
  })
})
