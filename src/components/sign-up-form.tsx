'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    }
    catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6 w-full max-w-sm', className)} {...props}>
      <div className="p-8 sm:p-10 bg-surface/60 border border-border rounded-2xl backdrop-blur-xl">
        <div className="text-center mb-7">
          <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-lg shadow-[var(--shadow-glow-sm)]">
            <span aria-hidden="true">✦</span>
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-1">Create Account</h2>
          <p className="text-sm text-muted-foreground">Start your career exploration journey</p>
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">Email</label>
            <input id="signup-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="px-4 py-2.5 rounded-xl border border-border bg-background/60 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover transition-colors placeholder:text-text-dim" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">Password</label>
            <input id="signup-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="px-4 py-2.5 rounded-xl border border-border bg-background/60 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover transition-colors placeholder:text-text-dim" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-repeat-password" className="text-xs font-medium text-muted-foreground">Repeat Password</label>
            <input id="signup-repeat-password" type="password" required value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} placeholder="••••••••" className="px-4 py-2.5 rounded-xl border border-border bg-background/60 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover transition-colors placeholder:text-text-dim" />
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[var(--shadow-glow-sm)] mt-1 disabled:opacity-50">
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-dim mt-5">
          Already have an account?
          {' '}
          <Link href="/auth/login" className="text-primary-soft font-medium no-underline hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
