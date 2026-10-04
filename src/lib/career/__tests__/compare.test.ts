import { describe, expect, it } from 'vitest'
import {
  COMPARE_MAX,
  parseCompareIds,
  projectCareerCompareItem,
} from '../compare'
import type { AssessmentResult } from '@/lib/assessment/types'
import type { CareerDetail } from '@/lib/onet/schemas'
import type { OccupationRow } from '@/lib/onet/occupations'

const occupation: OccupationRow = {
  code: '15-1252.00',
  slug: 'software-developers',
  title: 'Software Developers',
  shortTitle: 'Software Devs',
  description: 'Develop and test software.',
  shortDescription: 'Build software.',
  jobZone: 4,
  brightOutlook: true,
  riasecPrimary: 'I',
  riasecAll: ['I', 'C'],
  salaryAnnualMedian: 127_260,
  salaryHourlyMedian: null,
  outlookCategory: 'Bright',
}

const detail: CareerDetail = {
  code: '15-1252.00',
  title: 'Software Developers',
  description: 'Research, design, and develop computer applications.',
  brightOutlook: true,
  tasks: [
    'Analyze information to determine software requirements.',
    'Modify existing software to correct errors.',
    'Collaborate with programmers and designers.',
    'Store and retrieve data.',
    'Document application development.',
    'Extra task should be trimmed.',
  ],
  skills: [
    'Critical Thinking',
    'Programming',
    'Complex Problem Solving',
    'Active Learning',
    'Systems Analysis',
    'Reading Comprehension',
    'Quality Control Analysis',
    'Operations Analysis',
    'Extra skill should be trimmed.',
  ],
  knowledge: ['Computers and Electronics', 'Mathematics', 'Engineering and Technology'],
  technology: ['Git', 'SQL', 'TypeScript'],
  jobZone: 4,
  riasecNames: ['Investigative', 'Conventional'],
  salaryAnnualMedian: 130_000,
  salaryHourlyMedian: null,
  outlookCategory: 'Bright',
  outlookDescription: 'New job opportunities are very likely.',
  relatedCareers: [{ code: '15-1254.00', title: 'Web Developers' }],
}

const profileResult: AssessmentResult = {
  hollandCode: 'ICR',
  riasec: {} as AssessmentResult['riasec'],
  workValues: { top: [], all: {} as AssessmentResult['workValues']['all'] },
  workContext: {
    structureVariety: { lean: 'variety', strength: 0.7, confidence: 'high' },
    indoorOutdoor: { lean: 'indoor', strength: 0.8, confidence: 'medium' },
    soloTeam: { lean: 'team', strength: 0.6, confidence: 'high' },
  },
  meta: {
    itemsAnswered: 16,
    itemsSkipped: 0,
    completedAt: '2026-01-01T00:00:00.000Z',
    engineVersion: 'test',
    inconsistencyFlag: false,
  },
}

describe('parseCompareIds', () => {
  it('trims, deduplicates, and caps compare ids', () => {
    expect(parseCompareIds(' 15-1252.00,29-1141.00,15-1252.00,11-1021.00,13-2011.00 ')).toEqual([
      '15-1252.00',
      '29-1141.00',
      '11-1021.00',
    ])
    expect(parseCompareIds('a,b,c,d')).toHaveLength(COMPARE_MAX)
  })
})

describe('projectCareerCompareItem', () => {
  it('projects rich O*NET detail and keeps the personalized match reason', () => {
    const item = projectCareerCompareItem({
      occupation,
      detail,
      matchReason: 'Your investigative strengths map well to building software.',
      profileResult,
      relatedSlugs: new Map([['15-1254.00', 'web-developers']]),
    })

    expect(item.dataStatus).toBe('complete')
    expect(item.fit.label).toBe('Personalized match')
    expect(item.fit.explanation).toMatch(/investigative strengths/)
    expect(item.pay.label).toBe('$130,000/yr median')
    expect(item.outlook.description).toMatch(/very likely/)
    expect(item.jobZone.name).toMatch(/Considerable/)
    expect(item.tasks).toHaveLength(5)
    expect(item.skills).toHaveLength(8)
    expect(item.technology).toEqual(['Git', 'SQL', 'TypeScript'])
    expect(item.relatedCareers).toEqual([
      { code: '15-1254.00', title: 'Web Developers', slug: 'web-developers' },
    ])
    expect(item.workContext.label).toMatch(/variety/)
  })

  it('remains useful when live O*NET detail fails', () => {
    const item = projectCareerCompareItem({
      occupation,
      detail: null,
      profileResult,
    })

    expect(item.dataStatus).toBe('partial')
    expect(item.missingDetailLabel).toMatch(/temporarily unavailable/)
    expect(item.description).toBe('Develop and test software.')
    expect(item.pay.label).toBe('$127,260/yr median')
    expect(item.outlook.label).toBe('Bright')
    expect(item.outlook.bright).toBe(true)
    expect(item.tasks).toEqual([])
    expect(item.skills).toEqual([])
    expect(item.jobZone.number).toBe(4)
    expect(item.fit.explanation).toMatch(/Shares Investigative and Conventional/)
  })

  it('falls back to an explicit empty fit explanation without profile context', () => {
    const item = projectCareerCompareItem({
      occupation: {
        ...occupation,
        riasecAll: [],
        salaryAnnualMedian: null,
        outlookCategory: null,
        brightOutlook: false,
      },
      detail: null,
      profileResult: null,
    })

    expect(item.fit.label).toBe('Needs profile context')
    expect(item.pay.label).toBe('Pay data unavailable')
    expect(item.outlook.label).toBe('Outlook unavailable')
    expect(item.workContext.explanation).toMatch(/proxies/)
  })
})
