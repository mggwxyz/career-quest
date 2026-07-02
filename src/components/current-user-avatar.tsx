'use client'

import { useAuth } from '@/providers/auth-provider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word: string) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export interface CurrentUserAvatarProps {
  className?: string
}

export const CurrentUserAvatar = ({ className }: CurrentUserAvatarProps) => {
  const { user, loading } = useAuth()
  const name = user?.name?.trim() || ''
  const initials = name ? initialsFromName(name) : '?'

  return (
    <Avatar
      className={cn('size-9', className)}
      role="img"
      aria-busy={loading}
      aria-label={loading ? 'Loading profile' : `Profile: ${name || 'User'}`}
    >
      <AvatarFallback
        className={cn(
          // Inset similar to nav links (px-3.5 py-1.5), scaled for a small circle
          'px-2.5 py-1.5 text-xs font-semibold leading-none tracking-wide',
          loading && 'animate-pulse',
        )}
      >
        {loading ? null : initials}
      </AvatarFallback>
    </Avatar>
  )
}
