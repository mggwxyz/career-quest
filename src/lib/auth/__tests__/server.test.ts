import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createNeonAuth } = vi.hoisted(() => ({
  createNeonAuth: vi.fn((config: unknown) => ({ config })),
}))

vi.mock('@neondatabase/auth/next/server', () => ({ createNeonAuth }))

const ORIGINAL_BASE_URL = process.env.NEON_AUTH_BASE_URL
const ORIGINAL_COOKIE_SECRET = process.env.NEON_AUTH_COOKIE_SECRET

beforeEach(() => {
  vi.resetModules()
  createNeonAuth.mockClear()
  process.env.NEON_AUTH_BASE_URL = 'https://auth.example.test'
  process.env.NEON_AUTH_COOKIE_SECRET = 'test-cookie-secret'
})

afterEach(() => {
  if (ORIGINAL_BASE_URL === undefined) {
    delete process.env.NEON_AUTH_BASE_URL
  }
  else {
    process.env.NEON_AUTH_BASE_URL = ORIGINAL_BASE_URL
  }

  if (ORIGINAL_COOKIE_SECRET === undefined) {
    delete process.env.NEON_AUTH_COOKIE_SECRET
  }
  else {
    process.env.NEON_AUTH_COOKIE_SECRET = ORIGINAL_COOKIE_SECRET
  }
})

describe('auth server setup', () => {
  it('creates Neon Auth with the configured base URL and cookie secret', async () => {
    const { auth } = await import('../server')

    expect(createNeonAuth).toHaveBeenCalledTimes(1)
    expect(createNeonAuth).toHaveBeenCalledWith({
      baseUrl: 'https://auth.example.test',
      cookies: { secret: 'test-cookie-secret' },
    })
    expect(auth).toEqual({
      config: {
        baseUrl: 'https://auth.example.test',
        cookies: { secret: 'test-cookie-secret' },
      },
    })
  })

  it.each([
    ['base URL', 'NEON_AUTH_BASE_URL'],
    ['cookie secret', 'NEON_AUTH_COOKIE_SECRET'],
  ] as const)('fails fast when the %s is missing', async (_label, envName) => {
    delete process.env[envName]

    await expect(import('../server')).rejects.toThrow(
      'Missing required env vars: NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be set',
    )
    expect(createNeonAuth).not.toHaveBeenCalled()
  })
})
