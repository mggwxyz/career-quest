'use client'

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { authClient } from '@/lib/auth/client'

interface AuthContext {
  user: { id: string, email: string | null, name: string, isAnonymous: boolean } | null
  loading: boolean
  isLoggedIn: boolean
  isAnonymous: boolean
}

const AuthContext = createContext<AuthContext>({
  user: null,
  loading: true,
  isLoggedIn: false,
  isAnonymous: true,
})

const noop = () => undefined
const subscribe = () => noop
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const value = useMemo(() => {
    if (!hydrated) {
      return { user: null, loading: true, isLoggedIn: false, isAnonymous: true }
    }
    const u = session?.user
    if (!u) {
      return { user: null, loading: isPending, isLoggedIn: false, isAnonymous: true }
    }
    const isAnon = !!(u as { isAnonymous?: boolean }).isAnonymous
    return {
      user: { id: u.id, email: u.email ?? null, name: u.name ?? '', isAnonymous: isAnon },
      loading: isPending,
      isLoggedIn: !isAnon,
      isAnonymous: isAnon,
    }
  }, [hydrated, session, isPending])

  return <AuthContext value={value}>{children}</AuthContext>
}

export const useAuth = () => useContext(AuthContext)
