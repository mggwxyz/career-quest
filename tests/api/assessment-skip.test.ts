import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({ db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() } }))

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { POST } from '@/app/api/assessment/response/route'
import { GET } from '@/app/api/assessment/session/route'
import { GET as getHistory } from '@/app/api/assessment/responses/route'
import { items } from '@/app/_data/items'
import { chooseFirstItem, initialPosterior, startSession, type ResponseChoice } from '@/lib/assessment'

type ResponseRow = {
  id: string
  sessionId: string
  itemId: string
  position: number
  choice: ResponseChoice
  responseMs: number | null
  respondedAt: Date | null
}

// Keep the real handlers, schema predicates, item bank, and engine. Only the
// persistence boundary is replaced; rows survive response and resume calls.
function setupSession() {
  const session = {
    id: 'skip-session', userId: 'u1', gradeBand: null,
    posterior: initialPosterior(), completedAt: null as Date | null,
    result: null as unknown,
  }
  const first = chooseFirstItem(items, startSession({ bank: items }))
  const rows: ResponseRow[] = [{
    id: 'row-1', sessionId: session.id, itemId: first.id, position: 1,
    choice: null, responseMs: null, respondedAt: null,
  }]
  let requestedItemId = first.id
  let loseUpdate = false
  let beforeNextInsert: (() => Promise<void>) | null = null
  let afterRecord: (() => Promise<void>) | null = null
  const shownWhere = vi.fn()
  const responseUpdateWhere = vi.fn()

  vi.mocked(getOrCreateUserId).mockResolvedValue({ id: 'u1', isGuest: false })
  vi.mocked(db.select).mockImplementation(() => ({
    from: (table: unknown) => {
      if (table === assessmentSessions) {
        return { where: () => ({ limit: async () => session.completedAt ? [] : [session] }) }
      }
      return {
        where: (predicate: unknown) => ({
          limit: async () => {
            shownWhere(predicate)
            return rows.filter(r => r.itemId === requestedItemId && r.respondedAt === null).slice(0, 1)
          },
          orderBy: async () => rows.map(r => ({ ...r })),
        }),
      }
    },
  }) as never)
  vi.mocked(db.update).mockImplementation((table: unknown) => ({
    set: (values: object) => ({
      where: (predicate: unknown) => {
        if (table === assessmentSessions) {
          Object.assign(session, values)
          return Promise.resolve()
        }
        responseUpdateWhere(predicate)
        const row = rows.find(r => r.itemId === requestedItemId && r.respondedAt === null)
        if (loseUpdate || !row) return { returning: async () => [] }
        Object.assign(row, values)
        return { returning: async () => {
          const hook = afterRecord
          afterRecord = null
          await hook?.()
          return [{ id: row.id }]
        } }
      },
    }),
  }) as never)
  vi.mocked(db.insert).mockReturnValue({
    values: (values: Pick<ResponseRow, 'sessionId' | 'itemId' | 'position'>) => {
      const insert = async (ignoreConflict = false) => {
        const hook = beforeNextInsert
        beforeNextInsert = null
        await hook?.()
        if (rows.some(r => r.position === values.position)) {
          if (ignoreConflict) return
          throw new Error('duplicate session position')
        }
        rows.push({ ...values, id: `row-${rows.length + 1}`, choice: null, responseMs: null, respondedAt: null })
      }
      return {
        then: (resolve: () => void, reject: (err: unknown) => void) => insert().then(resolve, reject),
        onConflictDoNothing: () => insert(true),
      }
    },
  } as never)

  const submit = async (itemId: string, choice: ResponseChoice) => {
    requestedItemId = itemId
    return POST(new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: session.id, itemId, choice, responseMs: 1234 }),
    }))
  }
  return { session, first, rows, submit, shownWhere, responseUpdateWhere,
    beforeInsert: (hook: () => Promise<void>) => {
      beforeNextInsert = hook
    },
    afterRecord: (hook: () => Promise<void>) => {
      afterRecord = hook
    },
    loseUpdate: () => {
      loseUpdate = true
    } }
}

describe('assessment skip persistence and replay', () => {
  beforeEach(() => vi.resetAllMocks())

  it('skips the first item successfully without counting an answer', async () => {
    const state = setupSession()
    const response = await state.submit(state.first.id, null)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.kind).toBe('next')
    expect(body.item.id).not.toBe(state.first.id)
    expect(body.itemsAnswered).toBe(0)
    expect(state.rows[0]).toMatchObject({ choice: null, respondedAt: expect.any(Date), responseMs: 1234 })
    expect(state.rows[1]).toMatchObject({ itemId: body.item.id, respondedAt: null })
  })

  it.each([{ answers: [] }, { answers: [1] }, { answers: [1, 2] }] as { answers: ResponseChoice[] }[])('advances consecutive skips after $answers and resumes the unseen item', async ({ answers }) => {
    const state = setupSession()
    let currentId = state.first.id
    const seen = new Set<string>()
    for (const choice of [...answers, null, null]) {
      seen.add(currentId)
      const response = await state.submit(currentId, choice)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.kind).toBe('next')
      expect(seen.has(body.item.id)).toBe(false)
      currentId = body.item.id
    }
    const resumed = await GET()
    expect(resumed.status).toBe(200)
    const { active } = await resumed.json()
    expect(active.item.id).toBe(currentId)
    expect(seen.has(active.item.id)).toBe(false)
    expect(active.itemsAnswered).toBe(answers.length)
  })

  it('rejects a stale answer to a submitted skip and preserves the logged skip', async () => {
    const state = setupSession()
    expect((await state.submit(state.first.id, null)).status).toBe(200)
    expect((await state.submit(state.first.id, 1)).status).toBe(409)
    expect(state.rows[0]).toMatchObject({ choice: null, respondedAt: expect.any(Date) })
    expect(state.rows).toHaveLength(2)
    expect(state.shownWhere).toHaveBeenLastCalledWith(and(
      eq(assessmentResponses.sessionId, state.session.id),
      eq(assessmentResponses.itemId, state.first.id),
      isNull(assessmentResponses.respondedAt),
    ))
  })

  it('recovers the old first-skip failure with no outstanding row', async () => {
    const state = setupSession()
    state.rows[0].respondedAt = new Date()
    const { active } = await (await GET()).json()
    expect(active.item.id).not.toBe(state.first.id)
    expect(active.itemsAnswered).toBe(0)
    expect(state.rows).toHaveLength(2)
    expect((await state.submit(active.item.id, 1)).status).toBe(200)
    expect(state.rows[0]).toMatchObject({ choice: null, respondedAt: expect.any(Date) })
  })

  it('recovers a legacy duplicate shown row without accepting a stale answer to the skip', async () => {
    const state = setupSession()
    const { item: second } = await (await state.submit(state.first.id, 1)).json()
    state.rows[1].respondedAt = new Date()
    state.rows.push({ ...state.rows[1], id: 'row-3', position: 3, respondedAt: null })
    expect((await state.submit(second.id, 2)).status).toBe(409)
    const { active } = await (await GET()).json()
    expect(active.item.id).not.toBe(second.id)
    expect(active.itemsAnswered).toBe(1)
    expect(state.rows).toHaveLength(4)
    // Repeated resume must not create another outstanding row.
    expect(await (await GET()).json()).toMatchObject({ active: { item: { id: active.item.id } } })
    expect(state.rows).toHaveLength(4)
    expect((await state.submit(active.item.id, 2)).status).toBe(200)
    expect(state.rows[1]).toMatchObject({ choice: null, respondedAt: expect.any(Date) })
    expect(state.rows[2].respondedAt).toBeNull()
  })

  it.each(['before-log-reload', 'before-next-insert'])('allows resume racing a submitted skip %s', async (timing) => {
    const state = setupSession()
    const resume = async () => {
      const response = await GET()
      expect(response.status).toBe(200)
    }
    if (timing === 'before-log-reload') state.afterRecord(resume)
    else state.beforeInsert(resume)
    const response = await state.submit(state.first.id, null)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.kind).toBe('next')
    expect(state.rows).toHaveLength(2)
    expect(state.rows[1]).toMatchObject({ itemId: body.item.id, respondedAt: null })
    expect((await state.submit(body.item.id, 1)).status).toBe(200)
  })

  it('rejects a response that loses the outstanding-row update race', async () => {
    const state = setupSession()
    state.loseUpdate()
    expect((await state.submit(state.first.id, 1)).status).toBe(409)
    expect(state.responseUpdateWhere).toHaveBeenCalledWith(and(
      eq(assessmentResponses.id, 'row-1'),
      isNull(assessmentResponses.respondedAt),
    ))
    expect(db.insert).not.toHaveBeenCalled()
    expect(state.rows[0].respondedAt).toBeNull()
  })

  it('retains skipped counts at the existing engine cap and on stopped resume', async () => {
    const state = setupSession()
    let currentId = state.first.id
    const seen = new Set<string>()
    for (let position = 1; position <= 30; position++) {
      seen.add(currentId)
      const response = await state.submit(currentId, null)
      expect(response.status).toBe(200)
      const body = await response.json()
      if (position < 30) {
        expect(body.kind).toBe('next')
        expect(body.itemsAnswered).toBe(0)
        expect(seen.has(body.item.id)).toBe(false)
        currentId = body.item.id
      }
      else {
        expect(body).toMatchObject({ kind: 'stop', reason: 'capped', result: { meta: { itemsAnswered: 0, itemsSkipped: 30 } } })
        expect(state.session.result).toEqual(body.result)
      }
    }
    expect(state.rows).toHaveLength(30)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: async () => [state.session],
    } as never)
    const history = await getHistory()
    expect(history.status).toBe(200)
    const saved = await history.json()
    expect(saved.sessionId).toBe(state.session.id)
    expect(saved.responses).toHaveLength(30)
    expect(saved.responses.every((r: { choice: ResponseChoice }) => r.choice === null)).toBe(true)
    expect(saved.responses.map((r: { item: { id: string } }) => r.item.id)).toEqual([...seen])
    // A session interrupted before completion was cached must still resume as
    // stopped, and resume must finalize it so /result returns this session.
    state.session.completedAt = null
    state.session.result = null
    expect(await (await GET()).json()).toMatchObject({ active: { item: null, stopped: true, itemsAnswered: 0 } })
    expect(state.session.completedAt).toEqual(expect.any(Date))
    expect(state.session.result).toMatchObject({ meta: { itemsAnswered: 0, itemsSkipped: 30 } })
  })
})
