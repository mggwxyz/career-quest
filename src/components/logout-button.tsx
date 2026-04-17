'use client'

import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    try {
      await authClient.signOut()
      router.push('/auth/login')
    }
    catch (error) {
      toast.error('Failed to log out. Please try again.')
      console.error('Logout error:', error)
    }
  }

  return <Button variant="outline" onClick={logout}>Logout</Button>
}
