'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function AnonymousAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  useEffect(() => {
    const ensureSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error('Failed to create anonymous session:', error.message)
        }
      }
    }
    ensureSession()
  }, [supabase.auth])

  return <>{children}</>
}
