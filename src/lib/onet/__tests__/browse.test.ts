import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { searchOccupations } from '../browse'

describe('searchOccupations', () => {
  // Synthetic codes/slugs so tests don't overlap with the real O*NET seed or
  // with fixtures from other test files running in parallel.
  const seed = [
    { code: '99-9101.00', slug: 'browse-fixture-nurses', title: 'Fixture Registered Nurses', description: '', jobZone: 4, brightOutlook: true, riasecPrimary: 'S', riasecAll: ['S', 'I', 'R'], salaryAnnualMedian: 81220, salaryHourlyMedian: null, outlookCategory: 'Bright' },
    { code: '99-9102.00', slug: 'browse-fixture-devs', title: 'Fixture Software Developers', description: '', jobZone: 4, brightOutlook: true, riasecPrimary: 'I', riasecAll: ['I', 'C'], salaryAnnualMedian: 127260, salaryHourlyMedian: null, outlookCategory: 'Bright' },
    { code: '99-9103.00', slug: 'browse-fixture-waiters', title: 'Fixture Waiters', description: '', jobZone: 2, brightOutlook: false, riasecPrimary: 'E', riasecAll: ['E', 'C'], salaryAnnualMedian: null, salaryHourlyMedian: 14, outlookCategory: 'Average' },
    { code: '99-9104.00', slug: 'browse-fixture-nps', title: 'Fixture Nurse Practitioners', description: '', jobZone: 5, brightOutlook: true, riasecPrimary: 'I', riasecAll: ['I', 'S'], salaryAnnualMedian: 128490, salaryHourlyMedian: null, outlookCategory: 'Bright' },
  ]
  const fixtureOnetIds = () => seed.map(r => r.code)

  beforeEach(async () => {
    await db.delete(onetOccupations)
      .where(inArray(onetOccupations.code, seed.map(r => r.code)))
    for (const r of seed) {
      await db.insert(onetOccupations).values(r)
    }
  })
  afterEach(async () => {
    await db.delete(onetOccupations)
      .where(inArray(onetOccupations.code, seed.map(r => r.code)))
  })

  it('keyword search matches title (case-insensitive)', async () => {
    const { rows, total } = await searchOccupations({ q: 'nurse', onetIds: fixtureOnetIds() })
    expect(total).toBe(2)
    expect(rows.map(r => r.slug).sort()).toEqual(['browse-fixture-nps', 'browse-fixture-nurses'])
  })

  it('filters by job zone', async () => {
    const { rows } = await searchOccupations({ zone: [2], onetIds: fixtureOnetIds() })
    expect(rows.map(r => r.slug)).toEqual(['browse-fixture-waiters'])
  })

  it('filters by bright outlook only', async () => {
    const { total } = await searchOccupations({ bright: true, onetIds: fixtureOnetIds() })
    expect(total).toBe(3)
  })

  it('filters by riasec overlap', async () => {
    const { rows } = await searchOccupations({ riasec: ['S'], onetIds: fixtureOnetIds() })
    expect(rows.map(r => r.slug).sort()).toEqual(['browse-fixture-nps', 'browse-fixture-nurses'])
  })

  it('paginates by page param (size 30)', async () => {
    const { rows, page, pageSize } = await searchOccupations({ page: 1, onetIds: fixtureOnetIds() })
    expect(page).toBe(1)
    expect(pageSize).toBe(30)
    expect(rows.length).toBeLessThanOrEqual(30)
  })

  it('orders by bright outlook, then typical pay, then title', async () => {
    const { rows } = await searchOccupations({ onetIds: fixtureOnetIds() })
    // Bright first (3 rows), ordered by salary desc; then the non-bright fixture.
    // Fixture salaries: nps 128490, devs 127260, nurses 81220; waiters hourly (non-bright).
    expect(rows.map(r => r.slug)).toEqual([
      'browse-fixture-nps',
      'browse-fixture-devs',
      'browse-fixture-nurses',
      'browse-fixture-waiters',
    ])
  })
})
