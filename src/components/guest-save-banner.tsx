import Link from 'next/link'
import { getUserId } from '@/lib/auth/identity'

/**
 * Shown only to guests (a signed guest cookie, no account): a gentle nudge to
 * sign up so their assessment, matches, and shortlist survive. Signing up
 * merges everything into the new account — nothing is lost (G01).
 */
export async function GuestSaveBanner() {
  const identity = await getUserId()
  if (!identity?.isGuest) return null

  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-muted-foreground">
        <span aria-hidden="true">✨ </span>
        You&apos;re exploring as a guest. Create a free account to save your results — you won&apos;t lose anything.
      </p>
      <Link
        href="/auth/sign-up"
        className="shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary px-5 py-2 text-center font-semibold text-primary-foreground no-underline shadow-[var(--shadow-glow-sm)]"
      >
        Save my progress
      </Link>
    </div>
  )
}
