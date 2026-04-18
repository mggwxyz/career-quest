'use client'

import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth/client'
import Link from 'next/link'
import { useState } from 'react'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) {
        setError(error.message ?? 'An error occurred')
        setIsLoading(false)
        return
      }
      setSuccess(true)
      setIsLoading(false)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6 w-full max-w-sm', className)} {...props}>
      <div className="p-8 sm:p-10 bg-surface/60 border border-border rounded-2xl backdrop-blur-xl">
        <div className="text-center mb-7">
          <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-lg text-primary-foreground shadow-[var(--shadow-glow-sm)]">
            <span aria-hidden="true">✦</span>
          </div>
          {success
            ? (
              <>
                <h2 className="font-serif text-2xl text-foreground mb-1">Check Your Email</h2>
                <p className="text-sm text-muted-foreground">Password reset instructions sent</p>
                <p className="text-xs text-text-dim mt-4">If you registered using your email and password, you will receive a password reset email.</p>
              </>
            )
            : (
              <>
                <h2 className="font-serif text-2xl text-foreground mb-1">Reset Password</h2>
                <p className="text-sm text-muted-foreground">We&apos;ll send you a link to reset your password</p>
              </>
            )}
        </div>

        {!success && (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="forgot-email" className="text-xs font-medium text-muted-foreground">Email</label>
              <input id="forgot-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="px-4 py-2.5 rounded-xl border border-border bg-background/60 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover transition-colors placeholder:text-text-dim" />
            </div>
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow-sm)] mt-1 disabled:opacity-50">
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </button>
            <p className="text-center text-sm text-text-dim">
              Remember your password?
              {' '}
              <Link href="/auth/login" className="text-primary-soft font-medium no-underline hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
