import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GuestMergeOnLogin } from '../guest-merge-on-login'

const mocks = vi.hoisted(() => ({
  mergeGuestAction: vi.fn(),
  refresh: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('@/app/actions/merge-guest', () => ({
  mergeGuestAction: mocks.mergeGuestAction,
}))

vi.mock('@/providers/auth-provider', () => ({
  useAuth: mocks.useAuth,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const signedInAuth = {
  user: { id: 'user_123', email: 'student@example.com', name: 'Student', isAnonymous: false },
  loading: false,
  isLoggedIn: true,
  isAnonymous: false,
}

describe('GuestMergeOnLogin', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocks.mergeGuestAction.mockReset()
    mocks.mergeGuestAction.mockResolvedValue({ merged: false })
    mocks.refresh.mockReset()
    mocks.useAuth.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('waits for a resolved signed-in auth state before merging guest data', () => {
    mocks.useAuth.mockReturnValue({ ...signedInAuth, loading: true })

    render(<GuestMergeOnLogin />)

    expect(mocks.mergeGuestAction).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('cq_guest_merge_done')).toBeNull()
  })

  it('merges once per tab and refreshes server components when data moved', async () => {
    mocks.useAuth.mockReturnValue(signedInAuth)
    mocks.mergeGuestAction.mockResolvedValue({ merged: true })

    const { rerender } = render(<GuestMergeOnLogin />)

    await waitFor(() => expect(mocks.mergeGuestAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    expect(sessionStorage.getItem('cq_guest_merge_done')).toBe('1')

    rerender(<GuestMergeOnLogin />)

    expect(mocks.mergeGuestAction).toHaveBeenCalledTimes(1)
  })

  it('uses the session marker to suppress duplicate merges after remounts', async () => {
    mocks.useAuth.mockReturnValue(signedInAuth)
    mocks.mergeGuestAction.mockResolvedValue({ merged: true })

    const firstRender = render(<GuestMergeOnLogin />)
    await waitFor(() => expect(mocks.mergeGuestAction).toHaveBeenCalledTimes(1))
    firstRender.unmount()
    mocks.mergeGuestAction.mockClear()
    mocks.refresh.mockClear()

    render(<GuestMergeOnLogin />)

    expect(mocks.mergeGuestAction).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('does not refresh when the merge action reports no moved guest data', async () => {
    mocks.useAuth.mockReturnValue(signedInAuth)
    mocks.mergeGuestAction.mockResolvedValue({ merged: false })

    render(<GuestMergeOnLogin />)

    await waitFor(() => expect(mocks.mergeGuestAction).toHaveBeenCalledTimes(1))
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
