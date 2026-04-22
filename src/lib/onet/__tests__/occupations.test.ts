import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { resolveSlug, getOccupationByCode, getSlugsByOnetCodes } from '../occupations'

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

  beforeEach(async () => {
    await db.delete(onetOccupations).where(eq(onetOccupations.code, fixture.code))
    await db.insert(onetOccupations).values(fixture)
  })
  afterEach(async () => {
    await db.delete(onetOccupations).where(eq(onetOccupations.code, fixture.code))
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

  it('getSlugsByOnetCodes returns a map of code to slug', async () => {
    const m = await getSlugsByOnetCodes([fixture.code, '00-0000.00'])
    expect(m.get(fixture.code)).toBe(fixture.slug)
    expect(m.has('00-0000.00')).toBe(false)
  })

  it('getSlugsByOnetCodes returns empty map for empty input', async () => {
    expect((await getSlugsByOnetCodes([])).size).toBe(0)
  })
})
