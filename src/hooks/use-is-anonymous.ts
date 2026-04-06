import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useIsAnonymous = () => {
  const [isAnonymous, setIsAnonymous] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAnonymous(user?.is_anonymous ?? true)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAnonymous(session?.user?.is_anonymous ?? true)
      },
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return isAnonymous
}
