import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/client', () => ({
  authClient: {
    useSession: vi.fn(),
  },
}))

import { authClient } from '@/lib/auth/client'
import { AuthProvider, useAuth } from '../auth-provider'

type Mock = ReturnType<typeof vi.fn>

function AuthProbe() {
  return (
    <output data-testid="auth-state">
      {JSON.stringify(useAuth())}
    </output>
  )
}

function readStateFromProbe() {
  return JSON.parse(screen.getByTestId('auth-state').textContent ?? '{}')
}

function readServerState() {
  const container = document.createElement('div')
  container.innerHTML = renderToString(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  )

  return JSON.parse(container.querySelector('[data-testid="auth-state"]')?.textContent ?? '{}')
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps server render in a loading anonymous state even when a session exists', () => {
    ;(authClient.useSession as Mock).mockReturnValue({
      data: {
        user: {
          id: 'acct_123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          isAnonymous: false,
        },
      },
      isPending: false,
    })

    expect(readServerState()).toEqual({
      user: null,
      loading: true,
      isLoggedIn: false,
      isAnonymous: true,
    })
  })

  it('exposes a normalized signed-in account session after client hydration', () => {
    ;(authClient.useSession as Mock).mockReturnValue({
      data: {
        user: {
          id: 'acct_123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          isAnonymous: false,
        },
      },
      isPending: false,
    })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    expect(readStateFromProbe()).toEqual({
      user: {
        id: 'acct_123',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        isAnonymous: false,
      },
      loading: false,
      isLoggedIn: true,
      isAnonymous: false,
    })
  })

  it('treats anonymous auth users as guest sessions after client hydration', () => {
    ;(authClient.useSession as Mock).mockReturnValue({
      data: {
        user: {
          id: 'guest_123',
          email: undefined,
          name: undefined,
          isAnonymous: true,
        },
      },
      isPending: false,
    })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    expect(readStateFromProbe()).toEqual({
      user: {
        id: 'guest_123',
        email: null,
        name: '',
        isAnonymous: true,
      },
      loading: false,
      isLoggedIn: false,
      isAnonymous: true,
    })
  })
})
