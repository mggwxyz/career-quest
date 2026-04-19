import { describe, it, expect } from 'vitest'
import { slugifyTitle, resolveSlugCollisions } from '../slugify'

describe('slugifyTitle', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyTitle('Registered Nurses')).toBe('registered-nurses')
  })
  it('strips punctuation and special chars', () => {
    expect(slugifyTitle('First-Line Supervisors')).toBe('first-line-supervisors')
    expect(slugifyTitle('Physicians\'')).toBe('physicians')
  })
  it('expands ampersands to "and"', () => {
    expect(slugifyTitle('Marketing Managers & Analysts')).toBe('marketing-managers-and-analysts')
    expect(slugifyTitle('Accountants & Auditors')).toBe('accountants-and-auditors')
    expect(slugifyTitle('Bookkeeping, Accounting, & Auditing Clerks')).toBe('bookkeeping-accounting-and-auditing-clerks')
  })
  it('collapses whitespace', () => {
    expect(slugifyTitle('Farm  and   Ranch Managers')).toBe('farm-and-ranch-managers')
  })
})

describe('resolveSlugCollisions', () => {
  it('returns same slug when no collision', () => {
    const taken = new Set<string>()
    expect(resolveSlugCollisions('registered-nurses', taken)).toBe('registered-nurses')
  })
  it('appends numeric suffix on collision', () => {
    const taken = new Set<string>(['nurses', 'nurses-2'])
    expect(resolveSlugCollisions('nurses', taken)).toBe('nurses-3')
  })
})
