import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssessmentResult } from '@/lib/assessment'

const mocks = vi.hoisted(() => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn((model: string) => ({ model })),
  })),
  dbInsert: vi.fn(),
  dbSelect: vi.fn(),
  generateObject: vi.fn(),
  getOccupationsByCodes: vi.fn(),
  getOrCreateUserId: vi.fn(),
  hasScene: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: mocks.createOpenAI,
}))

vi.mock('ai', () => ({
  generateObject: mocks.generateObject,
}))

vi.mock('@/db', () => ({
  db: {
    insert: mocks.dbInsert,
    select: mocks.dbSelect,
  },
}))

vi.mock('@/lib/auth/identity', () => ({
  getOrCreateUserId: mocks.getOrCreateUserId,
}))

vi.mock('@/lib/onet/occupations', () => ({
  getOccupationsByCodes: mocks.getOccupationsByCodes,
}))

vi.mock('@/lib/scenes', () => ({
  hasScene: mocks.hasScene,
}))

import { generateCareerRecommendationsAction } from '../actions'

const assessmentResult: AssessmentResult = {
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
    completedAt: '2026-04-18T00:00:00Z',
    engineVersion: 'v1.0.0',
    inconsistencyFlag: false,
    itemsAnswered: 14,
    itemsSkipped: 0,
  },
}

function limitSelect<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  }
}

function orderedSelect<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
    where: vi.fn().mockReturnThis(),
  }
}

function mockSuccessfulGenerationInserts() {
  const recommendationRunInsert = {
    returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
    values: vi.fn().mockReturnThis(),
  }
  const careerRecommendationsInsert = {
    values: vi.fn().mockResolvedValue(undefined),
  }
  mocks.dbInsert
    .mockReturnValueOnce(recommendationRunInsert)
    .mockReturnValueOnce(careerRecommendationsInsert)
  return { careerRecommendationsInsert, recommendationRunInsert }
}

describe('generateCareerRecommendationsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrCreateUserId.mockResolvedValue({ id: 'user-1', isGuest: false })
    mocks.generateObject.mockResolvedValue({
      object: {
        careers: [{
          description: 'Build software.',
          onetId: '15-1252.00',
          title: 'Software Developers',
          whyItMatches: 'Matches investigative and artistic interests.',
        }],
      },
    })
    mocks.getOccupationsByCodes.mockResolvedValue(new Map())
    mocks.hasScene.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('blocks a paid AI generation when the user has a recent recommendation run', async () => {
    const now = new Date('2026-08-11T10:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    mocks.dbSelect.mockReturnValueOnce(limitSelect([
      { createdAt: new Date(now.getTime() - 30_000) },
    ]))

    const result = await generateCareerRecommendationsAction()

    expect(result).toEqual({
      error: 'Recommendations were just generated — try again in a minute',
      success: false,
    })
    expect(mocks.generateObject).not.toHaveBeenCalled()
    expect(mocks.dbInsert).not.toHaveBeenCalled()
  })

  it('sanitizes stored interests before sending them to OpenAI and saving the prompt snapshot', async () => {
    const { recommendationRunInsert } = mockSuccessfulGenerationInserts()
    mocks.dbSelect
      .mockReturnValueOnce(limitSelect([]))
      .mockReturnValueOnce(limitSelect([{ id: 'session-1', result: assessmentResult }]))
      .mockReturnValueOnce(orderedSelect([
        { interest: '  Robotics`<script>\nAI  ' },
        { interest: `${'x'.repeat(70)} tail` },
        { interest: ' \u0000`<>   ' },
      ]))

    const result = await generateCareerRecommendationsAction()

    expect(result.success).toBe(true)
    expect(mocks.generateObject).toHaveBeenCalledTimes(1)
    const generationPayload = mocks.generateObject.mock.calls[0][0]
    expect(generationPayload.prompt).toContain(
      `Selected Interests:\nRobotics script AI, ${'x'.repeat(64)}`,
    )
    expect(generationPayload.prompt).not.toContain('Robotics`')
    expect(generationPayload.prompt).not.toContain('<script>')
    expect(generationPayload.prompt).not.toContain('x'.repeat(65))

    expect(recommendationRunInsert.values).toHaveBeenCalledWith(expect.objectContaining({
      interestsSnapshot: ['Robotics script AI', 'x'.repeat(64)],
      prompt: generationPayload.prompt,
      userId: 'user-1',
    }))
  })
})
