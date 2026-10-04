import { describe, expect, it, vi } from 'vitest'

vi.mock('@/db', () => ({ db: {} }))

import {
  actionValueForToggle,
  buildCareerActionStates,
  isCareerUserActionValue,
} from '../user-actions'

const at = (iso: string) => new Date(iso)

describe('career user action state', () => {
  it('derives reversible save, shortlist, and dismiss state from append-only rows', () => {
    const states = buildCareerActionStates([
      { onetId: '15-1252.00', action: 'save', note: null, createdAt: at('2026-01-01T00:00:00Z') },
      { onetId: '15-1252.00', action: 'shortlist', note: null, createdAt: at('2026-01-02T00:00:00Z') },
      { onetId: '15-1252.00', action: 'dismiss', note: null, createdAt: at('2026-01-03T00:00:00Z') },
      { onetId: '15-1252.00', action: 'undismiss', note: null, createdAt: at('2026-01-04T00:00:00Z') },
      { onetId: '15-1252.00', action: 'unsave', note: null, createdAt: at('2026-01-05T00:00:00Z') },
    ])

    expect(states.get('15-1252.00')).toMatchObject({
      saved: false,
      shortlisted: true,
      dismissed: false,
    })
  })

  it('tracks latest view, chat, and note events', () => {
    const states = buildCareerActionStates([
      { onetId: '29-1141.00', action: 'view', note: null, createdAt: at('2026-01-01T00:00:00Z') },
      { onetId: '29-1141.00', action: 'chat', note: null, createdAt: at('2026-01-02T00:00:00Z') },
      { onetId: '29-1141.00', action: 'note', note: 'Ask about clinical rotations.', createdAt: at('2026-01-03T00:00:00Z') },
    ])

    expect(states.get('29-1141.00')).toMatchObject({
      viewedAt: at('2026-01-01T00:00:00Z'),
      chattedAt: at('2026-01-02T00:00:00Z'),
      latestNote: 'Ask about clinical rotations.',
      latestNoteAt: at('2026-01-03T00:00:00Z'),
    })
  })

  it('documents and maps valid action values', () => {
    expect(isCareerUserActionValue('shortlist')).toBe(true)
    expect(isCareerUserActionValue('archive')).toBe(false)
    expect(actionValueForToggle('save', true)).toBe('save')
    expect(actionValueForToggle('save', false)).toBe('unsave')
    expect(actionValueForToggle('dismiss', false)).toBe('undismiss')
  })
})
