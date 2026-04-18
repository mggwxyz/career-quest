import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db module the same way route.test.ts does. Must be declared
// before importing anything that transitively reaches `@/db`.
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}))

import { items } from '@/app/_data/items'
import { initialPosterior } from '@/lib/assessment'
import { loadActiveSession, rebuildSessionFromLog } from '../serverSession'
import { db } from '@/db'

describe('rebuildSessionFromLog', () => {
  it('returns a fresh session and null lastAdvance for an empty log', () => {
    const { session, lastAdvance } = rebuildSessionFromLog({
      gradeBand: undefined,
      responses: [],
    })
    expect(lastAdvance).toBeNull()
    expect(session.responses).toHaveLength(0)
    expect(session.seenItemIds.size).toBe(0)
  })

  it('silently drops unknown itemIds instead of throwing', () => {
    expect(() =>
      rebuildSessionFromLog({
        gradeBand: undefined,
        responses: [
          { itemId: 'this-item-does-not-exist', choice: 1, responseMs: 1200 },
        ],
      }),
    ).not.toThrow()

    const { session, lastAdvance } = rebuildSessionFromLog({
      gradeBand: undefined,
      responses: [
        { itemId: 'this-item-does-not-exist', choice: 1, responseMs: null },
      ],
    })
    // Unknown item was dropped — equivalent to an empty log.
    expect(lastAdvance).toBeNull()
    expect(session.responses).toHaveLength(0)
  })

  it('skips responses with choice: null (shown-but-unanswered)', () => {
    const firstItem = items[0]
    const { session, lastAdvance } = rebuildSessionFromLog({
      gradeBand: undefined,
      responses: [
        { itemId: firstItem.id, choice: null, responseMs: null },
      ],
    })
    expect(lastAdvance).toBeNull()
    expect(session.responses).toHaveLength(0)
  })

  it('replays three valid responses and updates the session', () => {
    const chosen = items.slice(0, 3)
    const responses = chosen.map((it, i) => ({
      itemId: it.id,
      choice: (i % 2 === 0 ? 1 : 2) as 1 | 2,
      responseMs: 1000 + i,
    }))

    const { session, lastAdvance } = rebuildSessionFromLog({
      gradeBand: undefined,
      responses,
    })

    expect(session.responses).toHaveLength(3)
    expect(lastAdvance).not.toBeNull()
    expect(['next', 'stop']).toContain(lastAdvance!.kind)

    // Posterior must have moved from the initial flat prior.
    const prior = initialPosterior()
    const moved = (['R', 'I', 'A', 'S', 'E', 'C'] as const).some(
      s =>
        session.posterior.riasec[s].mean !== prior.riasec[s].mean
        || session.posterior.riasec[s].variance !== prior.riasec[s].variance,
    )
    expect(moved).toBe(true)
  })
})

describe('loadActiveSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when the user has no active session', async () => {
    // First db.select() is the session lookup — return empty.
    const sessionChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(sessionChain)

    const result = await loadActiveSession('u1')
    expect(result).toBeNull()
  })

  it('returns an empty-responses payload when an active session has no rows yet', async () => {
    const posterior = initialPosterior()
    const sessionRow = {
      id: 'sess-1',
      userId: 'u1',
      gradeBand: 'middle',
      engineVersion: 'v1.0.0',
      posterior,
      inconsistency: false,
    }

    const sessionChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([sessionRow]),
    }
    const responsesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }

    // First select() → session lookup, second → responses.
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionChain)
      .mockReturnValueOnce(responsesChain)

    const result = await loadActiveSession('u1')
    expect(result).not.toBeNull()
    expect(result!.sessionId).toBe('sess-1')
    expect(result!.gradeBand).toBe('middle')
    // Posterior cast exercised (serverSession.ts:74).
    expect(result!.posterior).toEqual(posterior)
    expect(result!.responses).toEqual([])
  })

  it('returns responses in position order with a null gradeBand coerced to undefined', async () => {
    const posterior = initialPosterior()
    const sessionRow = {
      id: 'sess-2',
      userId: 'u1',
      gradeBand: null, // exercises `session.gradeBand ?? undefined` cast (serverSession.ts:75)
      engineVersion: 'v1.0.0',
      posterior,
      inconsistency: false,
    }
    const responseRows = [
      {
        sessionId: 'sess-2',
        itemId: 'item-a',
        position: 1,
        choice: 1,
        responseMs: 900,
        respondedAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        sessionId: 'sess-2',
        itemId: 'item-b',
        position: 2,
        choice: 2,
        responseMs: 1100,
        respondedAt: new Date('2026-01-01T00:00:05Z'),
      },
    ]

    const sessionChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([sessionRow]),
    }
    const responsesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(responseRows),
    }

    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionChain)
      .mockReturnValueOnce(responsesChain)

    const result = await loadActiveSession('u1')
    expect(result).not.toBeNull()
    expect(result!.gradeBand).toBeUndefined()
    expect(result!.responses).toHaveLength(2)
    expect(result!.responses[0].itemId).toBe('item-a')
    expect(result!.responses[0].position).toBe(1)
    expect(result!.responses[1].itemId).toBe('item-b')
    expect(result!.responses[1].position).toBe(2)
    // The `orderBy` clause on position must have been used.
    expect(responsesChain.orderBy).toHaveBeenCalled()
  })
})
