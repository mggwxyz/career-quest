import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { resolveSlug, getOccupationByCode, getOccupationsByCodes, getSlugsByOnetCodes } from '../occupations'

describe('mirror lookups', () => {
  // Synthetic code/slug that won't collide with real seed data or with
  // fixtures from other test files running in parallel.
  const fixture = {
    code: '99-9001.00',
    slug: 'mirror-lookups-fixture',
    title: 'Mirror Lookups Fixture',
    description: 'Synthetic test row.',
    jobZone: 4,
    brightOutlook: true,
    riasecPrimary: 'S' as const,
    riasecAll: ['S', 'I', 'R'],
  }
  const secondFixture = {
    code: '99-9002.00',
    slug: 'mirror-lookups-second-fixture',
    title: 'Mirror Lookups Second Fixture',
    description: 'Second synthetic test row.',
    jobZone: 3,
    brightOutlook: false,
    riasecPrimary: 'C' as const,
    riasecAll: ['C', 'E'],
    salaryAnnualMedian: 123_456,
    outlookCategory: 'Average',
  }
  const fixtureCodes = [fixture.code, secondFixture.code]

  beforeEach(async () => {
    await db.delete(onetOccupations).where(inArray(onetOccupations.code, fixtureCodes))
    await db.insert(onetOccupations).values([fixture, secondFixture])
  })
  afterEach(async () => {
    await db.delete(onetOccupations).where(inArray(onetOccupations.code, fixtureCodes))
  })

  it('resolveSlug returns the row shape by slug', async () => {
    const row = await resolveSlug(fixture.slug)
    expect(row?.code).toBe(fixture.code)
    expect(row?.jobZone).toBe(4)
    expect(row?.riasecAll).toEqual(['S', 'I', 'R'])
  })

  it('resolveSlug returns null for unknown slug', async () => {
    expect(await resolveSlug('not-a-career')).toBeNull()
  })

  it('getOccupationByCode returns the row shape by code', async () => {
    const row = await getOccupationByCode(fixture.code)
    expect(row?.slug).toBe(fixture.slug)
  })

  it('getOccupationByCode returns null for unknown code', async () => {
    expect(await getOccupationByCode('00-0000.00')).toBeNull()
  })

  it('getOccupationsByCodes returns empty map when no valid codes are requested', async () => {
    expect((await getOccupationsByCodes([])).size).toBe(0)
    expect((await getOccupationsByCodes([''])).size).toBe(0)
  })

  it('getOccupationsByCodes returns found rows keyed by code and skips duplicates or misses', async () => {
    const missingCode = '00-0000.00'

    const occupations = await getOccupationsByCodes([
      fixture.code,
      '',
      fixture.code,
      missingCode,
      secondFixture.code,
    ])

    expect(occupations.size).toBe(2)
    expect(occupations.get(fixture.code)?.slug).toBe(fixture.slug)
    expect(occupations.get(secondFixture.code)?.salaryAnnualMedian).toBe(123_456)
    expect(occupations.get(secondFixture.code)?.outlookCategory).toBe('Average')
    expect(occupations.has(missingCode)).toBe(false)
  })

  it('getSlugsByOnetCodes returns a map of code to slug', async () => {
    const m = await getSlugsByOnetCodes([fixture.code, '00-0000.00'])
    expect(m.get(fixture.code)).toBe(fixture.slug)
    expect(m.has('00-0000.00')).toBe(false)
  })

  it('getSlugsByOnetCodes returns empty map for empty input', async () => {
    expect((await getSlugsByOnetCodes([])).size).toBe(0)
  })
})
