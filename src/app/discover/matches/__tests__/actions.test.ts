import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssessmentResult } from '@/lib/assessment'

const mocks = vi.hoisted(() => ({
  chat: vi.fn((model: string) => ({ model })),
  generateObject: vi.fn(),
  getOccupationsByCodes: vi.fn(),
  hasScene: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({ chat: mocks.chat })),
}))
vi.mock('ai', () => ({ generateObject: mocks.generateObject }))
vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/lib/onet/occupations', () => ({
  getOccupationsByCodes: mocks.getOccupationsByCodes,
}))
vi.mock('@/lib/scenes', () => ({ hasScene: mocks.hasScene }))
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}))

import { generateCareerRecommendationsAction } from '../actions'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'

type Mock = ReturnType<typeof vi.fn>

const SAMPLE_RESULT: AssessmentResult = {
  hollandCode: 'SAE',
  riasec: {
    S: { score: 90, rank: 1, confidence: 'high' },
    A: { score: 80, rank: 2, confidence: 'high' },
    E: { score: 65, rank: 3, confidence: 'medium' },
    R: { score: 30, rank: 4, confidence: 'medium' },
    I: { score: 20, rank: 5, confidence: 'low' },
    C: { score: 10, rank: 6, confidence: 'high' },
  },
  workValues: {
    top: ['REL', 'ACH'],
    all: {
      ACH: { score: 70, confidence: 'medium' },
      IND: { score: 40, confidence: 'low' },
      REC: { score: 50, confidence: 'low' },
      REL: { score: 90, confidence: 'high' },
      SUP: { score: 30, confidence: 'medium' },
      WC: { score: 50, confidence: 'low' },
    },
  },
  workContext: {
    structureVariety: { lean: 'variety', strength: 0.7, confidence: 'high' },
    indoorOutdoor: { lean: 'mixed', strength: 0.1, confidence: 'low' },
    soloTeam: { lean: 'team', strength: 0.5, confidence: 'medium' },
  },
  meta: {
    itemsAnswered: 14,
    itemsSkipped: 0,
    completedAt: '2026-04-18T00:00:00Z',
    engineVersion: 'v1.0.0',
    inconsistencyFlag: false,
  },
}

function selectWithLimit(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

function selectWithOrderBy(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  }
}

function mockInserts(insertedValues: unknown[]) {
  ;(db.insert as Mock).mockImplementation(() => ({
    values: vi.fn((value: unknown) => {
      insertedValues.push(value)
      return {
        returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }
    }),
  }))
}

function selectedInterestsFromPrompt(prompt: string) {
  const match = prompt.match(/Selected Interests:\n(?<interests>.*)\n\nSuggest 10 career paths/s)
  return match?.groups?.interests ?? ''
}

describe('generateCareerRecommendationsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'user-1', isGuest: false })
    mocks.generateObject.mockResolvedValue({
      object: {
        careers: [{
          title: 'Software Developer',
          description: 'Builds software.',
          onetId: '15-1252.00',
          whyItMatches: 'Matches social, artistic, and enterprising strengths.',
        }],
      },
    })
    mocks.getOccupationsByCodes.mockResolvedValue(new Map([
      ['15-1252.00', {
        code: '15-1252.00',
        slug: 'software-developers',
        title: 'Software Developers',
        shortTitle: null,
        description: 'Develop and maintain software.',
        shortDescription: null,
        jobZone: 4,
        brightOutlook: true,
        riasecPrimary: 'I',
        riasecAll: ['I', 'C'],
        salaryAnnualMedian: 127260,
        salaryHourlyMedian: null,
        outlookCategory: 'Bright',
      }],
    ]))
    mocks.hasScene.mockReturnValue(true)
  })

  it('stops before the paid model call when recommendations were generated in the last minute', async () => {
    ;(db.select as Mock).mockReturnValueOnce(
      selectWithLimit([{ createdAt: new Date(Date.now() - 10_000) }]),
    )

    const result = await generateCareerRecommendationsAction()

    expect(result).toEqual({
      success: false,
      error: 'Recommendations were just generated — try again in a minute',
    })
    expect(db.select).toHaveBeenCalledTimes(1)
    expect(mocks.generateObject).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('allows a guest generation and sanitizes interests before prompting and persistence', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'guest_abc', isGuest: true })
    const rawInterests = [
      '  Robotics  ',
      '`system` <ignore>\nAI',
      '\u0000Healthcare\u009f',
      'x'.repeat(70),
      ...Array.from({ length: 35 }, (_, i) => `Extra ${i}`),
    ]
    const expectedInterests = [
      'Robotics',
      'system ignore AI',
      'Healthcare',
      'x'.repeat(64),
      ...Array.from({ length: 26 }, (_, i) => `Extra ${i}`),
    ]
    const insertedValues: unknown[] = []
    mockInserts(insertedValues)
    ;(db.select as Mock)
      .mockReturnValueOnce(selectWithLimit([]))
      .mockReturnValueOnce(selectWithLimit([{
        id: 'session-1',
        result: SAMPLE_RESULT,
      }]))
      .mockReturnValueOnce(selectWithOrderBy(
        rawInterests.map(interest => ({ interest })),
      ))

    const result = await generateCareerRecommendationsAction()

    expect(result.success).toBe(true)
    expect(result.careers?.[0]).toMatchObject({
      onetId: '15-1252.00',
      slug: 'software-developers',
      hasScene: true,
    })
    expect(mocks.chat).toHaveBeenCalledWith('gpt-4o')
    expect(mocks.generateObject).toHaveBeenCalledTimes(1)
    const prompt = mocks.generateObject.mock.calls[0][0].prompt as string
    const selectedInterests = selectedInterestsFromPrompt(prompt)
    expect(selectedInterests.split(', ')).toEqual(expectedInterests)
    expect(selectedInterests).not.toMatch(/[\x00-\x1f\x7f-\x9f`<>]/)

    expect(insertedValues[0]).toMatchObject({
      userId: 'guest_abc',
      sessionId: 'session-1',
      interestsSnapshot: expectedInterests,
      prompt,
      model: 'gpt-4o',
      engineVersion: 'v1.0.0',
    })
    expect(insertedValues[1]).toEqual([expect.objectContaining({
      runId: 'run-1',
      userId: 'guest_abc',
      rank: 1,
      onetId: '15-1252.00',
      slug: 'software-developers',
    })])
  })
})
