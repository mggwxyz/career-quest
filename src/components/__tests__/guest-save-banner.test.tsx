import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuestSaveBanner } from '../guest-save-banner'

const { getUserId } = vi.hoisted(() => ({
  getUserId: vi.fn(),
}))

vi.mock('@/lib/auth/identity', () => ({
  getUserId,
}))

async function renderGuestSaveBanner() {
  const element = await GuestSaveBanner()
  return render(<>{element}</>)
}

describe('GuestSaveBanner', () => {
  beforeEach(() => {
    getUserId.mockReset()
  })

  it('prompts signed guests to create an account without losing progress', async () => {
    getUserId.mockResolvedValue({ id: 'guest_123', isGuest: true })

    await renderGuestSaveBanner()

    expect(screen.getByRole('status')).toHaveTextContent(
      'You\'re exploring as a guest. Create a free account to save your results',
    )
    expect(screen.getByRole('link', { name: /save my progress/i })).toHaveAttribute('href', '/auth/sign-up')
  })

  it('does not render for account users or unidentified visitors', async () => {
    getUserId.mockResolvedValue({ id: 'user_123', isGuest: false })

    const accountRender = await renderGuestSaveBanner()
    expect(accountRender.container).toBeEmptyDOMElement()

    accountRender.unmount()
    getUserId.mockResolvedValue(null)

    const anonymousRender = await renderGuestSaveBanner()
    expect(anonymousRender.container).toBeEmptyDOMElement()
  })
})
