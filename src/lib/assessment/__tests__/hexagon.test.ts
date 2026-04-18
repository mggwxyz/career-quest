// src/lib/assessment/__tests__/hexagon.test.ts
import { describe, it, expect } from 'vitest'
import { hexagonDistance, contrastCategory } from '../hexagon'

describe('hexagonDistance', () => {
  it.each([
    ['R', 'R', 0],
    ['R', 'I', 1], ['I', 'A', 1], ['A', 'S', 1], ['S', 'E', 1], ['E', 'C', 1], ['C', 'R', 1],
    ['R', 'A', 2], ['I', 'S', 2], ['A', 'E', 2], ['S', 'C', 2], ['E', 'R', 2], ['C', 'I', 2],
    ['R', 'S', 3], ['I', 'E', 3], ['A', 'C', 3],
  ] as const)('distance(%s, %s) === %i', (a, b, expected) => {
    expect(hexagonDistance(a, b)).toBe(expected)
    expect(hexagonDistance(b, a)).toBe(expected) // symmetric
  })
})

describe('contrastCategory', () => {
  it('classifies single-scale pairs by hexagon distance', () => {
    expect(contrastCategory(['R'], ['S'])).toBe('opposite')
    expect(contrastCategory(['R'], ['A'])).toBe('alternate')
    expect(contrastCategory(['R'], ['I'])).toBe('adjacent')
  })

  it('returns "mixed" when an option lists multiple scales', () => {
    expect(contrastCategory(['R', 'I'], ['S'])).toBe('mixed')
  })
})
