import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}))

import { and, eq, isNull } from 'drizzle-orm'
import { POST, GET } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { assessmentSessions } from '@/db/schema'
import { items } from '@/app/_data/items'
import { rebuildSessionFromLog } from '@/lib/assessment/serverSession'

describe('POST /api/assessment/session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a session and returns the first item', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })

    // Track call order so we can assert that existing active sessions are
    // abandoned (update) BEFORE the new session is created (insert).
    const calls: string[] = []

    // Mock abandon-existing: update(...).set(...).where(...) resolves void.
    const setChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn(() => {
        calls.push('update')
        return Promise.resolve()
      }),
    }
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(setChain)

    // Mock inserts: first call returns the session row; subsequent call
    // (response insert) resolves void. Both use the same chain shape so a
    // single mockReturnValue works.
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(() => {
        calls.push('insert')
        return Promise.resolve([{ id: 'sess-1' }])
      }),
    }
    ;(db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain)

    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'middle' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sessionId).toBe('sess-1')
    expect(body.item).toBeDefined()
    expect(body.item.option1).toBeDefined()
    expect(body.itemsAnswered).toBe(0)

    // chooseFirstItem prefers an opposite-contrast pair; verify the contract
    // rather than simply that *some* item came back.
    expect(body.item.dimensionContrast).toBe('opposite')

    // Contract: existing active sessions must be abandoned before a new one
    // is inserted. If insert ran first we'd violate the one-active-per-user
    // unique index on assessment_sessions.
    const firstUpdate = calls.indexOf('update')
    const firstInsert = calls.indexOf('insert')
    expect(firstUpdate).toBeGreaterThanOrEqual(0)
    expect(firstInsert).toBeGreaterThanOrEqual(0)
    expect(firstUpdate).toBeLessThan(firstInsert)
  })

  it('rejects unknown gradeBand values', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'kindergarten' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/assessment/session', () => {
  beforeEach(() => vi.clearAllMocks())

  function mockActiveSessionResponses(responses: Array<{
    itemId: string
    position: number
    choice: 1 | 2 | null
    responseMs: number | null
    respondedAt: Date | null
  }>) {
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 'sess-1',
        userId: 'u1',
        gradeBand: 'middle',
        posterior: {},
      }]),
    }
    const responsesSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(responses),
    }
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(responsesSelectChain)
  }

  it('returns { active: null } when no active session', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain)

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.active).toBeNull()
  })

  it('returns the stored unanswered item when an active session has zero answered responses', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const unansweredItem = items[0]

    // loadActiveSession performs two selects:
    //   1) the session row (with .where(...).limit(1))
    //   2) the responses list (with .where(...).orderBy(...))
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 'sess-1',
        userId: 'u1',
        gradeBand: 'middle',
        posterior: {},
      }]),
    }
    const responsesSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { itemId: unansweredItem.id, position: 1, choice: null, responseMs: null, respondedAt: null },
      ]),
    }
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(responsesSelectChain)

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.active).not.toBeNull()
    expect(body.active.sessionId).toBe('sess-1')
    expect(body.active.gradeBand).toBe('middle')
    expect(body.active.itemsAnswered).toBe(0)
    expect(body.active.item).toEqual(unansweredItem)
  })

  it('abandons a zero-answer session when its stored item is no longer in the bank', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 'sess-1',
        userId: 'u1',
        gradeBand: 'middle',
        posterior: {},
      }]),
    }
    const responsesSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { itemId: 'stale-item', position: 1, choice: null, responseMs: null, respondedAt: null },
      ]),
    }
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    }
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(responsesSelectChain)
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain)

    try {
      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({ active: null })
      expect(db.update).toHaveBeenCalledTimes(1)
      expect(updateChain.set).toHaveBeenCalledWith({ abandonedAt: expect.any(Date) })
      // Assert the full predicate, not just that .where() was called — a
      // regression that drops the userId filter must fail this test.
      expect(updateChain.where).toHaveBeenCalledTimes(1)
      expect(updateChain.where).toHaveBeenCalledWith(and(
        eq(assessmentSessions.userId, 'u1'),
        isNull(assessmentSessions.completedAt),
        isNull(assessmentSessions.abandonedAt),
      ))
    }
    finally {
      warn.mockRestore()
    }
  })

  it('falls back to the first item when a zero-answer active session has no response rows', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const firstItem = items[0]
    const sessionSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 'sess-1',
        userId: 'u1',
        gradeBand: 'middle',
        posterior: {},
      }]),
    }
    const responsesSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelectChain)
      .mockReturnValueOnce(responsesSelectChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.active).toMatchObject({
      sessionId: 'sess-1',
      gradeBand: 'middle',
      itemsAnswered: 0,
    })
    expect(body.active.item).toEqual(firstItem)
  })

  it('rebuilds progress from answered rows instead of trusting a stale queued item', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const answered = [{ itemId: items[0].id, choice: 1 as const, responseMs: 900 }]
    const { lastAdvance } = rebuildSessionFromLog({ gradeBand: 'middle', responses: answered })
    expect(lastAdvance?.kind).toBe('next')
    if (lastAdvance?.kind !== 'next') throw new Error('expected one answered row to produce a next item')
    const staleQueuedItem = items.find(item => item.id !== lastAdvance.nextItem.id && item.id !== items[0].id)
    if (!staleQueuedItem) throw new Error('expected fixture bank to contain a stale queued item candidate')
    mockActiveSessionResponses([
      {
        itemId: items[0].id,
        position: 1,
        choice: 1,
        responseMs: 900,
        respondedAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        itemId: staleQueuedItem.id,
        position: 2,
        choice: null,
        responseMs: null,
        respondedAt: null,
      },
    ])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.active).toMatchObject({
      sessionId: 'sess-1',
      gradeBand: 'middle',
      itemsAnswered: 1,
    })
    expect(body.active.item).toEqual(lastAdvance.nextItem)
    expect(body.active.item.id).not.toBe(staleQueuedItem.id)
  })

  it('returns a stopped active session when replaying answered rows reaches the cap', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const answeredRows = items.slice(0, 30).map((item, index) => ({
      itemId: item.id,
      position: index + 1,
      choice: (index % 2 === 0 ? 1 : 2) as 1 | 2,
      responseMs: 800 + index,
      respondedAt: new Date(`2026-01-01T00:00:${String(index).padStart(2, '0')}Z`),
    }))
    mockActiveSessionResponses(answeredRows)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      active: {
        sessionId: 'sess-1',
        gradeBand: 'middle',
        itemsAnswered: 30,
        item: null,
        stopped: true,
      },
    })
  })
})
