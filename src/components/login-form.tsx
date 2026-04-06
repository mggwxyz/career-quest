'use client'

import { cn } from '@/lib/utils'
import { SocialLoginForm } from '@/components/social-login-form'
import { PasswordLoginForm } from '@/components/password-login-form'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6 w-full max-w-sm', className)} {...props}>
      <div className="p-8 sm:p-10 bg-surface/60 border border-border rounded-[20px] backdrop-blur-xl">
        {/* Logo + Title */}
        <div className="text-center mb-7">
          <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-primary to-secondary rounded-[10px] flex items-center justify-center text-lg shadow-[0_0_12px_rgba(124,58,237,0.4)]">
            <span aria-hidden="true">✦</span>
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-1">Welcome Back</h2>
          <p className="text-sm text-muted-foreground">Sign in to continue your quest</p>
        </div>

        <div className="flex flex-col gap-5">
          <PasswordLoginForm />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] uppercase tracking-wider text-text-dim">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <SocialLoginForm />
        </div>
      </div>
    </div>
  )
}
