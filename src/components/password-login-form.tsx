'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function PasswordLoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/')
    }
    catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('', className)} {...props}>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="px-4 py-2.5 rounded-[10px] border border-border bg-background/60 text-foreground text-sm outline-none focus:border-border-hover transition-colors placeholder:text-text-dim" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-text-dim hover:text-primary-soft transition-colors no-underline">Forgot password?</Link>
          </div>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="px-4 py-2.5 rounded-[10px] border border-border bg-background/60 text-foreground text-sm outline-none focus:border-border-hover transition-colors placeholder:text-text-dim" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-[10px] bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] mt-1 disabled:opacity-50">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
        <p className="text-center text-sm text-text-dim">
          Don&apos;t have an account?
          {' '}
          <Link href="/auth/sign-up" className="text-primary-soft font-medium no-underline hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  )
}
