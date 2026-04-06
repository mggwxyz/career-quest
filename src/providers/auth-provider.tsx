'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User, Session } from '@supabase/supabase-js'

interface AuthContext {
  user: User | null
  session: Session | null
  loading: boolean
  isLoggedIn: boolean
  isAnonymous: boolean
}

const AuthContext = createContext<AuthContext>({
  user: null,
  session: null,
  loading: true,
  isLoggedIn: false,
  isAnonymous: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  )

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error('Failed to create anonymous session:', error.message)
        }
      }
      else {
        setSession(session)
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    isLoggedIn: !!session?.user,
    isAnonymous: session?.user?.is_anonymous ?? true,
  }), [session, loading])

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  )
}

export const useAuth = () => useContext(AuthContext)
