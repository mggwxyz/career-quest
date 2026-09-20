import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))
vi.mock('@/lib/assessment/serverSession', () => ({
  isGradeBand: vi.fn((value: unknown) => (
    typeof value === 'string'
    && ['middle', 'early-hs', 'late-hs', 'college'].includes(value)
  )),
  rebuildSessionFromLog: vi.fn(),
}))

import { POST } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { rebuildSessionFromLog } from '@/lib/assessment/serverSession'

type Mock = ReturnType<typeof vi.fn>

function postReq(body: unknown) {
  return new Request('http://x/api/assessment/response', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function selectLimit(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

function selectOrdered(rows: unknown[], onOrder?: () => void) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockImplementation(() => {
      onOrder?.()
      return Promise.resolve(rows)
    }),
  }
}

describe('POST /api/assessment/response', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects invalid choice values', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = postReq({ sessionId: 's', itemId: 'i', choice: 3 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // isValidChoice predicate coverage — exercised via the POST body-validation gate.
  // For valid cases we assert "not 400" (downstream DB calls surface as 404/500 because
  // we deliberately keep mocks minimal); for invalid cases we assert a hard 400.
  it.each([1, 2, null])('accepts choice=%s (not 400)', async (choice) => {
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
    // No session row returned → handler returns 404, proving we passed validation.
    ;(db.select as Mock).mockReturnValue(selectLimit([]))

    const req = postReq({ sessionId: 's', itemId: 'i', choice })
    const res = await POST(req)
    expect(res.status).not.toBe(400)
  })

  it.each([0, 3, '1', 'abc'])('rejects choice=%s with 400', async (choice) => {
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = postReq({ sessionId: 's', itemId: 'i', choice })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects invalid response timing with 400', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = postReq({ sessionId: 's', itemId: 'i', choice: 1, responseMs: -1 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects sessions that are not active for the resolved user', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
    ;(db.select as Mock).mockReturnValueOnce(selectLimit([]))

    const res = await POST(postReq({ sessionId: 'sess-1', itemId: 'item-1', choice: 1 }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toEqual({ error: 'Session not found or inactive' })
    expect(db.select).toHaveBeenCalledTimes(1)
    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
    expect(rebuildSessionFromLog).not.toHaveBeenCalled()
  })

  it('rejects responses for items that are not currently outstanding', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
    ;(db.select as Mock)
      .mockReturnValueOnce(selectLimit([{ id: 'sess-1', userId: 'u1', gradeBand: 'middle' }]))
      .mockReturnValueOnce(selectLimit([]))

    const res = await POST(postReq({ sessionId: 'sess-1', itemId: 'item-1', choice: 1 }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body).toEqual({ error: 'Item not outstanding in this session' })
    expect(db.select).toHaveBeenCalledTimes(2)
    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
    expect(rebuildSessionFromLog).not.toHaveBeenCalled()
  })

  it('records the answer before replaying the log and inserting the next item', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
    const calls: string[] = []
    const insertedValues: unknown[] = []

    ;(db.select as Mock)
      .mockReturnValueOnce(selectLimit([{ id: 'sess-1', userId: 'u1', gradeBand: 'middle' }]))
      .mockReturnValueOnce(selectLimit([{ id: 'shown-1', itemId: 'item-1' }]))
      .mockReturnValueOnce(selectOrdered([
        { itemId: 'item-1', choice: 1, responseMs: 250, position: 1 },
        { itemId: 'stale-queued-item', choice: null, responseMs: null, position: 2 },
      ], () => calls.push('load-log')))
    ;(db.update as Mock).mockImplementation((table: unknown) => {
      const label = table === assessmentResponses ? 'record-response' : 'snapshot-posterior'
      return {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          calls.push(label)
          return Promise.resolve()
        }),
      }
    })
    ;(db.insert as Mock).mockImplementation((table: unknown) => ({
      values: vi.fn().mockImplementation((values: unknown) => {
        insertedValues.push(values)
        calls.push(table === assessmentResponses ? 'insert-next' : 'insert')
        return Promise.resolve()
      }),
    }))
    ;(rebuildSessionFromLog as Mock).mockReturnValue({
      session: { posterior: { riasec: { R: { mean: 1 } } } },
      lastAdvance: { kind: 'next', nextItem: { id: 'next-item', prompt: 'Next item' } },
    })

    const res = await POST(postReq({
      sessionId: 'sess-1',
      itemId: 'item-1',
      choice: 1,
      responseMs: 250,
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      kind: 'next',
      item: { id: 'next-item' },
      itemsAnswered: 1,
    })
    expect(calls).toEqual(['record-response', 'load-log', 'snapshot-posterior', 'insert-next'])
    expect(db.update).toHaveBeenNthCalledWith(1, assessmentResponses)
    expect(db.update).toHaveBeenNthCalledWith(2, assessmentSessions)
    expect(rebuildSessionFromLog).toHaveBeenCalledWith({
      gradeBand: 'middle',
      responses: [{ itemId: 'item-1', choice: 1, responseMs: 250 }],
    })
    expect(insertedValues).toEqual([{
      sessionId: 'sess-1',
      itemId: 'next-item',
      position: 3,
    }])
  })
})
