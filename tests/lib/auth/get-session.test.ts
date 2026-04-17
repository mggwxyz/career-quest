import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  auth: { getSession: () => mockGetSession() },
}))

describe('getSession', () => {
  beforeEach(() => mockGetSession.mockReset())

  it('returns the session payload when Neon Auth resolves one', async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1' } }, error: null })
    const { getSession } = await import('@/lib/auth/get-session')
    const result = await getSession()
    expect(result?.user.id).toBe('u1')
  })

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: null, error: null })
    const { getSession } = await import('@/lib/auth/get-session')
    expect(await getSession()).toBeNull()
  })
})
