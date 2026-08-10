import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/identity', () => ({
  getUserId: vi.fn(),
}))

import { GuestSaveBanner } from '../guest-save-banner'
import { getUserId } from '@/lib/auth/identity'

type Mock = ReturnType<typeof vi.fn>

describe('GuestSaveBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the save prompt to signed guest visitors', async () => {
    ;(getUserId as Mock).mockResolvedValue({ id: 'guest_abc', isGuest: true })

    render(await GuestSaveBanner())

    expect(screen.getByRole('status')).toHaveTextContent(/exploring as a guest/i)
    expect(screen.getByRole('link', { name: /save my progress/i })).toHaveAttribute('href', '/auth/sign-up')
  })

  it('does not show the guest save prompt to account users', async () => {
    ;(getUserId as Mock).mockResolvedValue({ id: 'user_123', isGuest: false })

    const banner = await GuestSaveBanner()

    expect(banner).toBeNull()
  })

  it('does not show the guest save prompt before a visitor has a guest identity', async () => {
    ;(getUserId as Mock).mockResolvedValue(null)

    const banner = await GuestSaveBanner()

    expect(banner).toBeNull()
  })
})
