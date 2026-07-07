'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { mergeGuestAction } from '@/app/actions/merge-guest'

// Once per tab session we've already reconciled — avoids re-calling the action
// on every navigation for a user who has no guest data to merge.
const DONE_KEY = 'cq_guest_merge_done'

/**
 * Fires the guest→account merge as soon as auth resolves to a signed-in user.
 * Runs for both email sign-in and OAuth returns (the page simply loads
 * logged-in). The server action reads the httpOnly guest cookie, so this
 * component holds no secret and safely no-ops when there's nothing to merge.
 */
export function GuestMergeOnLogin() {
  const { isLoggedIn, loading } = useAuth()
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (loading || !isLoggedIn || ran.current) return
    if (sessionStorage.getItem(DONE_KEY)) return
    ran.current = true
    sessionStorage.setItem(DONE_KEY, '1')
    ;(async () => {
      try {
        const { merged } = await mergeGuestAction()
        // Refresh so server components re-read with the just-claimed data.
        if (merged) router.refresh()
      }
      catch (err) {
        console.error('[GuestMergeOnLogin] merge failed:', err)
      }
    })()
  }, [isLoggedIn, loading, router])

  return null
}
