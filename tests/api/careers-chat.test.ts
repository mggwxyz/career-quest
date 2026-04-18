import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/careers/chat/route'

vi.mock('@/lib/auth/get-session', () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }),
}))

vi.mock('ai', () => ({
  streamText: () => ({ toDataStreamResponse: () => new Response('ok') }),
}))

describe('POST /api/careers/chat', () => {
  it('returns 400 on invalid body', async () => {
    const req = new Request('http://test/api/careers/chat', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 when no session', async () => {
    const { getSession } = await import('@/lib/auth/get-session')
    vi.mocked(getSession).mockResolvedValueOnce(null)
    const req = new Request('http://test/api/careers/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [], careerContext: validCtx(), recommendationContext: null }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('passes through on a valid body', async () => {
    const req = new Request('http://test/api/careers/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hi' }],
        careerContext: validCtx(),
        recommendationContext: null,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})

function validCtx() {
  return {
    title: 'Registered Nurses',
    onetCode: '29-1141.00',
    shortDescription: 'x',
    tasks: ['t'], skills: ['s'], knowledge: ['k'],
    workActivities: ['wa'], technology: ['tech'],
    jobZone: { number: 4, name: 'n', description: 'd' },
    riasecTop: ['Social'],
    salaryMedian: '$80,000',
    outlook: 'Bright',
  }
}
