import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/auth/identity', () => ({ getUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))
vi.mock('@/components/guest-save-banner', () => ({
  GuestSaveBanner: () => <div data-testid="guest-save-banner" />,
}))
vi.mock('../_components/CareersClient', () => ({
  default: ({ initialCareers }: { initialCareers: Array<{ title: string }> }) => (
    <div data-testid="careers-client">
      {initialCareers.map(career => career.title).join('|')}
    </div>
  ),
}))
vi.mock('@/lib/onet/occupations', () => ({
  getOccupationsByCodes: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('@/lib/scenes', () => ({
  hasScene: vi.fn().mockReturnValue(false),
}))

import MatchesPage from '../page'
import { db } from '@/db'
import { getUserId } from '@/lib/auth/identity'

type Mock = ReturnType<typeof vi.fn>

const previousRunRecommendation = {
  id: 'rec-1',
  runId: 'previous-run',
  userId: 'u1',
  rank: 1,
  onetId: '15-1252.00',
  slug: 'software-developers',
  title: 'Software Developers',
  description: 'Build and maintain software.',
  whyItMatches: 'Investigative and creative work fits your profile.',
  jobGrowth: 'Bright',
  salaryRange: '$127,260/yr',
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
}

function collectParamValues(value: unknown, seen = new WeakSet<object>()): unknown[] {
  if (!value || typeof value !== 'object') {
    return []
  }
  if (seen.has(value)) {
    return []
  }
  seen.add(value)
  const object = value as { constructor?: { name?: string }, value?: unknown }
  if (object.constructor?.name === 'Param') {
    return [object.value]
  }
  return Object.values(object).flatMap(child => collectParamValues(child, seen))
}

function createSelectChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

describe('MatchesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
  })

  it('loads recommendations from the latest run that actually has recommendation rows', async () => {
    const latestRunLookup = createSelectChain([
      { id: 'orphan-run', runId: 'previous-run' },
    ])
    let requestedRunId: unknown
    const recommendationRows = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn((predicate: unknown) => {
        requestedRunId = collectParamValues(predicate).at(-1)
        return recommendationRows
      }),
      orderBy: vi.fn(() => (
        requestedRunId === 'previous-run'
          ? Promise.resolve([previousRunRecommendation])
          : Promise.resolve([])
      )),
    }
    ;(db.select as Mock)
      .mockReturnValueOnce(latestRunLookup)
      .mockReturnValueOnce(recommendationRows)

    render(await MatchesPage())

    expect(screen.getByTestId('careers-client')).toHaveTextContent('Software Developers')
  })
})
