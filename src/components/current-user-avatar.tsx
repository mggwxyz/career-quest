'use client'

import { useAuth } from '@/providers/auth-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
  const { user } = useAuth()
  const profileImage = user?.user_metadata?.avatar_url ?? null
  const name = user?.user_metadata?.full_name ?? '?'
  const initials = name
    ?.split(' ')
    ?.map((word: string) => word[0])
    ?.join('')
    ?.toUpperCase()

  return (
    <Avatar>
      {profileImage && <AvatarImage src={profileImage} alt={initials} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
