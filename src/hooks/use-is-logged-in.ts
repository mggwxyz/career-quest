import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useIsLoggedIn = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    fetchUser()
  }, [supabase])

  return isLoggedIn
}
