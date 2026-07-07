import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(() => true) }))
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
  },
}))

import { POST } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/db'

type Mock = ReturnType<typeof vi.fn>

function postReq(body: unknown, init: RequestInit = {}) {
  return new Request('http://x/api/error-events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'vitest',
      ...init.headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(getSession as Mock).mockResolvedValue({ user: { id: 'u1' } })
  ;(rateLimit as Mock).mockReturnValue(true)
  ;(db.insert as Mock).mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  })
})

describe('POST /api/error-events', () => {
  it('accepts and stores a client error event', async () => {
    const res = await POST(postReq({
      source: 'client',
      name: 'TypeError',
      message: 'Cannot read properties of undefined',
      stack: 'TypeError: boom',
      route: '/discover/profile',
      metadata: { boundary: 'test' },
    }))

    expect(res.status).toBe(202)
    const insertChain = (db.insert as Mock).mock.results[0].value
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
      source: 'client',
      severity: 'error',
      name: 'TypeError',
      message: 'Cannot read properties of undefined',
      route: '/discover/profile',
      method: 'POST',
      userId: 'u1',
      userAgent: 'vitest',
      metadata: { boundary: 'test' },
    }))
  })

  it('rejects malformed bodies without writing', async () => {
    const res = await POST(postReq({ source: 'client', message: '' }))

    expect(res.status).toBe(400)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('rejects oversized content-length before parsing', async () => {
    const res = await POST(postReq(JSON.stringify({
      source: 'client',
      message: 'x'.repeat(33 * 1024),
    })))

    expect(res.status).toBe(413)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('rate limits noisy clients', async () => {
    ;(rateLimit as Mock).mockReturnValue(false)

    const res = await POST(postReq({ source: 'client', message: 'boom' }))

    expect(res.status).toBe(429)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('accepts anonymous error events with IP-based rate-limit keys', async () => {
    ;(getSession as Mock).mockResolvedValue(null)

    const res = await POST(postReq(
      { source: 'client', message: 'boom' },
      { headers: { 'x-forwarded-for': '203.0.113.10, 127.0.0.1' } },
    ))

    expect(res.status).toBe(202)
    expect(rateLimit).toHaveBeenCalledWith('error-event:anon:203.0.113.10', 30, 60_000)
  })
})
