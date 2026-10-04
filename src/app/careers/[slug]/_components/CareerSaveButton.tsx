'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bookmark, LogIn } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  onetId: string
  redirectPath: string
  isAuthenticated: boolean
  initiallySaved: boolean
}

export function CareerSaveButton({
  onetId,
  redirectPath,
  isAuthenticated,
  initiallySaved,
}: Props) {
  const [saved, setSaved] = useState(initiallySaved)
  const [pending, setPending] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/auth/sign-up?redirect=${encodeURIComponent(redirectPath)}`}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-secondary px-4 py-2 text-xs font-semibold text-primary-foreground no-underline shadow-[var(--shadow-glow-sm)]"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Sign up to save
        </Link>
        <Link
          href={`/auth/login?redirect=${encodeURIComponent(redirectPath)}`}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground no-underline transition-all hover:border-border-hover hover:text-foreground"
        >
          <LogIn className="h-3.5 w-3.5" />
          Log in
        </Link>
      </div>
    )
  }

  const saveCareer = async () => {
    if (pending || saved) return
    setPending(true)
    try {
      const res = await fetch('/api/careers/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onetId, action: 'saved' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to save career')
      }
      setSaved(true)
      toast.success('Career saved')
    }
    catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save career')
    }
    finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={saveCareer}
      disabled={pending || saved}
      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-border-hover hover:text-foreground disabled:cursor-default disabled:border-primary/40 disabled:bg-primary/10 disabled:text-foreground"
    >
      <Bookmark className="h-3.5 w-3.5" />
      {saved ? 'Saved' : pending ? 'Saving...' : 'Save career'}
    </button>
  )
}
