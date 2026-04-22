import { describe, it, expect } from 'vitest'
import { formatOnetJobGrowth, formatOnetSalary, mergeCareerWithOnet } from '../recommendation-onet'
import type { OccupationRow } from '@/lib/onet/occupations'

const onet: OccupationRow = {
  code: '15-1252.00',
  slug: 'software-developers',
  title: 'Software Developers',
  shortTitle: null,
  description: 'Test description from mirror.',
  shortDescription: null,
  jobZone: 4,
  brightOutlook: true,
  riasecPrimary: 'I',
  riasecAll: ['I', 'C'],
  salaryAnnualMedian: 127260,
  salaryHourlyMedian: null,
  outlookCategory: 'Bright',
}

describe('recommendation-onet', () => {
  it('formatOnetSalary prefers annual', () => {
    expect(
      formatOnetSalary({ salaryAnnualMedian: 100_000, salaryHourlyMedian: 40 }),
    ).toBe('$100,000/yr')
  })

  it('formatOnetSalary uses hourly when no annual', () => {
    expect(
      formatOnetSalary({ salaryAnnualMedian: null, salaryHourlyMedian: 18 }),
    ).toBe('$18/hr')
  })

  it('formatOnetJobGrowth uses outlook category', () => {
    expect(formatOnetJobGrowth({ outlookCategory: 'Average', brightOutlook: false })).toBe('Average')
  })

  it('formatOnetJobGrowth falls back to bright outlook', () => {
    expect(formatOnetJobGrowth({ outlookCategory: null, brightOutlook: true })).toBe('Bright outlook')
  })

  it('mergeCareerWithOnet prefers O*NET fields and keeps whyItMatches', () => {
    const ai = {
      title: 'Wrong title',
      description: 'Wrong desc',
      onetId: '15-1252.00',
      whyItMatches: 'This is why it fits you.',
      jobGrowth: 'AI growth',
      salaryRange: 'AI salary',
    }
    const out = mergeCareerWithOnet(ai, onet)
    expect(out.title).toBe('Software Developers')
    expect(out.description).toBe('Test description from mirror.')
    expect(out.whyItMatches).toBe('This is why it fits you.')
    expect(out.salaryRange).toMatch(/127,260.*yr/)
    expect(out.jobGrowth).toBe('Bright')
    expect(out.slug).toBe('software-developers')
    expect(out.riasecCodes).toEqual(['I', 'C'])
  })

  it('mergeCareerWithOnet passes through AI when no mirror row', () => {
    const out = mergeCareerWithOnet(
      {
        title: 'T',
        description: 'D',
        onetId: '99-9999.99',
        whyItMatches: 'W',
        jobGrowth: 'G',
        salaryRange: 'S',
      },
      null,
    )
    expect(out.title).toBe('T')
    expect(out.jobGrowth).toBe('G')
    expect(out.salaryRange).toBe('S')
    expect(out.riasecCodes).toEqual([])
  })

  it('mergeCareerWithOnet prefers short_title and short_description when present', () => {
    const withShort: OccupationRow = {
      ...onet,
      shortTitle: 'Software Devs',
      shortDescription: 'Build software.',
    }
    const out = mergeCareerWithOnet(
      {
        title: 'Wrong title',
        description: 'Wrong desc',
        onetId: '15-1252.00',
        whyItMatches: 'W',
      },
      withShort,
    )
    expect(out.title).toBe('Software Devs')
    expect(out.description).toBe('Build software.')
  })

  it('mergeCareerWithOnet uses em dash when mirror and AI are empty strings', () => {
    const sparse: OccupationRow = {
      ...onet,
      salaryAnnualMedian: null,
      salaryHourlyMedian: null,
      outlookCategory: null,
      brightOutlook: false,
    }
    const out = mergeCareerWithOnet(
      {
        title: 'T',
        description: 'D',
        onetId: '15-1252.00',
        whyItMatches: 'W',
        jobGrowth: '',
        salaryRange: '   ',
      },
      sparse,
    )
    expect(out.jobGrowth).toBe('—')
    expect(out.salaryRange).toBe('—')
  })
})
