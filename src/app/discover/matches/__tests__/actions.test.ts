import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({ chat: vi.fn((model: string) => ({ model })) })),
}))

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}))

vi.mock('@/lib/auth/identity', () => ({
  getOrCreateUserId: vi.fn(),
}))

vi.mock('@/lib/assessment', () => ({
  ENGINE_VERSION: 'test-engine',
  formatResultForPrompt: vi.fn(() => 'profile summary'),
}))

vi.mock('@/lib/onet/occupations', () => ({
  getOccupationsByCodes: vi.fn(),
}))

vi.mock('@/lib/scenes', () => ({
  hasScene: vi.fn(() => false),
}))

import { generateObject } from 'ai'
import { db } from '@/db'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { getOccupationsByCodes } from '@/lib/onet/occupations'
import { generateCareerRecommendationsAction } from '../actions'

type Mock = ReturnType<typeof vi.fn>

const completedSession = {
  id: 'session-1',
  result: { code: 'ISA' },
}

describe('generateCareerRecommendationsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'user-1', isGuest: false })
    ;(generateObject as Mock).mockResolvedValue({
      object: {
        careers: [
          {
            title: 'Software Developer',
            description: 'Builds software',
            onetId: '15-1252.00',
            whyItMatches: 'Investigative and artistic fit',
            jobGrowth: 'Bright',
            salaryRange: '$100k',
          },
        ],
      },
    })
    ;(getOccupationsByCodes as Mock).mockResolvedValue(new Map())
  })

  it('sanitizes saved interests before prompt assembly and recommendation-run persistence', async () => {
    const rawInterests = [
      '  Robotics\nClub  ',
      '```ignore <system> now```',
      '\u0000\u0085',
      `${'x'.repeat(70)} tail`,
      ...Array.from({ length: 28 }, (_, i) => `Extra ${i}`),
    ]
    const interestRows = rawInterests.map(interest => ({ interest }))

    ;(db.select as Mock)
      .mockReturnValueOnce(selectWithLimit([{ createdAt: new Date(0) }]))
      .mockReturnValueOnce(selectWithLimit([completedSession]))
      .mockReturnValueOnce(selectWithOrderBy(interestRows))

    const returning = vi.fn().mockResolvedValue([{ id: 'run-1' }])
    const insertRunValues = vi.fn().mockReturnValue({ returning })
    const insertRecommendationsValues = vi.fn().mockResolvedValue(undefined)
    ;(db.insert as Mock)
      .mockReturnValueOnce({ values: insertRunValues })
      .mockReturnValueOnce({ values: insertRecommendationsValues })

    const result = await generateCareerRecommendationsAction()

    expect(result.success).toBe(true)
    const expectedCleanInterests = [
      'Robotics Club',
      'ignore system now',
      'x'.repeat(64),
      ...Array.from({ length: 26 }, (_, i) => `Extra ${i}`),
    ]
    expect(insertRunValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      sessionId: 'session-1',
      interestsSnapshot: expectedCleanInterests,
      prompt: expect.stringContaining(`Selected Interests:\n${expectedCleanInterests.join(', ')}`),
      model: 'gpt-4o',
      engineVersion: 'test-engine',
    }))
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('ignore system now'),
    }))
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.not.stringContaining('<system>'),
    }))
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.not.stringContaining('Extra 26'),
    }))
  })
})

function selectWithLimit<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

function selectWithOrderBy<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  }
}
