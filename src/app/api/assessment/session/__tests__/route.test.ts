import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}))

import { POST } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'

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
