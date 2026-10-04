import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {
    select: dbMocks.select,
  },
}))

import { onetOccupations } from '@/db/schema'
import { getOccupationsByCodes, type OccupationRow } from '../occupations'

const fixture: OccupationRow = {
  code: '99-9001.00',
  slug: 'mirror-lookups-fixture',
  title: 'Mirror Lookups Fixture',
  shortTitle: null,
  description: 'Synthetic test row.',
  shortDescription: null,
  jobZone: 4,
  brightOutlook: true,
  riasecPrimary: 'S',
  riasecAll: ['S', 'I', 'R'],
  salaryAnnualMedian: null,
  salaryHourlyMedian: null,
  outlookCategory: null,
}

const secondFixture: OccupationRow = {
  code: '99-9002.00',
  slug: 'mirror-lookups-second-fixture',
  title: 'Mirror Lookups Second Fixture',
  shortTitle: null,
  description: 'Second synthetic test row.',
  shortDescription: null,
  jobZone: 3,
  brightOutlook: false,
  riasecPrimary: 'C',
  riasecAll: ['C', 'E'],
  salaryAnnualMedian: 123_456,
  salaryHourlyMedian: null,
  outlookCategory: 'Average',
}

describe('getOccupationsByCodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMocks.where.mockResolvedValue([fixture, secondFixture])
    dbMocks.from.mockReturnValue({ where: dbMocks.where })
    dbMocks.select.mockReturnValue({ from: dbMocks.from })
  })

  it('returns an empty map without querying when no non-empty codes are requested', async () => {
    expect((await getOccupationsByCodes([])).size).toBe(0)
    expect((await getOccupationsByCodes([''])).size).toBe(0)
    expect(dbMocks.select).not.toHaveBeenCalled()
  })

  it('returns found rows keyed by code and skips duplicates or misses', async () => {
    const missingCode = '00-0000.00'

    const occupations = await getOccupationsByCodes([
      fixture.code,
      '',
      fixture.code,
      missingCode,
      secondFixture.code,
    ])

    expect(dbMocks.select).toHaveBeenCalledTimes(1)
    expect(dbMocks.from).toHaveBeenCalledWith(onetOccupations)
    expect(dbMocks.where).toHaveBeenCalledTimes(1)
    expect(occupations.size).toBe(2)
    expect(occupations.get(fixture.code)?.slug).toBe(fixture.slug)
    expect(occupations.get(secondFixture.code)?.salaryAnnualMedian).toBe(123_456)
    expect(occupations.get(secondFixture.code)?.outlookCategory).toBe('Average')
    expect(occupations.has(missingCode)).toBe(false)
  })
})
