# Celestial Wayfinding Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire Career Quest app with a "Deep Space Elegance" aesthetic — dark-first theme, Instrument Serif + DM Sans typography, animated star fields, glass-morphism navigation, cosmic portal assessment cards, and glowing career result cards.

**Architecture:** Swap fonts in root layout, rewrite globals.css color tokens for dark-first theme, create a reusable `StarField` component for animated backgrounds, then restyle each page component in sequence: nav → home → interests → assessment → summary → careers → auth. Keep DaisyUI for utility components (dropdowns, modals, toasts), custom-build all key visual pieces.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, DaisyUI v5 (utility components only), Framer Motion, next-themes, Google Fonts (Instrument Serif, DM Sans)

**Spec:** `docs/superpowers/specs/2026-03-27-celestial-wayfinding-redesign.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/layout.tsx` | Replace Geist fonts with Instrument Serif + DM Sans |
| Modify | `src/app/globals.css` | New color tokens, dark-first theme, star twinkle keyframes |
| Modify | `src/app/_styles/classes.ts` | Update container class for new aesthetic |
| Create | `src/components/star-field.tsx` | Reusable animated star field background component |
| Modify | `src/components/navigation-bar.tsx` | Floating glass navbar with glow edge |
| Modify | `src/components/theme-toggle.tsx` | Styled moon/sun toggle for glass nav |
| Modify | `src/app/page.tsx` | Cosmic hero + How It Works redesign |
| Modify | `src/app/intake/interests/_components/InterestsClient.tsx` | Pill-shaped interest chips with glow selection |
| Modify | `src/app/intake/would-you-rather/_components/OptionCard.tsx` | Cosmic portal cards with photo overlay |
| Modify | `src/app/intake/would-you-rather/page.tsx` | New progress bar, "or" badge, updated layout |
| Modify | `src/app/intake/summary/page.tsx` | RIASEC bars, value tags, profile layout |
| Modify | `src/app/careers/_components/CareersClient.tsx` | Glowing card grid replacing table |
| Modify | `src/app/auth/layout.tsx` | Star field + nebula background for all auth pages |
| Modify | `src/components/login-form.tsx` | Glass card auth styling |
| Modify | `src/components/sign-up-form.tsx` | Glass card auth styling |
| Modify | `src/components/password-login-form.tsx` | Cosmic form inputs |
| Modify | `src/components/social-login-form.tsx` | Outlined OAuth button |
| Modify | `src/components/forgot-password-form.tsx` | Glass card auth styling |
| Modify | `src/components/update-password-form.tsx` | Glass card auth styling |
| Remove | `src/components/step-indicator.tsx` | Replaced by per-page progress indicators |

---

### Task 1: Design System Foundation — Fonts & Color Tokens

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/_styles/classes.ts`

- [ ] **Step 1: Replace fonts in layout.tsx**

Replace Geist imports with Instrument Serif + DM Sans. Update the CSS variable names and body class.

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { NavigationBar } from '@/components/navigation-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  weight: '400',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Career Quest',
  description: 'Career Quest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem
          themes={['light', 'dark']}
        >
          <NavigationBar />
          <main className="mt-16">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Rewrite globals.css with Celestial color tokens**

Replace the entire color system. Dark is now the primary experience. Add the star twinkle keyframe and nebula utility classes.

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@plugin "daisyui" {
  themes: dark --default;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-dm-sans);
  --font-serif: var(--font-instrument-serif);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  /* Celestial custom tokens */
  --color-surface: var(--surface);
  --color-surface-glass: var(--surface-glass);
  --color-primary-soft: var(--primary-soft);
  --color-accent-warm: var(--accent-warm);
  --color-accent-cyan: var(--accent-cyan);
  --color-text-dim: var(--text-dim);
  --color-border-hover: var(--border-hover);
  --color-glow: var(--glow);
}

/* Dark theme (default / primary experience) */
:root {
  --radius: 0.625rem;
  --background: #0a0a1a;
  --foreground: #e0dff0;
  --card: #0f0f24;
  --card-foreground: #e0dff0;
  --popover: #0f0f24;
  --popover-foreground: #e0dff0;
  --primary: #7c3aed;
  --primary-foreground: #ffffff;
  --secondary: #6366f1;
  --secondary-foreground: #e0dff0;
  --muted: #1a1a2e;
  --muted-foreground: #8b85a8;
  --accent: #fbbf24;
  --accent-foreground: #1a0f00;
  --destructive: #ef4444;
  --border: rgba(139, 92, 246, 0.15);
  --input: rgba(139, 92, 246, 0.15);
  --ring: #7c3aed;
  --chart-1: #7c3aed;
  --chart-2: #6366f1;
  --chart-3: #06b6d4;
  --chart-4: #fbbf24;
  --chart-5: #a855f7;
  /* Celestial tokens */
  --surface: #0f0f24;
  --surface-glass: rgba(10, 10, 30, 0.6);
  --primary-soft: #c4b5fd;
  --accent-warm: #fbbf24;
  --accent-cyan: #06b6d4;
  --text-dim: #6b63a0;
  --border-hover: rgba(139, 92, 246, 0.4);
  --glow: rgba(139, 92, 246, 0.3);
  /* Sidebar */
  --sidebar: #0f0f24;
  --sidebar-foreground: #e0dff0;
  --sidebar-primary: #7c3aed;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1a1a2e;
  --sidebar-accent-foreground: #e0dff0;
  --sidebar-border: rgba(139, 92, 246, 0.15);
  --sidebar-ring: #7c3aed;
}

/* Light theme */
.light, [data-theme="light"] {
  --background: #faf9f6;
  --foreground: #1a1a2e;
  --card: #ffffff;
  --card-foreground: #1a1a2e;
  --popover: #ffffff;
  --popover-foreground: #1a1a2e;
  --primary: #6d28d9;
  --primary-foreground: #ffffff;
  --secondary: #818cf8;
  --secondary-foreground: #1a1a2e;
  --muted: #f0eef5;
  --muted-foreground: #6b63a0;
  --accent: #d97706;
  --accent-foreground: #ffffff;
  --destructive: #dc2626;
  --border: rgba(107, 99, 160, 0.15);
  --input: rgba(107, 99, 160, 0.15);
  --ring: #6d28d9;
  --surface: #ffffff;
  --surface-glass: rgba(255, 255, 255, 0.7);
  --primary-soft: #8b5cf6;
  --accent-warm: #d97706;
  --accent-cyan: #0891b2;
  --text-dim: #9ca3af;
  --border-hover: rgba(109, 40, 217, 0.3);
  --glow: rgba(109, 40, 217, 0.15);
  --sidebar: #f0eef5;
  --sidebar-foreground: #1a1a2e;
  --sidebar-primary: #6d28d9;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e8e5f0;
  --sidebar-accent-foreground: #1a1a2e;
  --sidebar-border: rgba(107, 99, 160, 0.15);
  --sidebar-ring: #6d28d9;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans;
  }
}

/* Star twinkle animation */
@keyframes twinkle {
  0%, 100% { opacity: 0; transform: scale(0.8); }
  50% { opacity: var(--max-opacity, 0.5); transform: scale(1); }
}
```

- [ ] **Step 3: Update container class**

```ts
// src/app/_styles/classes.ts
export const containerClassName = 'container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative'
```

- [ ] **Step 4: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. The app now has dark background with violet primary colors. Fonts load as DM Sans (body) and Instrument Serif (when applied via `font-serif` class).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/_styles/classes.ts
git commit -m "feat: celestial design system foundation — new fonts, dark-first color tokens"
```

---

### Task 2: Star Field Component

**Files:**
- Create: `src/components/star-field.tsx`

- [ ] **Step 1: Create the StarField component**

A memoized React component that procedurally generates twinkling star divs. Used as a background layer on all pages.

```tsx
// src/components/star-field.tsx
'use client'

import { useMemo } from 'react'

interface StarFieldProps {
  count?: number
  className?: string
}

export function StarField({ count = 45, className = '' }: StarFieldProps) {
  const stars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const size = 0.5 + Math.random() * 1.5
      const colorRoll = Math.random()
      let color = 'bg-white'
      if (colorRoll > 0.92) color = 'bg-primary-soft'
      else if (colorRoll > 0.85) color = 'bg-accent-warm'
      else if (colorRoll > 0.80) color = 'bg-accent-cyan'

      return {
        id: i,
        style: {
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${size}px`,
          height: `${size}px`,
          '--duration': `${3 + Math.random() * 5}s`,
          '--delay': `${Math.random() * 6}s`,
          '--max-opacity': `${0.3 + Math.random() * 0.5}`,
          animation: `twinkle var(--duration) ease-in-out infinite`,
          animationDelay: `var(--delay)`,
          opacity: 0,
        } as React.CSSProperties,
        color,
      }
    })
  }, [count])

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {stars.map(star => (
        <div
          key={star.id}
          className={`absolute rounded-full ${star.color}`}
          style={star.style}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. Component is importable but not yet used on any page.

- [ ] **Step 3: Commit**

```bash
git add src/components/star-field.tsx
git commit -m "feat: add reusable StarField component with twinkling animation"
```

---

### Task 3: Navigation Bar — Floating Glass Style

**Files:**
- Modify: `src/components/navigation-bar.tsx`
- Modify: `src/components/theme-toggle.tsx`

- [ ] **Step 1: Rewrite the navigation bar**

Replace the current DaisyUI navbar with a floating glass bar.

```tsx
// src/components/navigation-bar.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
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
                user
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
            {!loading && user && <CurrentUserAvatar />}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground"
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
              {!loading && !user && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                  <Link href="/auth/login" className="text-sm text-muted-foreground no-underline">Log In</Link>
                  <Link href="/intake/interests" className="text-sm font-semibold text-white bg-gradient-to-br from-primary to-secondary px-4 py-1.5 rounded-full no-underline">Get Started</Link>
                </div>
              )}
              {!loading && user && (
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
```

- [ ] **Step 2: Update ThemeToggle for glass nav styling**

```tsx
// src/components/theme-toggle.tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <button className="w-7 h-7 rounded-full" aria-label="Toggle theme" />
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-7 h-7 rounded-full bg-primary/10 border border-border hover:border-border-hover flex items-center justify-center transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark'
        ? <Moon size={14} className="text-muted-foreground" />
        : <Sun size={14} className="text-muted-foreground" />}
    </button>
  )
}
```

- [ ] **Step 3: Update main layout margin**

The floating nav now sits 12px from top (py-3 ≈ 12px + 48px nav height ≈ 60px needed). Update the main content top margin in `layout.tsx`:

In `src/app/layout.tsx`, change `mt-16` to `mt-20` to account for the floating nav with its top offset:

```tsx
<main className="mt-20">{children}</main>
```

- [ ] **Step 4: Verify build compiles and check visually**

Run: `pnpm build`
Expected: Build succeeds. Nav floats above content with glass blur, violet glow line on bottom edge.

- [ ] **Step 5: Commit**

```bash
git add src/components/navigation-bar.tsx src/components/theme-toggle.tsx src/app/layout.tsx
git commit -m "feat: floating glass navigation bar with cosmic styling"
```

---

### Task 4: Home Page — Cosmic Hero & How It Works

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite the home page**

Replace the current DaisyUI hero with the Celestial Wayfinding design. Star field background, Instrument Serif headline, staggered How It Works cards.

```tsx
// src/app/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { StarField } from '@/components/star-field'

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Nebula gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 600px 400px at 25% 20%, rgba(88, 28, 135, 0.35) 0%, transparent 70%),
              radial-gradient(ellipse 500px 350px at 75% 70%, rgba(30, 58, 138, 0.25) 0%, transparent 70%),
              radial-gradient(ellipse 300px 300px at 60% 30%, rgba(124, 58, 237, 0.15) 0%, transparent 70%)
            `,
          }} />
        </div>

        <StarField count={55} />

        <div className="relative z-10 max-w-2xl">
          <motion.div
            className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            ✦ Career Exploration Tool
          </motion.div>

          <motion.h1
            className="font-serif text-4xl sm:text-5xl md:text-[56px] leading-[1.15] text-foreground mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Find the Career You Were{' '}
            <em className="text-primary-soft">Made For</em>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-9 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Answer a few questions about your interests, values, and work style — then let AI match you with careers that actually fit.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              href="/intake/interests"
              className="inline-flex items-center gap-2 px-9 py-3.5 bg-gradient-to-br from-primary to-secondary text-white font-semibold rounded-full shadow-[0_2px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 transition-all no-underline"
            >
              Get Started <span className="text-lg">→</span>
            </Link>
            <a
              href="#how-it-works"
              className="px-7 py-3.5 border border-border hover:border-border-hover hover:bg-primary/5 text-primary-soft font-medium rounded-full transition-all no-underline"
            >
              How It Works
            </a>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative max-w-4xl mx-auto px-6 pb-20">
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-16" />

        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl text-foreground mb-2">How It Works</h2>
          <p className="text-sm text-text-dim">Three steps to find careers that fit</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { num: '1', icon: '🎯', title: 'Pick Your Interests', desc: 'Select topics that excite you or add your own — this sets the foundation for your profile.' },
            { num: '2', icon: '⚖️', title: 'Answer Quick Questions', desc: 'Choose between scenarios in a "would you rather" format that reveals your work personality.' },
            { num: '3', icon: '🌟', title: 'See Your Matches', desc: 'Get personalized career recommendations powered by AI, ranked by how well they fit you.' },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              className="text-center p-8 bg-surface/50 border border-border rounded-2xl hover:border-border-hover hover:bg-surface/80 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] transition-all"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 shadow-[0_0_20px_rgba(124,58,237,0.2)] inline-flex items-center justify-center font-serif text-lg text-primary-soft mb-4">
                {step.num}
              </div>
              <div className="text-3xl mb-3">{step.icon}</div>
              <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. Home page shows cosmic hero with star field, Instrument Serif headline, staggered How It Works cards.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: cosmic hero and How It Works section on home page"
```

---

### Task 5: Interests Page — Pill Chips with Glow Selection

**Files:**
- Modify: `src/app/intake/interests/_components/InterestsClient.tsx`

- [ ] **Step 1: Rewrite InterestsClient with cosmic chip design**

Replace grid buttons with pill-shaped chips. Add star field background. Remove StepIndicator (replaced by page-level progress context).

```tsx
// src/app/intake/interests/_components/InterestsClient.tsx
'use client'

import { useState, useTransition } from 'react'
import { useAppStore } from '@/store/appStore'
import { saveInterestsAndRedirect } from '../actions'
import { toast } from 'sonner'
import { StarField } from '@/components/star-field'
import { useEffect } from 'react'

const commonInterests = [
  '🎨 Art & Design', '🔬 Science', '💻 Technology', '📊 Business',
  '🎵 Music', '✍️ Writing', '🏥 Healthcare', '📐 Engineering',
  '🌍 Environment', '🧠 Psychology', '⚖️ Law', '🎓 Education',
  '🏗️ Architecture', '📸 Photography', '🍳 Culinary', '🏋️ Fitness',
  '✈️ Travel', '🎮 Gaming', '📱 Social Media', '🌱 Sustainability',
]

interface InterestsClientProps {
  initialInterests: string[]
}

export default function InterestsClient({ initialInterests }: InterestsClientProps) {
  const [customInterest, setCustomInterest] = useState('')
  const [isPending, startTransition] = useTransition()
  const { interests, addInterest, removeInterest, setInterests } = useAppStore()

  useEffect(() => {
    if (initialInterests.length > 0 && interests.length === 0) {
      setInterests(initialInterests)
    }
  }, [initialInterests, interests.length, setInterests])

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      addInterest(customInterest.trim())
      setCustomInterest('')
    }
  }

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      removeInterest(interest)
    } else {
      addInterest(interest)
    }
  }

  const handleContinue = () => {
    startTransition(async () => {
      try {
        await saveInterestsAndRedirect(interests)
      } catch {
        toast.error('Failed to save interests. Please try again.')
      }
    })
  }

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 500px 350px at 20% 30%, rgba(88, 28, 135, 0.2) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 80% 70%, rgba(30, 58, 138, 0.15) 0%, transparent 70%)
          `,
        }} />
        <StarField count={40} />
      </div>

      {/* Page header */}
      <div className="text-center mb-10 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">What Interests You?</h1>
        <p className="text-sm text-muted-foreground">Pick as many as you like, or add your own</p>
      </div>

      {/* Interest chips */}
      <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl mx-auto mb-8">
        {commonInterests.map(interest => (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
              interests.includes(interest)
                ? 'border-primary/60 bg-primary/15 text-foreground shadow-[0_0_16px_rgba(124,58,237,0.15)]'
                : 'border-border bg-surface/60 text-muted-foreground hover:border-border-hover hover:text-primary-soft hover:bg-primary/5'
            }`}
          >
            {interest}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2.5 max-w-md mx-auto mb-10">
        <input
          type="text"
          value={customInterest}
          onChange={e => setCustomInterest(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddCustomInterest()}
          placeholder="Add a custom interest..."
          className="flex-1 px-5 py-2.5 rounded-full border border-border bg-surface/60 text-foreground text-sm placeholder:text-text-dim outline-none focus:border-border-hover transition-colors"
        />
        <button
          onClick={handleAddCustomInterest}
          className="px-5 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[0_2px_8px_rgba(124,58,237,0.2)]"
        >
          Add
        </button>
      </div>

      {/* Continue */}
      <div className="text-center">
        <button
          onClick={handleContinue}
          disabled={isPending}
          className="px-10 py-3.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. Interests page shows pill chips with glow on selection, star field background.

- [ ] **Step 3: Commit**

```bash
git add src/app/intake/interests/_components/InterestsClient.tsx
git commit -m "feat: cosmic pill-chip interests selection with glow feedback"
```

---

### Task 6: Option Card — Cosmic Portal Cards

**Files:**
- Modify: `src/app/intake/would-you-rather/_components/OptionCard.tsx`

- [ ] **Step 1: Rewrite OptionCard with cosmic portal styling**

Photo overlay gradients, violet glow borders, spring-animated checkmark badge.

```tsx
// src/app/intake/would-you-rather/_components/OptionCard.tsx
'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { WouldYouRatherQuestionOption } from '@/store/slices/wouldYouRatherSlice'

interface OptionCardProps {
  option: WouldYouRatherQuestionOption
  isSelected: boolean
  showCheckmark: boolean
  onClick: () => void
}

export default function OptionCard({ option, isSelected, showCheckmark, onClick }: OptionCardProps) {
  return (
    <motion.button
      className={`rounded-2xl overflow-hidden cursor-pointer flex flex-col border transition-all duration-300 ${
        isSelected
          ? 'border-primary/70 shadow-[0_0_50px_rgba(124,58,237,0.25),0_0_100px_rgba(124,58,237,0.1)]'
          : 'border-border bg-surface/50 hover:border-border-hover hover:shadow-[0_0_40px_rgba(124,58,237,0.15)]'
      }`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image with cosmic overlay */}
      <figure className="relative w-full h-[200px] sm:h-[250px] overflow-hidden">
        <Image
          src={option.imageUrl}
          alt={option.prompt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        {/* Cosmic gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(180deg, rgba(10, 10, 26, 0) 40%, rgba(10, 10, 26, 0.85) 100%),
              linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, transparent 50%)
            `,
          }}
        />

        {/* Checkmark badge */}
        {showCheckmark && isSelected && (
          <motion.div
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-[0_0_20px_rgba(124,58,237,0.5)] z-10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 15 }}
          >
            ✓
          </motion.div>
        )}
      </figure>

      {/* Card body */}
      <div className="p-5 flex-none text-left">
        <h2 className="text-[15px] font-semibold text-foreground mb-1.5 leading-snug">
          {option.text}
        </h2>
      </div>
    </motion.button>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. OptionCard has cosmic styling with photo overlays and violet glow.

- [ ] **Step 3: Commit**

```bash
git add src/app/intake/would-you-rather/_components/OptionCard.tsx
git commit -m "feat: cosmic portal option cards with photo overlay and glow borders"
```

---

### Task 7: Would You Rather Page — Progress Bar, "or" Badge, Updated Layout

**Files:**
- Modify: `src/app/intake/would-you-rather/page.tsx`

- [ ] **Step 1: Rewrite the page with cosmic layout**

New thin gradient progress bar, "or" badge between cards, star field, remove StepIndicator.

```tsx
// src/app/intake/would-you-rather/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WouldYouRatherQuestion } from '@/store/slices/wouldYouRatherSlice'
import { questions } from '@/app/_data/questions'
import OptionCard from './_components/OptionCard'
import { useAppStore } from '@/store/appStore'
import { useIsLoggedIn } from '@/hooks/use-is-logged-in'
import Link from 'next/link'
import { toast } from 'sonner'
import { StarField } from '@/components/star-field'

const allQuestions = questions.decks.flatMap(deck => deck.questions)

export default function WouldYouRather() {
  const { currentQuestionIndex, setAnswer, skipQuestion, nextQuestion, previousQuestion, resetGame, hydrateFromDB, answers, skippedQuestions } = useAppStore()
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const isLoggedIn = useIsLoggedIn()

  const loadSavedProgress = useCallback(async () => {
    try {
      const response = await fetch('/api/user/progress')
      const data = await response.json()
      if (response.ok && data.progress?.answers) {
        hydrateFromDB(data.progress.answers, data.progress.skippedQuestions || [])
      }
    } catch {
      // Silent fail
    } finally {
      setIsHydrated(true)
    }
  }, [hydrateFromDB])

  const saveProgressToDB = useCallback(async () => {
    try {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          skippedQuestions: Array.from(skippedQuestions),
        }),
      })
    } catch {
      // Silent fail
    }
  }, [answers, skippedQuestions])

  useEffect(() => {
    if (isLoggedIn && !isHydrated) loadSavedProgress()
    else if (!isLoggedIn) setIsHydrated(true)
  }, [isLoggedIn, isHydrated, loadSavedProgress])

  useEffect(() => {
    if (isLoggedIn && isHydrated && (Object.keys(answers).length > 0 || skippedQuestions.size > 0)) {
      saveProgressToDB()
    }
  }, [answers, skippedQuestions, isLoggedIn, isHydrated, saveProgressToDB])

  const currentQuestion: WouldYouRatherQuestion = allQuestions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100

  const handleOptionSelect = (option: number) => {
    if (selectedOption !== null) return
    setSelectedOption(option)
    setShowCheckmark(true)
    setAnswer(currentQuestion.id.toString(), option)

    setTimeout(() => {
      setShowCheckmark(false)
      setSelectedOption(null)
      nextQuestion()
      if (currentQuestionIndex === allQuestions.length - 1) {
        toast.success('Assessment completed!', {
          description: 'Your preferences have been recorded. Ready to explore your career matches?',
        })
      }
    }, 500)
  }

  const handleSkipQuestion = () => {
    if (selectedOption !== null) return
    skipQuestion(currentQuestion.id.toString())
    nextQuestion()
  }

  // Completion screen
  if (currentQuestionIndex >= allQuestions.length) {
    return (
      <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse 500px 350px at 30% 30%, rgba(88, 28, 135, 0.2) 0%, transparent 70%)`,
          }} />
          <StarField count={40} />
        </div>
        <div className="text-center pt-20">
          <h1 className="font-serif text-3xl text-foreground mb-4">Assessment Complete</h1>
          <p className="text-lg text-muted-foreground mb-10">We&apos;ve recorded your preferences.</p>
          <div className="flex flex-col gap-3 items-center">
            <Link href="/intake/summary" className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline">
              View Your Results
            </Link>
            <Link href="/careers" className="px-8 py-3 rounded-full border border-border text-primary-soft font-medium hover:border-border-hover transition-all no-underline">
              Explore Career Matches
            </Link>
            <button onClick={() => resetGame()} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
              Start Over
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 500px 350px at 20% 30%, rgba(88, 28, 135, 0.2) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 80% 70%, rgba(30, 58, 138, 0.15) 0%, transparent 70%)
          `,
        }} />
        <StarField count={40} />
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-1 rounded-full bg-primary/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_8px_rgba(124,58,237,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-text-dim whitespace-nowrap">
          {currentQuestionIndex + 1} of {allQuestions.length}
        </span>
      </div>

      {/* Question title */}
      <div className="text-center mb-8 mt-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Would you rather...</h1>
      </div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="relative max-w-3xl mx-auto">
            {/* "or" badge — desktop only */}
            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-10 h-10 rounded-full bg-background/90 border border-border flex items-center justify-center font-serif text-sm italic text-muted-foreground shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                or
              </div>
            </div>

            {/* Mobile: stacked */}
            <div className="block sm:hidden space-y-4">
              <OptionCard option={currentQuestion.option1} isSelected={selectedOption === 1} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(1)} />
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-background/90 border border-border flex items-center justify-center font-serif text-sm italic text-muted-foreground">
                  or
                </div>
              </div>
              <OptionCard option={currentQuestion.option2} isSelected={selectedOption === 2} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(2)} />
            </div>

            {/* Desktop: side by side */}
            <div className="hidden sm:grid grid-cols-2 gap-6">
              <OptionCard option={currentQuestion.option1} isSelected={selectedOption === 1} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(1)} />
              <OptionCard option={currentQuestion.option2} isSelected={selectedOption === 2} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(2)} />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="flex justify-center gap-3 mt-6">
        {currentQuestionIndex > 0 && (
          <button onClick={previousQuestion} className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all">
            ← Back
          </button>
        )}
        <button onClick={handleSkipQuestion} disabled={selectedOption !== null} className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all disabled:opacity-30">
          Skip →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. Assessment page has thin gradient progress bar, "or" badge, cosmic cards, star field.

- [ ] **Step 3: Commit**

```bash
git add src/app/intake/would-you-rather/page.tsx
git commit -m "feat: cosmic Would You Rather page with gradient progress bar and or badge"
```

---

### Task 8: Summary Page — RIASEC Bars & Value Tags

**Files:**
- Modify: `src/app/intake/summary/page.tsx`

- [ ] **Step 1: Rewrite summary page with RIASEC bars and value tags**

```tsx
// src/app/intake/summary/page.tsx
'use client'

import { useAppStore } from '@/store/appStore'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { describeCode } from '@/app/_data/codeLabels'
import { StarField } from '@/components/star-field'

const riasecColors: Record<string, string> = {
  R: 'from-red-500 to-red-600',
  I: 'from-indigo-500 to-indigo-600',
  A: 'from-purple-500 to-purple-600',
  S: 'from-cyan-500 to-cyan-600',
  E: 'from-amber-500 to-amber-600',
  C: 'from-green-500 to-green-600',
}

export default function IntakeSummary() {
  const { getDeckResults, answers } = useAppStore()
  const router = useRouter()
  const results = getDeckResults()

  useEffect(() => {
    if (Object.keys(answers).length === 0) {
      toast.error('No assessment data found. Please complete the assessment first.')
      router.push('/intake/would-you-rather')
    }
  }, [answers, router])

  const hasResults = results.riasec && Object.keys(results.riasec).length > 0
  const maxRiasec = hasResults ? Math.max(...Object.values(results.riasec)) : 1

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 500px 350px at 20% 30%, rgba(88, 28, 135, 0.2) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 80% 70%, rgba(30, 58, 138, 0.15) 0%, transparent 70%)
          `,
        }} />
        <StarField count={40} />
      </div>

      <div className="text-center mb-10 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Your Profile</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what your answers reveal about your career personality</p>
      </div>

      {!hasResults ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="font-serif text-2xl text-foreground mb-3">No Results Yet</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Complete the assessment to discover your career interests and get personalized recommendations.
          </p>
          <Link href="/intake/would-you-rather" className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline">
            Start the Assessment
          </Link>
        </div>
      ) : (
        <>
          {/* RIASEC bars — full width card */}
          <div className="p-6 bg-surface/50 border border-border rounded-2xl mb-6">
            <h2 className="font-serif text-lg text-foreground mb-5">Interest Profile (RIASEC)</h2>
            <div className="flex flex-col gap-3">
              {Object.entries(results.riasec || {})
                .sort((a, b) => b[1] - a[1])
                .map(([code, count], i) => {
                  const pct = Math.round((count / maxRiasec) * 100)
                  const colorClass = riasecColors[code] || 'from-primary to-secondary'
                  return (
                    <div key={code} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-muted-foreground">{describeCode(code)}</span>
                      <div className="flex-1 h-2 rounded-full bg-primary/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
                          style={{
                            width: `${pct}%`,
                            transition: `width 0.8s ease ${i * 0.1}s`,
                          }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs font-semibold text-primary-soft">{pct}%</span>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Work Values + Environment — 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-surface/50 border border-border rounded-2xl">
              <h2 className="font-serif text-lg text-foreground mb-4">Work Values</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(results.workvalue || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count], i) => {
                    const isTop = i < 2
                    return (
                      <span
                        key={code}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                          isTop
                            ? 'border-accent/30 bg-accent/10 text-accent'
                            : 'border-border bg-primary/5 text-primary-soft'
                        }`}
                      >
                        {describeCode(code)} ({count})
                      </span>
                    )
                  })}
              </div>
            </div>

            <div className="p-6 bg-surface/50 border border-border rounded-2xl">
              <h2 className="font-serif text-lg text-foreground mb-4">Environment</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(results.env || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count], i) => {
                    const isTop = i < 2
                    return (
                      <span
                        key={code}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                          isTop
                            ? 'border-accent/30 bg-accent/10 text-accent'
                            : 'border-border bg-primary/5 text-primary-soft'
                        }`}
                      >
                        {describeCode(code)} ({count})
                      </span>
                    )
                  })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Link href="/intake/would-you-rather" className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm">
              Retake Assessment
            </Link>
            <Link href="/careers" className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline">
              Explore Careers →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. Summary shows RIASEC bars with unique colors, value tags with amber highlights.

- [ ] **Step 3: Commit**

```bash
git add src/app/intake/summary/page.tsx
git commit -m "feat: cosmic summary page with RIASEC bars and value tags"
```

---

### Task 9: Careers Page — Glowing Card Grid

**Files:**
- Modify: `src/app/careers/_components/CareersClient.tsx`

- [ ] **Step 1: Rewrite CareersClient with card grid replacing table**

Replace the table layout with a 2-column card grid. Match percentage drives glow intensity. Keep all existing logic (loading, error, generate, auth states).

```tsx
// src/app/careers/_components/CareersClient.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { useRouter } from 'next/navigation'
import { useIsLoggedIn } from '@/hooks/use-is-logged-in'
import Link from 'next/link'
import { generateCareerRecommendationsAction } from '../actions'
import { toast } from 'sonner'
import { CareerRecommendation } from '@/lib/schemas/career'
import { StarField } from '@/components/star-field'

interface CareersClientProps {
  initialCareers: CareerRecommendation[]
}

const loadingMessages = [
  'Analyzing your interests and preferences...',
  'Matching your profile with potential careers...',
  'Considering job growth and salary trends...',
  'Finding careers that align with your values...',
  'Almost there! Just a few more calculations...',
  'Reviewing the latest labor market data...',
  'Personalizing your career recommendations...',
]

export default function CareersClient({ initialCareers }: CareersClientProps) {
  const { getDeckResults, interests, answers } = useAppStore()
  const [careers, setCareers] = useState<CareerRecommendation[]>(initialCareers)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const hasExistingData = initialCareers.length > 0
  const router = useRouter()
  const isLoggedIn = useIsLoggedIn()

  useEffect(() => {
    const results = getDeckResults()
    const hasResults = Object.values(results).some(deck => Object.keys(deck).length > 0)
    if (!hasResults && Object.keys(answers).length === 0) {
      toast.error('No assessment results found. Please complete the assessment first.')
      router.push('/intake/interests')
    }
  }, [answers, getDeckResults, router])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPending) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length)
      }, 3000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isPending])

  const generateCareerRecommendations = () => {
    startTransition(async () => {
      setError(null)
      const loadingToastId = toast.loading('Generating career recommendations...')
      try {
        const results = getDeckResults()
        const response = await generateCareerRecommendationsAction(results, interests)
        if (response.success && response.careers) {
          setCareers(response.careers)
          toast.success('Career recommendations generated!', { id: loadingToastId })
        } else {
          const msg = response.error || 'Failed to generate recommendations'
          setError(msg)
          toast.error(msg, { id: loadingToastId })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred'
        setError(msg)
        toast.error(msg, { id: loadingToastId })
      }
    })
  }

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-5xl relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 500px 350px at 20% 30%, rgba(88, 28, 135, 0.2) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 80% 70%, rgba(30, 58, 138, 0.15) 0%, transparent 70%)
          `,
        }} />
        <StarField count={40} />
      </div>

      <div className="text-center mb-10 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Your Career Matches</h1>
        <p className="text-sm text-muted-foreground">Ranked by how well they fit your profile</p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 text-center">
          <p className="text-sm text-destructive font-medium mb-2">Career Generation Failed</p>
          <p className="text-xs text-muted-foreground mb-3">{error}</p>
          <button onClick={generateCareerRecommendations} disabled={isPending} className="text-xs text-primary-soft hover:underline">
            Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {isPending ? (
        <div className="text-center py-12">
          <div className="loading loading-spinner loading-lg text-primary mb-4" />
          <p className="text-muted-foreground">{loadingMessages[loadingMessageIndex]}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 max-w-4xl mx-auto">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-2xl border border-border bg-surface/50 animate-pulse">
                <div className="flex justify-between mb-3">
                  <div className="h-4 w-32 bg-primary/10 rounded" />
                  <div className="h-4 w-16 bg-primary/10 rounded-full" />
                </div>
                <div className="h-3 w-full bg-primary/5 rounded mb-2" />
                <div className="h-3 w-3/4 bg-primary/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : careers.length === 0 ? (
        /* Empty states */
        <div className="text-center py-12">
          {!isLoggedIn ? (
            <div className="p-8 rounded-2xl border border-border bg-surface/50 max-w-lg mx-auto">
              <h3 className="font-serif text-xl text-foreground mb-3">Get AI-Powered Career Matches</h3>
              <p className="text-sm text-muted-foreground mb-6">Sign in to generate personalized career recommendations based on your assessment results.</p>
              <div className="flex gap-3 justify-center">
                <Link href="/auth/login" className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold text-sm no-underline">Log In</Link>
                <Link href="/auth/sign-up" className="px-6 py-2.5 rounded-full border border-border text-primary-soft text-sm font-medium no-underline">Sign Up</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="font-serif text-2xl text-foreground mb-3">Ready to Find Your Perfect Career?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">Based on your assessment results and selected interests, we can generate personalized career recommendations.</p>
              <button onClick={generateCareerRecommendations} disabled={isPending} className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] transition-all">
                Generate Career Recommendations
              </button>
            </>
          )}
        </div>
      ) : (
        /* Career cards grid */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto mb-10">
            {careers.map((career, index) => (
              <motion.div
                key={career.onetId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <Link
                  href={`/careers/${career.onetId}`}
                  className="block p-6 rounded-2xl border border-border bg-surface/50 hover:border-border-hover hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all no-underline group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary-soft transition-colors">{career.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{career.description}</p>
                  <div className="flex gap-4 text-xs mb-3">
                    <span><span className="text-text-dim">Growth:</span> <span className="text-green-400 font-medium">{career.jobGrowth}</span></span>
                    <span><span className="text-text-dim">Salary:</span> <span className="text-primary-soft font-medium">{career.salaryRange}</span></span>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="text-accent font-medium">Why it fits: </span>
                      {career.whyItMatches}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <button onClick={generateCareerRecommendations} disabled={isPending} className="px-7 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] transition-all text-sm">
              {hasExistingData ? 'Regenerate' : 'Generate New'}
            </button>
            <Link href="/intake/summary" className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm">
              View Results
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. Careers page shows card grid with glow effects, amber "Why it fits" labels.

- [ ] **Step 3: Commit**

```bash
git add src/app/careers/_components/CareersClient.tsx
git commit -m "feat: glowing career card grid replacing table layout"
```

---

### Task 10: Auth Pages — Centered Glass Card Layout

**Files:**
- Modify: `src/app/auth/layout.tsx`
- Modify: `src/components/login-form.tsx`
- Modify: `src/components/sign-up-form.tsx`
- Modify: `src/components/password-login-form.tsx`
- Modify: `src/components/social-login-form.tsx`

- [ ] **Step 1: Update auth layout with star field**

```tsx
// src/app/auth/layout.tsx
import { StarField } from '@/components/star-field'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative -mt-20 px-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 500px 350px at 30% 25%, rgba(88, 28, 135, 0.25) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 70% 75%, rgba(30, 58, 138, 0.2) 0%, transparent 70%)
          `,
        }} />
        <StarField count={40} />
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Restyle LoginForm as glass card**

```tsx
// src/components/login-form.tsx
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
            ✦
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
```

- [ ] **Step 3: Restyle SignUpForm as glass card**

```tsx
// src/components/sign-up-form.tsx
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
        options: { emailRedirectTo: `${window.location.origin}/protected` },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6 w-full max-w-sm', className)} {...props}>
      <div className="p-8 sm:p-10 bg-surface/60 border border-border rounded-[20px] backdrop-blur-xl">
        <div className="text-center mb-7">
          <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-primary to-secondary rounded-[10px] flex items-center justify-center text-lg shadow-[0_0_12px_rgba(124,58,237,0.4)]">
            ✦
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-1">Create Account</h2>
          <p className="text-sm text-muted-foreground">Start your career exploration journey</p>
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="px-4 py-2.5 rounded-[10px] border border-border bg-background/60 text-foreground text-sm outline-none focus:border-border-hover transition-colors placeholder:text-text-dim" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="px-4 py-2.5 rounded-[10px] border border-border bg-background/60 text-foreground text-sm outline-none focus:border-border-hover transition-colors placeholder:text-text-dim" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Repeat Password</label>
            <input type="password" required value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} placeholder="••••••••" className="px-4 py-2.5 rounded-[10px] border border-border bg-background/60 text-foreground text-sm outline-none focus:border-border-hover transition-colors placeholder:text-text-dim" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-[10px] bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] mt-1 disabled:opacity-50">
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-dim mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary-soft font-medium no-underline hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Restyle PasswordLoginForm**

```tsx
// src/components/password-login-form.tsx
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
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
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
          Don&apos;t have an account?{' '}
          <Link href="/auth/sign-up" className="text-primary-soft font-medium no-underline hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Restyle SocialLoginForm**

```tsx
// src/components/social-login-form.tsx
'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { getURL } from '@/lib/utils'
import { toast } from 'sonner'

export function SocialLoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSocialLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${getURL()}/auth/oauth?next=/` },
      })
      if (error) throw error
      toast.success('Redirecting to Google...')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An error occurred'
      setError(msg)
      toast.error(`Login failed: ${msg}`)
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('', className)} {...props}>
      <form onSubmit={handleSocialLogin}>
        {error && <p className="text-xs text-destructive mb-3">{error}</p>}
        <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-[10px] border border-border bg-surface/50 text-primary-soft text-sm font-medium flex items-center justify-center gap-2 hover:border-border-hover hover:bg-primary/5 transition-all disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {isLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Restyle ForgotPasswordForm**

```tsx
// src/components/forgot-password-form.tsx
'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6 w-full max-w-sm', className)} {...props}>
      <div className="p-8 sm:p-10 bg-surface/60 border border-border rounded-[20px] backdrop-blur-xl">
        <div className="text-center mb-7">
          <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-primary to-secondary rounded-[10px] flex items-center justify-center text-lg shadow-[0_0_12px_rgba(124,58,237,0.4)]">
            ✦
          </div>
          {success ? (
            <>
              <h2 className="font-serif text-2xl text-foreground mb-1">Check Your Email</h2>
              <p className="text-sm text-muted-foreground">Password reset instructions sent</p>
              <p className="text-xs text-text-dim mt-4">If you registered using your email and password, you will receive a password reset email.</p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl text-foreground mb-1">Reset Password</h2>
              <p className="text-sm text-muted-foreground">We&apos;ll send you a link to reset your password</p>
            </>
          )}
        </div>

        {!success && (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="px-4 py-2.5 rounded-[10px] border border-border bg-background/60 text-foreground text-sm outline-none focus:border-border-hover transition-colors placeholder:text-text-dim" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-[10px] bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] mt-1 disabled:opacity-50">
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </button>
            <p className="text-center text-sm text-text-dim">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-primary-soft font-medium no-underline hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Restyle UpdatePasswordForm**

```tsx
// src/components/update-password-form.tsx
'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push('/protected')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6 w-full max-w-sm', className)} {...props}>
      <div className="p-8 sm:p-10 bg-surface/60 border border-border rounded-[20px] backdrop-blur-xl">
        <div className="text-center mb-7">
          <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-primary to-secondary rounded-[10px] flex items-center justify-center text-lg shadow-[0_0_12px_rgba(124,58,237,0.4)]">
            ✦
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-1">New Password</h2>
          <p className="text-sm text-muted-foreground">Enter your new password below</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">New Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="px-4 py-2.5 rounded-[10px] border border-border bg-background/60 text-foreground text-sm outline-none focus:border-border-hover transition-colors placeholder:text-text-dim" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-[10px] bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] mt-1 disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds. All auth pages show glass card with star field background, cosmic form inputs.

- [ ] **Step 9: Commit**

```bash
git add src/app/auth/layout.tsx src/components/login-form.tsx src/components/sign-up-form.tsx src/components/password-login-form.tsx src/components/social-login-form.tsx src/components/forgot-password-form.tsx src/components/update-password-form.tsx
git commit -m "feat: glass card auth pages with cosmic star field background"
```

---

### Task 11: Remove StepIndicator & Clean Up References

**Files:**
- Delete: `src/components/step-indicator.tsx`
- Modify: `src/app/intake/interests/page.tsx` (if it imports StepIndicator)

- [ ] **Step 1: Check all files that import StepIndicator**

Run: `grep -r "StepIndicator" src/ --include="*.tsx" -l`

Remove the import and usage from every file found. The cosmic pages no longer use a shared step indicator — each page has its own contextual progress/header.

- [ ] **Step 2: Delete step-indicator.tsx**

```bash
rm src/components/step-indicator.tsx
```

- [ ] **Step 3: Update interests page.tsx if it imports StepIndicator**

Read `src/app/intake/interests/page.tsx` and remove the StepIndicator import and usage if present.

- [ ] **Step 4: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds with no references to StepIndicator.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove StepIndicator — replaced by per-page cosmic headers"
```

---

### Task 12: Final Build Verification & Visual Smoke Test

- [ ] **Step 1: Full build check**

Run: `pnpm build`
Expected: Build succeeds with zero errors.

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: No new lint errors introduced. Fix any that appear.

- [ ] **Step 3: Visual smoke test checklist**

Start the dev server: `pnpm dev`

Verify each page visually:
1. **Home** (`/`): Star field visible, Instrument Serif headline, gradient CTA, How It Works cards
2. **Interests** (`/intake/interests`): Pill chips, glow on select, custom input works
3. **Would You Rather** (`/intake/would-you-rather`): Portal cards with photo overlay, "or" badge, progress bar
4. **Summary** (`/intake/summary`): RIASEC bars with colors, value tags with amber highlights
5. **Careers** (`/careers`): Card grid (or generate CTA if no data)
6. **Login** (`/auth/login`): Glass card on star field
7. **Sign Up** (`/auth/sign-up`): Glass card with 3 form fields
8. **Nav**: Floating glass bar, logo, links, theme toggle

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: post-redesign lint and build fixes"
```
