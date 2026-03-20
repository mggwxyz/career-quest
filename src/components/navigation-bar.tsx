'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { LogoutButton } from './logout-button'
import { CurrentUserAvatar } from './current-user-avatar'

const navLinks = [
  { href: '/intake/interests', label: 'Interests' },
  { href: '/intake/would-you-rather', label: 'Would You Rather' },
  { href: '/intake/summary', label: 'Summary' },
  { href: '/careers', label: 'Careers' },
]

export const NavigationBar = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <nav className="navbar p-0 bg-base-100 shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="container flex flex-row items-center mx-auto max-w-4xl">

        <div className="flex-1">
          <Link href="/" className="btn btn-ghost btn-link no-underline p-1 text-xl text-nowrap">Career Quest</Link>
        </div>
        <div className="flex flex-row items-center gap-1">
          {loading
            ? null
            : user
              ? (
            <>
              <div className="dropdown dropdown-end md:hidden">
                <div tabIndex={0} role="button" className="btn btn-ghost">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                  {navLinks.map(link => (
                    <li key={link.href}>
                      <Link href={link.href} className={isActive(link.href) ? 'active' : ''}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="menu menu-horizontal px-1 hidden md:flex">
                {navLinks.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className={isActive(link.href) ? 'active' : ''}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="max-h-7 flex flex-row items-center gap-2">
                <CurrentUserAvatar />
                <LogoutButton />
              </div>
            </>
          ) : (
            <div className="flex flex-row items-center gap-2">
              <Link href="/login" className="btn btn-ghost btn-sm">Log In</Link>
              <Link href="/intake/interests" className="btn btn-primary btn-sm">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
