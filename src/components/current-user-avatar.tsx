'use client'

import { useAuth } from '@/providers/auth-provider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
  const { user } = useAuth()
  const name = user?.name || '?'
  const initials = name
    .split(' ')
    .map((word: string) => word[0])
    .join('')
    .toUpperCase()

  return (
    <Avatar>
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
