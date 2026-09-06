import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({ getOrCreateUserId: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    transaction: vi.fn(),
    batch: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
  },
}))

import { GET, POST } from '../route'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'

type Mock = ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  ;(getOrCreateUserId as Mock).mockResolvedValue({ id: 'u1', isGuest: false })
  // Faithfully reproduce the neon-http driver: an interactive transaction
  // throws exactly as it does in production.
  ;(db.transaction as Mock).mockImplementation(() => {
    throw new Error('No transactions support in neon-http driver')
  })
  ;(db.delete as Mock).mockReturnValue({
    where: vi.fn().mockReturnValue({ __op: 'delete' }),
  })
  ;(db.insert as Mock).mockReturnValue({
    values: vi.fn().mockImplementation((v: unknown) => ({ __op: 'insert', values: v })),
  })
  ;(db.select as Mock).mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  })
  ;(db.batch as Mock).mockResolvedValue([])
})

function postReq(body: unknown) {
  return new Request('http://x/api/user/interests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/user/interests', () => {
  it('serves a guest (no account) — saves under the guest id', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValueOnce({ id: 'guest_abc', isGuest: true })
    const res = await POST(postReq({ interests: ['Music'] }))
    expect(res.status).toBe(200)
    const batched = (db.batch as Mock).mock.calls[0][0] as Array<{ __op: string, values?: Array<{ userId: string }> }>
    expect(batched[1].values?.[0].userId).toBe('guest_abc')
  })

  it('replaces interests atomically without using the unsupported neon-http interactive transaction', async () => {
    const res = await POST(postReq({ interests: ['Music', 'Coding'] }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ interests: ['Music', 'Coding'] })

    // The neon-http driver has no interactive transaction support.
    expect(db.transaction).not.toHaveBeenCalled()

    // Delete + insert must run in a single atomic batch.
    expect(db.batch).toHaveBeenCalledTimes(1)
    const batched = (db.batch as Mock).mock.calls[0][0] as Array<{ __op: string, values?: unknown }>
    expect(batched).toHaveLength(2)
    expect(batched[0]).toEqual({ __op: 'delete' })
    expect(batched[1].__op).toBe('insert')
    expect(batched[1].values).toEqual([
      { userId: 'u1', interest: 'Music', source: 'manual' },
      { userId: 'u1', interest: 'Coding', source: 'manual' },
    ])
  })

  it('normalizes submitted interests before storing them', async () => {
    const longInterest = `${'x'.repeat(70)} tail`
    const overflow = Array.from({ length: 35 }, (_, i) => `Extra ${i}`)
    const res = await POST(postReq({
      interests: [
        '  Music  ',
        'Music',
        '',
        '   ',
        42,
        longInterest,
        ...overflow,
      ],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.interests).toHaveLength(30)
    expect(body.interests[0]).toBe('Music')
    expect(body.interests[1]).toBe('x'.repeat(64))
    expect(body.interests.at(-1)).toBe('Extra 27')

    const batched = (db.batch as Mock).mock.calls[0][0] as Array<{ __op: string, values?: Array<{ interest: string }> }>
    expect(batched[1].values?.map(v => v.interest)).toEqual(body.interests)
  })

  it('rejects malformed interests bodies', async () => {
    const res = await POST(postReq({ interests: 'Music' }))

    expect(res.status).toBe(400)
    expect(db.delete).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.batch).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON without clearing saved interests', async () => {
    const res = await POST(new Request('http://x/api/user/interests', {
      method: 'POST',
      body: 'not-json',
    }))

    expect(res.status).toBe(400)
    expect(db.delete).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.batch).not.toHaveBeenCalled()
  })

  it('clears interests when given an empty list', async () => {
    const res = await POST(postReq({ interests: [] }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ interests: [] })
    expect(db.transaction).not.toHaveBeenCalled()
    expect(db.delete).toHaveBeenCalledTimes(1)
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe('GET /api/user/interests', () => {
  it('serves a guest — reads interests under the guest id', async () => {
    ;(getOrCreateUserId as Mock).mockResolvedValueOnce({ id: 'guest_abc', isGuest: true })
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('returns saved interests in query order', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { interest: 'Robotics' },
        { interest: 'Music' },
        { interest: 'Healthcare' },
      ]),
    }
    ;(db.select as Mock).mockReturnValueOnce(selectChain)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(selectChain.orderBy).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ interests: ['Robotics', 'Music', 'Healthcare'] })
  })
})
