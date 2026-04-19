import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { searchOccupations } from '../browse'

describe('searchOccupations', () => {
  const seed = [
    { code: '29-1141.00', slug: 'registered-nurses', title: 'Registered Nurses', description: '', jobZone: 4, brightOutlook: true, riasecPrimary: 'S', riasecAll: ['S', 'I', 'R'] },
    { code: '15-1252.00', slug: 'software-developers', title: 'Software Developers', description: '', jobZone: 4, brightOutlook: true, riasecPrimary: 'I', riasecAll: ['I', 'C'] },
    { code: '35-3031.00', slug: 'waiters-and-waitresses', title: 'Waiters and Waitresses', description: '', jobZone: 2, brightOutlook: false, riasecPrimary: 'E', riasecAll: ['E', 'C'] },
    { code: '29-1171.00', slug: 'nurse-practitioners', title: 'Nurse Practitioners', description: '', jobZone: 5, brightOutlook: true, riasecPrimary: 'I', riasecAll: ['I', 'S'] },
  ]

  beforeEach(async () => {
    for (const r of seed) {
      await db.insert(onetOccupations).values(r)
        .onConflictDoNothing()
    }
  })
  afterEach(async () => {
    await db.delete(onetOccupations)
      .where(inArray(onetOccupations.code, seed.map(r => r.code)))
  })

  it('keyword search matches title (case-insensitive)', async () => {
    const { rows, total } = await searchOccupations({ q: 'nurse' })
    expect(total).toBe(2)
    expect(rows.map(r => r.slug).sort()).toEqual(['nurse-practitioners', 'registered-nurses'])
  })

  it('filters by job zone', async () => {
    const { rows } = await searchOccupations({ zone: [2] })
    expect(rows.map(r => r.slug)).toEqual(['waiters-and-waitresses'])
  })

  it('filters by bright outlook only', async () => {
    const { total } = await searchOccupations({ bright: true })
    expect(total).toBe(3)
  })

  it('filters by riasec overlap', async () => {
    const { rows } = await searchOccupations({ riasec: ['S'] })
    expect(rows.map(r => r.slug).sort()).toEqual(['nurse-practitioners', 'registered-nurses'])
  })

  it('paginates by page param (size 30)', async () => {
    const { rows, page, pageSize } = await searchOccupations({ page: 1 })
    expect(page).toBe(1)
    expect(pageSize).toBe(30)
    expect(rows.length).toBeLessThanOrEqual(30)
  })
})
