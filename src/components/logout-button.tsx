'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/login')
    }
    catch (error) {
      toast.error('Failed to log out. Please try again.')
      console.error('Logout error:', error)
    }
  }

  return <Button variant="outline" onClick={logout}>Logout</Button>
}
