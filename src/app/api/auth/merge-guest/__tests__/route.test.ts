import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/guest/principal', () => ({
  getGuestPrincipal: vi.fn(),
  clearGuestCookie: vi.fn(),
}))
vi.mock('@/lib/guest/merge', () => ({
  mergeGuestDataIntoUser: vi.fn(),
}))

import { POST } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { clearGuestCookie, getGuestPrincipal } from '@/lib/guest/principal'
import { mergeGuestDataIntoUser } from '@/lib/guest/merge'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as Awaited<ReturnType<typeof getSession>>)
  vi.mocked(getGuestPrincipal).mockResolvedValue({ kind: 'guest', userId: 'guest:abc' })
  vi.mocked(mergeGuestDataIntoUser).mockResolvedValue({ merged: true, interestsMerged: 2 })
})

describe('POST /api/auth/merge-guest', () => {
  it('returns 401 when no authenticated session exists', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const res = await POST()

    expect(res.status).toBe(401)
    expect(mergeGuestDataIntoUser).not.toHaveBeenCalled()
  })

  it('does nothing when no guest cookie exists', async () => {
    vi.mocked(getGuestPrincipal).mockResolvedValueOnce(null)

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ merged: false })
    expect(mergeGuestDataIntoUser).not.toHaveBeenCalled()
  })

  it('merges guest data into the authenticated user and clears the guest cookie', async () => {
    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mergeGuestDataIntoUser).toHaveBeenCalledWith({
      guestUserId: 'guest:abc',
      userId: 'u1',
    })
    expect(clearGuestCookie).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ merged: true, interestsMerged: 2 })
  })
})
