import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

const { authMiddleware, authResponse, innerMiddleware } = vi.hoisted(() => {
  const authResponse = new Response('auth required')
  const innerMiddleware = vi.fn(() => authResponse)
  const authMiddleware = vi.fn(() => innerMiddleware)
  return { authMiddleware, authResponse, innerMiddleware }
})

vi.mock('@/lib/auth/server', () => ({
  auth: {
    middleware: authMiddleware,
  },
}))

function request(pathname: string, init?: RequestInit) {
  return new NextRequest(new URL(pathname, 'https://career-quest.test'), init)
}

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bypasses auth for Server Actions before checking the pathname', async () => {
    const response = await proxy(request('/dashboard', { headers: { 'next-action': 'abc123' } }))

    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(innerMiddleware).not.toHaveBeenCalled()
  })

  it.each([
    '/',
    '/discover',
    '/discover/would-you-rather',
    '/careers',
    '/careers/software-developers',
    '/auth/login',
  ])('allows guest-accessible public path %s without auth middleware', async (pathname) => {
    const response = await proxy(request(pathname))

    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(innerMiddleware).not.toHaveBeenCalled()
  })

  it.each([
    '/dashboard',
    '/discoverable',
    '/careers-old',
    '/authentic',
  ])('delegates protected or prefix-impostor path %s to auth middleware', async (pathname) => {
    const req = request(pathname)
    const response = await proxy(req)

    expect(response).toBe(authResponse)
    expect(innerMiddleware).toHaveBeenCalledTimes(1)
    expect(innerMiddleware).toHaveBeenCalledWith(req)
  })
})
