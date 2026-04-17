'use client'

import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth/client'
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
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await authClient.signIn.email({ email, password, callbackURL: '/' })
      if (error) {
        setError(error.message ?? 'Invalid email or password')
        setIsLoading(false)
        return
      }
      router.push('/')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('', className)} {...props}>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">Email</label>
          <input id="login-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="px-4 py-2.5 rounded-xl border border-border bg-background/60 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover transition-colors placeholder:text-text-dim" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-text-dim hover:text-primary-soft transition-colors no-underline">Forgot password?</Link>
          </div>
          <input id="login-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="px-4 py-2.5 rounded-xl border border-border bg-background/60 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover transition-colors placeholder:text-text-dim" />
        </div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[var(--shadow-glow-sm)] mt-1 disabled:opacity-50">
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
