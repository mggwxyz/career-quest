'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { LogoutButton } from './logout-button'
import { CurrentUserAvatar } from './current-user-avatar'
import { ThemeToggle } from './theme-toggle'
import { Menu } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/intake/interests', label: 'Assessment' },
  { href: '/careers', label: 'Careers' },
]

export const NavigationBar = () => {
  const { loading, isAnonymous } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed top-3 left-4 right-4 z-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center px-6 py-3 bg-[var(--surface-glass)] backdrop-blur-xl border border-border rounded-[14px] shadow-[0_4px_30px_rgba(0,0,0,0.4),0_0_40px_rgba(124,58,237,0.06)] relative">
          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-foreground no-underline">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-secondary rounded-md flex items-center justify-center text-xs shadow-[0_0_12px_rgba(124,58,237,0.4)]">
              ✦
            </div>
            <span className="font-serif text-lg">Career Quest</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1 ml-auto">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm px-3.5 py-1.5 rounded-lg transition-all no-underline ${
                  isActive(link.href)
                    ? 'text-foreground bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="flex items-center gap-2 ml-3">
              <ThemeToggle />
              {!loading && (
                !isAnonymous
                  ? (
                    <>
                      <CurrentUserAvatar />
                      <LogoutButton />
                    </>
                  )
                  : (
                    <>
                      <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors no-underline px-2">Log In</Link>
                      <Link href="/intake/interests" className="text-sm font-semibold text-white bg-gradient-to-br from-primary to-secondary px-4 py-1.5 rounded-full shadow-[0_2px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] transition-all no-underline">Get Started</Link>
                    </>
                  )
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2 ml-auto">
            <ThemeToggle />
            {!loading && !isAnonymous && <CurrentUserAvatar />}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden mt-2 p-4 bg-[var(--surface-glass)] backdrop-blur-xl border border-border rounded-xl shadow-lg">
            <div className="flex flex-col gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm px-3 py-2 rounded-lg transition-all no-underline ${
                    isActive(link.href)
                      ? 'text-foreground bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {!loading && isAnonymous && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                  <Link href="/auth/login" className="text-sm text-muted-foreground no-underline">Log In</Link>
                  <Link href="/intake/interests" className="text-sm font-semibold text-white bg-gradient-to-br from-primary to-secondary px-4 py-1.5 rounded-full no-underline">Get Started</Link>
                </div>
              )}
              {!loading && !isAnonymous && (
                <div className="mt-2 pt-2 border-t border-border">
                  <LogoutButton />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
