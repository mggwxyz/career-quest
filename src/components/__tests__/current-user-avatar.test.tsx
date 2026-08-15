import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/providers/auth-provider'
import { CurrentUserAvatar } from '../current-user-avatar'

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}))

type AuthState = ReturnType<typeof useAuth>

const mockUseAuth = vi.mocked(useAuth)

function mockAuth(state: Partial<AuthState>) {
  mockUseAuth.mockReturnValue({
    user: null,
    loading: false,
    isLoggedIn: false,
    isAnonymous: true,
    ...state,
  })
}

describe('CurrentUserAvatar', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('renders two-letter initials and an accessible profile label for named users', () => {
    mockAuth({
      user: {
        id: 'user_1',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        isAnonymous: false,
      },
      isLoggedIn: true,
      isAnonymous: false,
    })

    render(<CurrentUserAvatar />)

    const avatar = screen.getByRole('img', { name: 'Profile: Ada Lovelace' })
    expect(avatar).toHaveTextContent('AL')
    expect(avatar).toHaveAttribute('aria-busy', 'false')
  })

  it('shows a busy loading avatar without fallback initials', () => {
    mockAuth({
      user: {
        id: 'user_1',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        isAnonymous: false,
      },
      loading: true,
      isLoggedIn: true,
      isAnonymous: false,
    })

    render(<CurrentUserAvatar />)

    const avatar = screen.getByRole('img', { name: 'Loading profile' })
    expect(avatar).toHaveAttribute('aria-busy', 'true')
    expect(avatar).not.toHaveTextContent(/\S/)
    expect(screen.queryByText('?')).not.toBeInTheDocument()
    expect(screen.queryByText('AL')).not.toBeInTheDocument()
  })

  it('falls back to an anonymous user label and question mark for blank names', () => {
    mockAuth({
      user: {
        id: 'guest_1',
        email: null,
        name: '   ',
        isAnonymous: true,
      },
    })

    render(<CurrentUserAvatar />)

    const avatar = screen.getByRole('img', { name: 'Profile: User' })
    expect(avatar).toHaveTextContent('?')
  })
})
