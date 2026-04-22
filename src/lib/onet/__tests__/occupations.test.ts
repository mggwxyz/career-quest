import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { resolveSlug, getOccupationByCode, getSlugsByOnetCodes } from '../occupations'

describe('mirror lookups', () => {
  const fixture = {
    code: '29-1141.00',
    slug: 'registered-nurses',
    title: 'Registered Nurses',
    description: 'Assess patient health problems and needs.',
    jobZone: 4,
    brightOutlook: true,
    riasecPrimary: 'S' as const,
    riasecAll: ['S', 'I', 'R'],
  }

  beforeEach(async () => {
    await db.insert(onetOccupations).values(fixture)
      .onConflictDoNothing()
  })
  afterEach(async () => {
    await db.delete(onetOccupations).where(eq(onetOccupations.code, fixture.code))
  })

  it('resolveSlug returns the row shape by slug', async () => {
    const row = await resolveSlug('registered-nurses')
    expect(row?.code).toBe('29-1141.00')
    expect(row?.jobZone).toBe(4)
    expect(row?.riasecAll).toEqual(['S', 'I', 'R'])
  })

  it('resolveSlug returns null for unknown slug', async () => {
    expect(await resolveSlug('not-a-career')).toBeNull()
  })

  it('getOccupationByCode returns the row shape by code', async () => {
    const row = await getOccupationByCode('29-1141.00')
    expect(row?.slug).toBe('registered-nurses')
  })

  it('getOccupationByCode returns null for unknown code', async () => {
    expect(await getOccupationByCode('00-0000.00')).toBeNull()
  })

  it('getSlugsByOnetCodes returns a map of code to slug', async () => {
    const m = await getSlugsByOnetCodes(['29-1141.00', '00-0000.00'])
    expect(m.get('29-1141.00')).toBe('registered-nurses')
    expect(m.has('00-0000.00')).toBe(false)
  })

  it('getSlugsByOnetCodes returns empty map for empty input', async () => {
    expect((await getSlugsByOnetCodes([])).size).toBe(0)
  })
})
