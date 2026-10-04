'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/providers/auth-provider'

export function GuestMergeOnAuth() {
  const { loading, user, isAnonymous } = useAuth()
  const mergedUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading || isAnonymous || !user?.id || mergedUserRef.current === user.id) return
    mergedUserRef.current = user.id

    void fetch('/api/auth/merge-guest', { method: 'POST' })
      .then((res) => {
        if (!res.ok) {
          mergedUserRef.current = null
          return
        }
        window.dispatchEvent(new Event('career-quest:guest-merged'))
      })
      .catch((err) => {
        mergedUserRef.current = null
        console.error('[guest-merge] merge failed:', err)
      })
  }, [loading, isAnonymous, user?.id])

  return null
}
