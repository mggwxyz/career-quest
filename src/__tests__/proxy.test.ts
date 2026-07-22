import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const innerMiddleware = vi.fn()
  const authMiddleware = vi.fn(() => innerMiddleware)

  return { authMiddleware, innerMiddleware }
})

vi.mock('@/lib/auth/server', () => ({
  auth: {
    middleware: mocks.authMiddleware,
  },
}))

import { proxy } from '../proxy'

function request(pathname: string, init?: RequestInit) {
  return new NextRequest(`https://career-quest.test${pathname}`, init)
}

function expectNextResponse(response: Response) {
  expect(response.status).toBe(200)
  expect(response.headers.get('x-middleware-next')).toBe('1')
}

describe('proxy', () => {
  beforeEach(() => {
    mocks.authMiddleware.mockClear()
    mocks.innerMiddleware.mockReset()
    mocks.innerMiddleware.mockResolvedValue(new Response('auth-gated', { status: 418 }))
  })

  it('passes server actions through before applying route gating', async () => {
    const req = request('/dashboard', { headers: { 'next-action': 'action-id' } })

    const response = await proxy(req)

    expectNextResponse(response)
    expect(mocks.innerMiddleware).not.toHaveBeenCalled()
  })

  it.each([
    '/',
    '/discover',
    '/discover/matches',
    '/careers',
    '/careers/software-developers',
    '/auth/login',
  ])('treats %s as public for the guest-accessible funnel', async (pathname) => {
    const response = await proxy(request(pathname))

    expectNextResponse(response)
    expect(mocks.innerMiddleware).not.toHaveBeenCalled()
  })

  it.each(['/discoverX', '/careersX', '/authentic'])(
    'does not treat prefix impostor path %s as public',
    async (pathname) => {
      const req = request(pathname)
      const gatedResponse = new Response('auth-gated', { status: 418 })
      mocks.innerMiddleware.mockResolvedValueOnce(gatedResponse)

      const response = await proxy(req)

      expect(response).toBe(gatedResponse)
      expect(mocks.innerMiddleware).toHaveBeenCalledWith(req)
    },
  )

  it('gates protected pages through Neon Auth middleware', async () => {
    const req = request('/dashboard')
    const gatedResponse = new Response('auth-gated', { status: 418 })
    mocks.innerMiddleware.mockResolvedValueOnce(gatedResponse)

    const response = await proxy(req)

    expect(response).toBe(gatedResponse)
    expect(mocks.innerMiddleware).toHaveBeenCalledWith(req)
  })
})
