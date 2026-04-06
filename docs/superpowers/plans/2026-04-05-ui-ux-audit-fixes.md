# UI/UX Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the top 10 highest-impact issues identified by the 5-agent UI/UX audit, covering accessibility, performance, color contrast, design system coherence, and style consistency.

**Architecture:** Each task is independent and can be parallelized via subagents. Tasks are ordered by impact but have no sequential dependencies except Task 2 (AuthProvider) which should land before Task 7 (Zustand selectors) for maximum effect.

**Tech Stack:** Next.js 15, Tailwind CSS v4, Framer Motion, Zustand, Supabase Auth, DaisyUI

---

### Task 1: Fix Color Contrast Tokens

**Files:**
- Modify: `src/app/globals.css`

This task fixes WCAG AA contrast failures for `--text-dim` and `--muted-foreground` in both dark and light themes.

- [ ] **Step 1: Fix dark theme `--text-dim`**

In `src/app/globals.css`, in the `:root` block (~line 91), change:

```css
--text-dim: #6b63a0;
```

to:

```css
--text-dim: #8b85b8;
```

This raises contrast from ~2.8:1 to ~4.6:1 on `#0a0a1a`.

- [ ] **Step 2: Fix dark theme `--muted-foreground`**

In the same `:root` block (~line 73), change:

```css
--muted-foreground: #8b85a8;
```

to:

```css
--muted-foreground: #9f99be;
```

This raises contrast from ~3.9:1 to ~5.0:1 on `#0a0a1a`.

- [ ] **Step 3: Fix light theme `--text-dim`**

In the `.light, [data-theme="light"]` block (~line 130), change:

```css
--text-dim: #9ca3af;
```

to:

```css
--text-dim: #64748b;
```

This raises contrast from ~2.5:1 to ~4.6:1 on `#faf9f6`.

- [ ] **Step 4: Verify the app builds**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: improve color contrast tokens to meet WCAG AA (4.5:1)"
```

---

### Task 2: Create AuthProvider Context

**Files:**
- Create: `src/providers/auth-provider.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/navigation-bar.tsx`
- Modify: `src/components/current-user-avatar.tsx`
- Delete: `src/hooks/use-current-user-image.ts`
- Delete: `src/hooks/use-current-user-name.ts`
- Delete: `src/hooks/use-is-anonymous.ts`

This task consolidates 4-5 duplicate Supabase auth fetches into a single provider. The `createClient()` call currently happens in the component body of NavigationBar and multiple hooks, creating new instances every render.

- [ ] **Step 1: Create AuthProvider**

Create `src/providers/auth-provider.tsx`:

```tsx
'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User, Session } from '@supabase/supabase-js'

interface AuthContext {
  user: User | null
  session: Session | null
  loading: boolean
  isLoggedIn: boolean
  isAnonymous: boolean
}

const AuthContext = createContext<AuthContext>({
  user: null,
  session: null,
  loading: true,
  isLoggedIn: false,
  isAnonymous: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  )

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    isLoggedIn: !!session?.user,
    isAnonymous: session?.user?.is_anonymous ?? true,
  }), [session, loading])

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 2: Wire AuthProvider into root layout**

In `src/app/layout.tsx`, add the import and wrap children:

```tsx
import { AuthProvider } from '@/providers/auth-provider'
```

Wrap the content inside `<ThemeProvider>`:

```tsx
<ThemeProvider
  attribute="data-theme"
  defaultTheme="dark"
  enableSystem
  themes={['light', 'dark']}
>
  <AuthProvider>
    <NavigationBar />
    <main className="mt-20">{children}</main>
    <Toaster />
  </AuthProvider>
</ThemeProvider>
```

- [ ] **Step 3: Refactor NavigationBar to use `useAuth()`**

In `src/components/navigation-bar.tsx`, remove the `createClient` import, remove all Supabase-related state/effects, and use `useAuth()` instead:

Replace lines 1-47 (imports + state + effects) with:

```tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
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
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }
```

The JSX remains the same — it already references `user` and `loading`.

- [ ] **Step 4: Refactor CurrentUserAvatar to use `useAuth()`**

Replace `src/components/current-user-avatar.tsx` entirely:

```tsx
'use client'

import { useAuth } from '@/providers/auth-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
  const { user } = useAuth()
  const profileImage = user?.user_metadata?.avatar_url ?? null
  const name = user?.user_metadata?.full_name ?? '?'
  const initials = name
    ?.split(' ')
    ?.map((word: string) => word[0])
    ?.join('')
    ?.toUpperCase()

  return (
    <Avatar>
      {profileImage && <AvatarImage src={profileImage} alt={initials} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
```

- [ ] **Step 5: Delete old auth hooks**

Delete these files (they are fully replaced by `useAuth()`):
- `src/hooks/use-current-user-image.ts`
- `src/hooks/use-current-user-name.ts`
- `src/hooks/use-is-anonymous.ts`

- [ ] **Step 6: Update all `useIsLoggedIn()` / `useIsAnonymous()` call sites**

Search the codebase for imports of `use-is-logged-in` and `use-is-anonymous`. Replace with `useAuth()`:

In `src/app/intake/would-you-rather/page.tsx`, replace:
```tsx
import { useIsLoggedIn } from '@/hooks/use-is-logged-in'
// ...
const isLoggedIn = useIsLoggedIn()
```
with:
```tsx
import { useAuth } from '@/providers/auth-provider'
// ...
const { isLoggedIn } = useAuth()
```

In `src/app/careers/_components/CareersClient.tsx`, same replacement.

Search for any other imports of these hooks and replace similarly.

- [ ] **Step 7: Verify the app builds and auth works**

Run: `pnpm build`
Expected: Build succeeds. No references to deleted hooks remain.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: create AuthProvider to consolidate duplicate Supabase auth fetches"
```

---

### Task 3: Add `prefers-reduced-motion` Support

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/star-field.tsx`

- [ ] **Step 1: Add reduced-motion CSS rule**

At the end of `src/app/globals.css`, after the `@keyframes twinkle` block, add:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Hide star field for reduced-motion users**

In `src/components/star-field.tsx`, add a class to the container that hides it for reduced-motion:

Replace line 40:
```tsx
<div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
```
with:
```tsx
<div className={`absolute inset-0 pointer-events-none overflow-hidden motion-reduce:hidden ${className}`}>
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/components/star-field.tsx
git commit -m "fix: add prefers-reduced-motion support for all animations"
```

---

### Task 4: Add Focus-Visible Rings to All Interactive Elements

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/navigation-bar.tsx`
- Modify: `src/components/theme-toggle.tsx`
- Modify: `src/app/intake/interests/_components/InterestsClient.tsx`
- Modify: `src/app/intake/would-you-rather/_components/OptionCard.tsx`
- Modify: `src/app/intake/would-you-rather/page.tsx`
- Modify: `src/app/careers/_components/CareersClient.tsx`
- Modify: `src/components/password-login-form.tsx`
- Modify: `src/components/sign-up-form.tsx`
- Modify: `src/components/social-login-form.tsx`
- Modify: `src/components/forgot-password-form.tsx`
- Modify: `src/components/update-password-form.tsx`

The approach: Add a global base style for interactive elements that provides focus-visible rings, plus fix specific components that use `outline-none` without replacement.

- [ ] **Step 1: Add global focus-visible base styles**

In `src/app/globals.css`, inside the `@layer base` block, add after the existing rules:

```css
  a:focus-visible,
  button:focus-visible,
  [role="button"]:focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background rounded-sm;
  }
```

- [ ] **Step 2: Fix form inputs — replace `outline-none` with `outline-none focus-visible:ring-2 focus-visible:ring-ring`**

In every auth form input element, replace the pattern:
```
outline-none focus:border-border-hover
```
with:
```
outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover
```

Files to update (all `<input>` className strings):
- `src/components/password-login-form.tsx` — lines 40, 47
- `src/components/sign-up-form.tsx` — lines 60, 64, 68
- `src/components/forgot-password-form.tsx` — line 62
- `src/components/update-password-form.tsx` — line 46
- `src/app/intake/interests/_components/InterestsClient.tsx` — line 107

- [ ] **Step 3: Add focus-visible to OptionCard**

In `src/app/intake/would-you-rather/_components/OptionCard.tsx`, add focus-visible styles to the `motion.button` className. Replace the existing className string (line 17-21) — add to the non-selected branch:

```
'border-border bg-surface/50 hover:border-border-hover hover:shadow-[0_0_40px_rgba(124,58,237,0.15)] focus-visible:border-primary/70 focus-visible:shadow-[0_0_40px_rgba(124,58,237,0.2)]'
```

- [ ] **Step 4: Enlarge touch targets — theme toggle and hamburger**

In `src/components/theme-toggle.tsx`, change `w-7 h-7` to `w-9 h-9` on both the placeholder (line 16) and the real button (line 22). Change icon `size={14}` to `size={16}` on lines 26-27.

In `src/components/navigation-bar.tsx`, change the hamburger button padding from `p-1.5` to `p-2.5` on line 111. Add `aria-label="Toggle navigation menu"` and `aria-expanded={mobileOpen}`.

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: add focus-visible rings and enlarge touch targets for accessibility"
```

---

### Task 5: Fix Form Label Associations and ARIA

**Files:**
- Modify: `src/components/password-login-form.tsx`
- Modify: `src/components/sign-up-form.tsx`
- Modify: `src/components/forgot-password-form.tsx`
- Modify: `src/components/update-password-form.tsx`
- Modify: `src/app/intake/interests/_components/InterestsClient.tsx`
- Modify: `src/app/careers/_components/CareersClient.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add `htmlFor`/`id` pairs to password-login-form**

In `src/components/password-login-form.tsx`:
- Line 39: `<label className="..." >Email</label>` → `<label htmlFor="login-email" className="...">Email</label>`
- Line 40: `<input type="email" ...>` → add `id="login-email"`
- Line 44: `<label className="...">Password</label>` → `<label htmlFor="login-password" className="...">Password</label>`
- Line 47: `<input type="password" ...>` → add `id="login-password"`
- Line 49: `{error && <p ...>}` → `{error && <p role="alert" ...>}`

- [ ] **Step 2: Add `htmlFor`/`id` pairs to sign-up-form**

Same pattern — add `id="signup-email"`, `id="signup-password"`, `id="signup-repeat-password"` to inputs. Add matching `htmlFor` to labels. Add `role="alert"` to error `<p>`.

- [ ] **Step 3: Add `htmlFor`/`id` to forgot-password-form and update-password-form**

Same pattern. Use `id="forgot-email"` and `id="update-password"`.

- [ ] **Step 4: Add `aria-label` to custom interest input**

In `src/app/intake/interests/_components/InterestsClient.tsx`, line 104, add `aria-label="Add a custom interest"` to the `<input>`.

- [ ] **Step 5: Add `role="alert"` to careers error state**

In `src/app/careers/_components/CareersClient.tsx`, line 108, add `role="alert"` to the error container `<div>`.

- [ ] **Step 6: Add skip-to-content link**

In `src/app/layout.tsx`, add as the first child inside `<body>`, before `<ThemeProvider>`:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
>
  Skip to content
</a>
```

And change `<main className="mt-20">` to `<main id="main-content" className="mt-20">`.

- [ ] **Step 7: Hide decorative glyphs from screen readers**

In `src/components/navigation-bar.tsx` line 64, `src/components/login-form.tsx` line 14, and `src/app/page.tsx` line 35, wrap the `✦` character:
```tsx
<span aria-hidden="true">✦</span>
```

- [ ] **Step 8: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "fix: add form label associations, ARIA landmarks, and skip-to-content link"
```

---

### Task 6: Migrate Career Detail Pages from DaisyUI to Celestial Tokens

**Files:**
- Modify: `src/components/career-details.tsx`
- Modify: `src/components/career-chat.tsx`
- Modify: `src/app/careers/[onetId]/page.tsx`

- [ ] **Step 1: Rewrite career-details.tsx with celestial tokens**

Replace the entire component JSX with celestial design system classes:

```tsx
import { ExternalLink, TrendingUp, DollarSign, Target } from 'lucide-react'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

interface CareerDetailsProps {
  career: Career
}

export function CareerDetails({ career }: CareerDetailsProps) {
  return (
    <div className="p-6 bg-surface/50 border border-border rounded-2xl">
      <h2 className="font-serif text-xl text-foreground mb-5">{career.title}</h2>

      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5">Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{career.description}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-soft" />
            Why It Matches You
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{career.whyItMatches}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Job Growth
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{career.jobGrowth}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" />
            Salary Range
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{career.salaryRange}</p>
        </div>

        <div className="pt-4 border-t border-border">
          <a
            href={`https://www.onetonline.org/link/summary/${career.onetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-border text-sm text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all no-underline w-full justify-center"
          >
            <ExternalLink className="w-4 h-4" />
            View on O*NET
          </a>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite career-chat.tsx with celestial tokens**

Replace DaisyUI classes (`card bg-base-100`, `card-body`, `border-base-300`, `text-base-content/70`, `alert alert-error`, `btn btn-sm btn-ghost`) with celestial equivalents:

```tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { Chat } from '@/components/ui/chat'
import { CareerRecommendation } from '@/lib/schemas/career'

interface CareerChatProps {
  career: CareerRecommendation
}

export function CareerChat({ career }: CareerChatProps) {
  const { messages, input, handleInputChange, handleSubmit, status, error, reload } = useChat({
    api: '/api/careers/chat',
    initialMessages: [
      {
        id: 'system',
        role: 'assistant',
        content: `Hi! I'm here to help you learn about **${career.title}**. I can answer questions about the day-to-day responsibilities, required skills, career path, education requirements, and anything else you'd like to know about this career. What would you like to know?`,
      },
    ],
    body: {
      careerContext: {
        title: career.title,
        description: career.description,
        onetId: career.onetId,
        whyItMatches: career.whyItMatches,
        jobGrowth: career.jobGrowth,
        salaryRange: career.salaryRange,
      },
    },
  })

  return (
    <div className="bg-surface/50 border border-border rounded-2xl h-[600px] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          Chat about {career.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask me anything about this career!
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 border-b border-border" role="alert">
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <p className="text-sm font-semibold text-destructive mb-1">Chat Error</p>
            <p className="text-xs text-muted-foreground mb-2">Failed to send message. Please try again.</p>
            <button
              onClick={() => reload()}
              disabled={status === 'streaming'}
              className="text-xs text-primary-soft hover:underline disabled:opacity-50"
            >
              Retry Last Message
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Chat
          messages={messages}
          handleSubmit={handleSubmit}
          input={input}
          handleInputChange={handleInputChange}
          isGenerating={status === 'streaming'}
          className="flex-1 p-4"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Fix career detail page DaisyUI classes**

In `src/app/careers/[onetId]/page.tsx`, replace:
- Line 71: `text-base-content/70` → `text-muted-foreground`
- Line 74: `btn btn-primary` → `px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold text-sm no-underline`
- Line 77: `btn btn-outline` → `px-6 py-2.5 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm`

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/career-details.tsx src/components/career-chat.tsx src/app/careers/\[onetId\]/page.tsx
git commit -m "refactor: migrate career detail pages from DaisyUI to celestial design tokens"
```

---

### Task 7: Add Zustand Selectors and Debounce Saves

**Files:**
- Modify: `src/app/intake/would-you-rather/page.tsx`
- Modify: `src/app/intake/interests/_components/InterestsClient.tsx`
- Modify: `src/app/careers/_components/CareersClient.tsx`
- Modify: `src/app/intake/summary/page.tsx`
- Modify: `src/store/appStore.ts`

- [ ] **Step 1: Add `useShallow` selectors to WYR page**

In `src/app/intake/would-you-rather/page.tsx`, replace line 1-9 imports and add `useShallow`:

```tsx
import { useShallow } from 'zustand/react/shallow'
```

Replace line 17:
```tsx
const { currentQuestionIndex, setAnswer, skipQuestion, nextQuestion, previousQuestion, resetGame, hydrateFromDB, answers, skippedQuestions } = useAppStore()
```
with:
```tsx
const { currentQuestionIndex, setAnswer, skipQuestion, nextQuestion, previousQuestion, resetGame, hydrateFromDB, answers, skippedQuestions } = useAppStore(
  useShallow(s => ({
    currentQuestionIndex: s.currentQuestionIndex,
    setAnswer: s.setAnswer,
    skipQuestion: s.skipQuestion,
    nextQuestion: s.nextQuestion,
    previousQuestion: s.previousQuestion,
    resetGame: s.resetGame,
    hydrateFromDB: s.hydrateFromDB,
    answers: s.answers,
    skippedQuestions: s.skippedQuestions,
  })),
)
```

- [ ] **Step 2: Debounce `saveProgressToDB`**

In the same file, replace the save effect (lines 60-64):

```tsx
useEffect(() => {
  if (isLoggedIn && isHydrated && (Object.keys(answers).length > 0 || skippedQuestions.size > 0)) {
    saveProgressToDB()
  }
}, [answers, skippedQuestions, isLoggedIn, isHydrated, saveProgressToDB])
```

with a debounced version:

```tsx
useEffect(() => {
  if (!isLoggedIn || !isHydrated) return
  if (Object.keys(answers).length === 0 && skippedQuestions.size === 0) return

  const timeout = setTimeout(() => {
    saveProgressToDB()
  }, 2000)

  return () => clearTimeout(timeout)
}, [answers, skippedQuestions, isLoggedIn, isHydrated, saveProgressToDB])
```

- [ ] **Step 3: Add `useShallow` to InterestsClient**

In `src/app/intake/interests/_components/InterestsClient.tsx`, add import and replace line 25:

```tsx
import { useShallow } from 'zustand/react/shallow'

const { interests, addInterest, removeInterest, setInterests } = useAppStore(
  useShallow(s => ({
    interests: s.interests,
    addInterest: s.addInterest,
    removeInterest: s.removeInterest,
    setInterests: s.setInterests,
  })),
)
```

- [ ] **Step 4: Add `useShallow` to CareersClient**

In `src/app/careers/_components/CareersClient.tsx`, add import and replace line 29:

```tsx
import { useShallow } from 'zustand/react/shallow'

const { getDeckResults, interests, answers } = useAppStore(
  useShallow(s => ({
    getDeckResults: s.getDeckResults,
    interests: s.interests,
    answers: s.answers,
  })),
)
```

- [ ] **Step 5: Add `useShallow` to summary page**

In `src/app/intake/summary/page.tsx`, add import and replace line 20:

```tsx
import { useShallow } from 'zustand/react/shallow'

const { getDeckResults, answers } = useAppStore(
  useShallow(s => ({
    getDeckResults: s.getDeckResults,
    answers: s.answers,
  })),
)
```

- [ ] **Step 6: Conditionally apply devtools in store**

In `src/store/appStore.ts`, replace line 9-10:

```tsx
export const useAppStore = create<AppState>()(
  devtools(
```

with:

```tsx
const withDevtools = process.env.NODE_ENV === 'development' ? devtools : <T>(fn: T) => fn

export const useAppStore = create<AppState>()(
  withDevtools(
```

- [ ] **Step 7: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "perf: add Zustand selectors with useShallow and debounce progress saves"
```

---

### Task 8: Extract Hardcoded Colors into Theme-Aware Tokens

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/cosmic-background.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/intake/interests/_components/InterestsClient.tsx`
- Modify: `src/app/intake/would-you-rather/page.tsx`
- Modify: `src/app/careers/_components/CareersClient.tsx`
- Modify: `src/app/intake/summary/page.tsx`
- Modify: `src/app/auth/layout.tsx`

- [ ] **Step 1: Add nebula and glow tokens to globals.css**

In `src/app/globals.css`, add to the `:root` block (dark theme), after the existing celestial tokens:

```css
  /* Nebula background gradients */
  --nebula-primary: rgba(88, 28, 135, 0.2);
  --nebula-secondary: rgba(30, 58, 138, 0.15);
  --nebula-hero-primary: rgba(88, 28, 135, 0.35);
  --nebula-hero-secondary: rgba(30, 58, 138, 0.25);
  --nebula-hero-tertiary: rgba(124, 58, 237, 0.15);
```

In the light theme block, add:

```css
  --nebula-primary: rgba(109, 40, 217, 0.06);
  --nebula-secondary: rgba(30, 58, 138, 0.04);
  --nebula-hero-primary: rgba(109, 40, 217, 0.08);
  --nebula-hero-secondary: rgba(30, 58, 138, 0.06);
  --nebula-hero-tertiary: rgba(139, 92, 246, 0.04);
```

Add to the `@theme inline` block:

```css
  --color-nebula-primary: var(--nebula-primary);
  --color-nebula-secondary: var(--nebula-secondary);
```

- [ ] **Step 2: Create shared CosmicBackground component**

Create `src/components/cosmic-background.tsx`:

```tsx
import { StarField } from '@/components/star-field'

interface CosmicBackgroundProps {
  starCount?: number
  variant?: 'hero' | 'page'
}

export function CosmicBackground({ starCount = 40, variant = 'page' }: CosmicBackgroundProps) {
  const gradients = variant === 'hero'
    ? `
      radial-gradient(ellipse 600px 400px at 25% 20%, var(--nebula-hero-primary) 0%, transparent 70%),
      radial-gradient(ellipse 500px 350px at 75% 70%, var(--nebula-hero-secondary) 0%, transparent 70%),
      radial-gradient(ellipse 300px 300px at 60% 30%, var(--nebula-hero-tertiary) 0%, transparent 70%)
    `
    : `
      radial-gradient(ellipse 500px 350px at 20% 30%, var(--nebula-primary) 0%, transparent 70%),
      radial-gradient(ellipse 400px 300px at 80% 70%, var(--nebula-secondary) 0%, transparent 70%)
    `

  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      <div className="absolute inset-0" style={{ background: gradients }} />
      <StarField count={starCount} />
    </div>
  )
}
```

- [ ] **Step 3: Replace inline backgrounds in interior pages**

In each of these files, replace the entire `{/* Background */}` block (the `<div className="fixed inset-0 ...">` with inline `style={{ background: ... }}` and `<StarField>`) with:

```tsx
import { CosmicBackground } from '@/components/cosmic-background'
// ...
<CosmicBackground />
```

Files:
- `src/app/intake/interests/_components/InterestsClient.tsx` — remove lines 62-74, add `<CosmicBackground />` before the page header
- `src/app/intake/would-you-rather/page.tsx` — remove lines 128-139 (main view) and lines 97-105 (completion screen), add `<CosmicBackground />` once at the top
- `src/app/careers/_components/CareersClient.tsx` — remove lines 88-98, add `<CosmicBackground />`
- `src/app/intake/summary/page.tsx` — remove lines 36-47, add `<CosmicBackground />`
- `src/app/auth/layout.tsx` — remove lines 7-18, add `<CosmicBackground />`

- [ ] **Step 4: Replace hero background in home page**

In `src/app/page.tsx`, replace the inline nebula gradient block (lines 13-25) and `<StarField count={55} />` with:

```tsx
import { CosmicBackground } from '@/components/cosmic-background'
// inside the hero section:
<CosmicBackground variant="hero" starCount={55} />
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: extract hardcoded nebula gradients into theme-aware tokens and CosmicBackground component"
```

---

### Task 9: Normalize Border Radius, Shadow Scale, and Button Sizes

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/navigation-bar.tsx`
- Modify: `src/components/login-form.tsx`
- Modify: `src/components/sign-up-form.tsx`
- Modify: `src/components/forgot-password-form.tsx`
- Modify: `src/components/update-password-form.tsx`
- Modify: `src/components/password-login-form.tsx`
- Modify: `src/components/social-login-form.tsx`

- [ ] **Step 1: Add shadow tokens to globals.css**

In `src/app/globals.css`, add to the `:root` block:

```css
  /* Shadow scale */
  --shadow-glow-sm: 0 2px 12px rgba(124, 58, 237, 0.2);
  --shadow-glow-md: 0 4px 20px rgba(124, 58, 237, 0.35);
  --shadow-glow-lg: 0 0 40px rgba(124, 58, 237, 0.15);
  --shadow-card: 0 4px 30px rgba(0, 0, 0, 0.4), 0 0 40px rgba(124, 58, 237, 0.06);
```

In the light theme block:

```css
  --shadow-glow-sm: 0 2px 12px rgba(109, 40, 217, 0.15);
  --shadow-glow-md: 0 4px 20px rgba(109, 40, 217, 0.25);
  --shadow-glow-lg: 0 0 40px rgba(109, 40, 217, 0.1);
  --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.08), 0 0 30px rgba(109, 40, 217, 0.04);
```

- [ ] **Step 2: Normalize border-radius — replace arbitrary values**

Across the auth form components, replace `rounded-[20px]` with `rounded-2xl` and `rounded-[10px]` with `rounded-xl`:

Files: `login-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`
- `rounded-[20px]` → `rounded-2xl` (card containers)
- `rounded-[10px]` → `rounded-xl` (inputs, logo icon, buttons)

In `navigation-bar.tsx`:
- `rounded-[14px]` → `rounded-2xl` (nav container, line 57)

- [ ] **Step 3: Replace hardcoded shadow strings with token references**

In auth form components and nav, replace repeated `shadow-[0_2px_12px_rgba(124,58,237,0.2)]` with `shadow-[var(--shadow-glow-sm)]` and `shadow-[0_4px_20px_rgba(124,58,237,0.35)]` with `shadow-[var(--shadow-glow-md)]`.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: normalize border-radius, shadow tokens, and button sizing"
```

---

### Task 10: Make Home Page a Server Component

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/_components/AnimatedHero.tsx`
- Create: `src/app/_components/HowItWorksCard.tsx`

- [ ] **Step 1: Extract animated hero into client component**

Create `src/app/_components/AnimatedHero.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function AnimatedHero() {
  return (
    <div className="relative z-10 max-w-2xl">
      <motion.div
        className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span aria-hidden="true">✦</span> Career Exploration Tool
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
          className="inline-flex items-center gap-2 px-9 py-3.5 bg-gradient-to-br from-primary to-secondary text-white font-semibold rounded-full shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow-md)] hover:-translate-y-0.5 transition-all no-underline"
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
  )
}
```

- [ ] **Step 2: Extract How It Works cards into client component**

Create `src/app/_components/HowItWorksCard.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'

interface HowItWorksCardProps {
  num: string
  icon: string
  title: string
  desc: string
  index: number
}

export function HowItWorksCard({ num, icon, title, desc, index }: HowItWorksCardProps) {
  return (
    <motion.div
      className="text-center p-8 bg-surface/50 border border-border rounded-2xl hover:border-border-hover hover:bg-surface/80 hover:shadow-[var(--shadow-glow-lg)] transition-all"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 shadow-[0_0_20px_rgba(124,58,237,0.2)] inline-flex items-center justify-center font-serif text-lg text-primary-soft mb-4">
        {num}
      </div>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  )
}
```

- [ ] **Step 3: Rewrite home page as server component**

Replace `src/app/page.tsx` entirely (remove `'use client'`):

```tsx
import { CosmicBackground } from '@/components/cosmic-background'
import { AnimatedHero } from './_components/AnimatedHero'
import { HowItWorksCard } from './_components/HowItWorksCard'

const steps = [
  { num: '1', icon: '🎯', title: 'Pick Your Interests', desc: 'Select topics that excite you or add your own — this sets the foundation for your profile.' },
  { num: '2', icon: '⚖️', title: 'Answer Quick Questions', desc: 'Choose between scenarios in a "would you rather" format that reveals your work personality.' },
  { num: '3', icon: '🌟', title: 'See Your Matches', desc: 'Get personalized career recommendations powered by AI, ranked by how well they fit you.' },
]

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <CosmicBackground variant="hero" starCount={55} />
        <AnimatedHero />
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative max-w-4xl mx-auto px-6 pb-20">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-16" />

        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl text-foreground mb-2">How It Works</h2>
          <p className="text-sm text-text-dim">Three steps to find careers that fit</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <HowItWorksCard key={step.num} {...step} index={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds. Home page is now a server component — Framer Motion is only loaded via the thin client component wrappers.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "perf: make home page a server component, extract animated wrappers"
```
