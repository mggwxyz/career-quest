'use client'

import { authClient } from '@/lib/auth/client'
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

  return (
    <button
      onClick={logout}
      className="text-sm px-3.5 py-1.5 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-primary/5"
    >
      Logout
    </button>
  )
}
