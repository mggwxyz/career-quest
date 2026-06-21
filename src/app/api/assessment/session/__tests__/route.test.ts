import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}))

import { POST, GET } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { items } from '@/app/_data/items'

describe('POST /api/assessment/session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'middle' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a session and returns the first item', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })

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
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
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

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns { active: null } when no active session', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
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
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
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
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
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
    }
    finally {
      warn.mockRestore()
    }
  })

  it('falls back to the first item when a zero-answer active session has no response rows', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
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
    expect(body.active.item).toBeDefined()
    expect(body.active.item.dimensionContrast).toBe('opposite')
  })
})
