import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/careers/actions/route'

vi.mock('@/lib/auth/get-session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
  },
}))

import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'

const insertValues = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as Awaited<ReturnType<typeof getSession>>)
  vi.mocked(db.insert).mockReturnValue({ values: insertValues } as never)
})

function request(body: unknown) {
  return new Request('http://test/api/careers/actions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/careers/actions', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const res = await POST(request({ onetId: '29-1141.00', action: 'saved' }))

    expect(res.status).toBe(401)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('rejects invalid bodies', async () => {
    const res = await POST(request({ onetId: 'bad', action: 'saved' }))

    expect(res.status).toBe(400)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('records a saved career action for authenticated users', async () => {
    const res = await POST(request({ onetId: '29-1141.00', action: 'saved' }))

    expect(res.status).toBe(200)
    expect(insertValues).toHaveBeenCalledWith({
      userId: 'u1',
      onetId: '29-1141.00',
      action: 'saved',
    })
  })
})
