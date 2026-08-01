import { describe, it, expect, vi, beforeEach } from 'vitest'
import { and, eq, isNull } from 'drizzle-orm'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

import { POST } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { items } from '@/app/_data/items'
import { assessmentResponses, assessmentSessions } from '@/db/schema'

describe('POST /api/assessment/response', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects invalid choice values', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 3 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // isValidChoice predicate coverage — exercised via the POST body-validation gate.
  // For valid cases we assert "not 400" (downstream DB calls surface as 404/500 because
  // we deliberately keep mocks minimal); for invalid cases we assert a hard 400.
  it.each([1, 2, null])('accepts choice=%s (not 400)', async (choice) => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    // No session row returned → handler returns 404, proving we passed validation.
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain)

    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice }),
    })
    const res = await POST(req)
    expect(res.status).not.toBe(400)
  })

  it.each([0, 3, '1', 'abc'])('rejects choice=%s with 400', async (choice) => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects invalid response timing with 400', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 1, responseMs: -1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects responses when the active session does not belong to the user', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const sessionSelect = selectLimitChain([])
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(sessionSelect)

    const res = await POST(postReq({ sessionId: 'sess-1', itemId: items[0].id, choice: 1 }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toEqual({ error: 'Session not found or inactive' })
    expect(sessionSelect.where).toHaveBeenCalledWith(and(
      eq(assessmentSessions.id, 'sess-1'),
      eq(assessmentSessions.userId, 'u1'),
      isNull(assessmentSessions.completedAt),
      isNull(assessmentSessions.abandonedAt),
    ))
    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('rejects responses for items that are not outstanding in the session', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const sessionSelect = selectLimitChain([{ id: 'sess-1', userId: 'u1', gradeBand: 'middle' }])
    const shownSelect = selectLimitChain([])
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelect)
      .mockReturnValueOnce(shownSelect)

    const res = await POST(postReq({ sessionId: 'sess-1', itemId: items[0].id, choice: 1 }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body).toEqual({ error: 'Item not outstanding in this session' })
    expect(shownSelect.where).toHaveBeenCalledWith(and(
      eq(assessmentResponses.sessionId, 'sess-1'),
      eq(assessmentResponses.itemId, items[0].id),
      isNull(assessmentResponses.choice),
    ))
    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('records the answered item, updates the session snapshot, and stores the next shown item', async () => {
    ;(getOrCreateUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1', isGuest: false })
    const answeredItem = items[0]
    const sessionSelect = selectLimitChain([{ id: 'sess-1', userId: 'u1', gradeBand: 'middle' }])
    const shownSelect = selectLimitChain([{ id: 'response-1', itemId: answeredItem.id }])
    const allResponsesSelect = selectOrderByChain([
      { id: 'response-1', itemId: answeredItem.id, position: 1, choice: 1, responseMs: 2500 },
    ])
    const responseUpdate = updateChain()
    const sessionUpdate = updateChain()
    const nextInsert = insertChain()
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionSelect)
      .mockReturnValueOnce(shownSelect)
      .mockReturnValueOnce(allResponsesSelect)
    ;(db.update as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(responseUpdate)
      .mockReturnValueOnce(sessionUpdate)
    ;(db.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce(nextInsert)

    const res = await POST(postReq({
      sessionId: 'sess-1',
      itemId: answeredItem.id,
      choice: 1,
      responseMs: 2500,
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.kind).toBe('next')
    expect(body.itemsAnswered).toBe(1)
    expect(body.item.id).not.toBe(answeredItem.id)
    expect(body.posteriorSnapshot).toBeDefined()
    expect(responseUpdate.set).toHaveBeenCalledWith({
      choice: 1,
      respondedAt: expect.any(Date),
      responseMs: 2500,
    })
    expect(responseUpdate.where).toHaveBeenCalledWith(eq(assessmentResponses.id, 'response-1'))
    expect(sessionUpdate.set).toHaveBeenCalledWith({ posterior: body.posteriorSnapshot })
    expect(sessionUpdate.where).toHaveBeenCalledWith(eq(assessmentSessions.id, 'sess-1'))
    expect(nextInsert.values).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      itemId: body.item.id,
      position: 2,
    })
  })
})

function postReq(body: unknown) {
  return new Request('http://x/api/assessment/response', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function selectLimitChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

function selectOrderByChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  }
}

function updateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  }
}

function insertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  }
}
