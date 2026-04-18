import { describe, it, expect } from 'vitest'
import { items } from '@/app/_data/items'
import { validateBank } from '../itemBank'

describe('the production item bank', () => {
  it('passes all bank validation rules', () => {
    const issues = validateBank(items)
    expect(issues).toEqual([])
  })

  it('contains at least 60 items', () => {
    expect(items.length).toBeGreaterThanOrEqual(60)
  })

  it('uses the recommended pair-distance ratio (~50% opposite, ~35% alternate, ~15% adjacent)', () => {
    const counts = {
      opposite: 0, alternate: 0, adjacent: 0, mixed: 0,
    }
    for (const it of items) counts[it.dimensionContrast] += 1
    const total = items.length - counts.mixed
    expect(counts.opposite / total).toBeGreaterThanOrEqual(0.4)
    expect(counts.opposite / total).toBeLessThanOrEqual(0.6)
    expect(counts.adjacent / total).toBeLessThanOrEqual(0.2)
  })
})
