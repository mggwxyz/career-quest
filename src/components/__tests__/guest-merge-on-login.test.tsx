import { render, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/app/actions/merge-guest', () => ({
  mergeGuestAction: vi.fn(),
}))

import { mergeGuestAction } from '@/app/actions/merge-guest'
import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { GuestMergeOnLogin } from '../guest-merge-on-login'

const DONE_KEY = 'cq_guest_merge_done'

type Mock = ReturnType<typeof vi.fn>

const accountAuth = {
  user: { id: 'user_123', email: 'learner@example.com', name: 'Learner', isAnonymous: false },
  loading: false,
  isLoggedIn: true,
  isAnonymous: false,
}

const loggedOutAuth = {
  user: null,
  loading: false,
  isLoggedIn: false,
  isAnonymous: true,
}

describe('GuestMergeOnLogin', () => {
  const refresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    ;(useRouter as Mock).mockReturnValue({ refresh })
    ;(useAuth as Mock).mockReturnValue(loggedOutAuth)
    ;(mergeGuestAction as Mock).mockResolvedValue({ merged: true })
  })

  it('waits for auth to resolve to a logged-in account before merging guest data', async () => {
    ;(useAuth as Mock).mockReturnValueOnce({
      user: null,
      loading: true,
      isLoggedIn: false,
      isAnonymous: true,
    })

    const { rerender } = render(<GuestMergeOnLogin />)

    expect(mergeGuestAction).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(DONE_KEY)).toBeNull()

    ;(useAuth as Mock).mockReturnValue(accountAuth)
    rerender(<GuestMergeOnLogin />)

    await waitFor(() => expect(mergeGuestAction).toHaveBeenCalledTimes(1))
    expect(sessionStorage.getItem(DONE_KEY)).toBe('1')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('does not merge again when this tab already reconciled guest data', async () => {
    sessionStorage.setItem(DONE_KEY, '1')
    ;(useAuth as Mock).mockReturnValue(accountAuth)

    render(<GuestMergeOnLogin />)
    await act(async () => {})

    expect(mergeGuestAction).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('does not refresh server components when no guest rows were claimed', async () => {
    ;(useAuth as Mock).mockReturnValue(accountAuth)
    ;(mergeGuestAction as Mock).mockResolvedValue({ merged: false })

    render(<GuestMergeOnLogin />)

    await waitFor(() => expect(mergeGuestAction).toHaveBeenCalledTimes(1))
    expect(sessionStorage.getItem(DONE_KEY)).toBe('1')
    expect(refresh).not.toHaveBeenCalled()
  })
})
