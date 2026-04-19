# Migrate from Supabase to Neon + Neon Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase (DB + Auth) with Neon (DB) + Neon Auth (`@neondatabase/auth`, powered by Better Auth) to reduce hosting costs while preserving existing user flows: email/password sign-up + login, password reset, Google OAuth, anonymous sessions, and logout. Custom auth UI is preserved — only the form bodies swap to call `authClient.*` methods.

**Architecture:** Three concurrent migrations on one branch. (1) DB host: repoint `DATABASE_URL` at the new Neon project; switch the Drizzle driver to `@neondatabase/serverless`. (2) Auth: install `@neondatabase/auth`; create a server `auth` instance with `createNeonAuth`; mount its catch-all handler at `/api/auth/[...path]`; wrap `proxy.ts` middleware with `auth.middleware()`; replace every `supabase.auth.*` call site with `authClient.*` (client) or `auth.getSession()` (server). (3) Schema: drop the `users.id` default of `auth.uid()`, drop all RLS policies, drop the local `users` table. User identity lives in Neon's managed `neon_auth.users_sync` (synced view). Existing `quiz_answers` and `career_recommendations` rows are tied to Supabase user IDs and will be truncated as part of the cutover (clean restart — no user migration).

**Tech Stack:** Neon (serverless Postgres + Neon Auth, `@neondatabase/serverless` driver), `@neondatabase/auth` (Neon Auth Next.js SDK; built on Better Auth), Drizzle ORM (existing), Next.js 16 App Router (existing), Vitest + Playwright (existing).

---

## File Structure

**New files:**
- `src/lib/auth/server.ts` — `auth` server instance via `createNeonAuth({ baseUrl, cookies: { secret } })`
- `src/lib/auth/client.ts` — `authClient` from `createAuthClient()` (Neon Auth's React client)
- `src/lib/auth/get-session.ts` — `getSession()` server helper wrapping `auth.getSession()`
- `src/app/api/auth/[...path]/route.ts` — mounts `auth.handler()` for all sign-in/sign-up/OAuth callback/password-reset endpoints
- `tests/lib/auth/get-session.test.ts` — unit test for the server-side session helper

**Modified files:**
- `src/db/schema.ts` — drop the `users` table; remove all `pgPolicy` entries; change `quizAnswers.userId`/`careerRecommendations.userId` to plain text columns (no FK to `neon_auth.users_sync`); drop the `auth.uid()` default
- `src/db/index.ts` — swap `postgres-js` for `@neondatabase/serverless`'s HTTP driver
- `drizzle.config.ts` — change `out` from `./supabase/migrations` to `./drizzle/migrations`
- `src/proxy.ts` — replace Supabase session refresher with `auth.middleware()` (Neon Auth provides middleware)
- `src/app/api/user/route.ts`, `src/app/api/user/progress/route.ts`, `src/app/api/careers/[onetId]/route.ts`, `src/app/careers/actions.ts`, `src/app/careers/page.tsx`, `src/app/discover/interests/page.tsx`, `src/app/discover/interests/actions.ts` — replace `createClient().auth.getUser()` with the new `getSession()` helper; queries already scope by `user.id` so no `where`-clause changes; remove dependent `users`-table inserts/updates (no `users` table anymore)
- `src/components/sign-up-form.tsx`, `src/components/password-login-form.tsx`, `src/components/forgot-password-form.tsx`, `src/components/update-password-form.tsx`, `src/components/social-login-form.tsx`, `src/components/logout-button.tsx` — swap `createClient()` calls for `authClient.*` calls; visual design preserved
- `src/providers/auth-provider.tsx`, `src/components/anonymous-auth-provider.tsx` — use `authClient.useSession()` hook
- `package.json` — add `@neondatabase/auth`, `@neondatabase/serverless`; remove `@supabase/ssr`, `@supabase/supabase-js`, `postgres`
- `.env.local` / `.env.example` — add `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`; replace `DATABASE_URL` with Neon URL; remove `NEXT_PUBLIC_SUPABASE_*`

**Deleted files:**
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- `src/app/auth/oauth/route.ts`, `src/app/auth/confirm/route.ts` (Neon Auth's catch-all handler covers both)
- `supabase/` directory (move to `archive/supabase-migrations/`)

---

## Pre-Task Setup (manual, one-time — already complete per user)

1. ✅ Neon project provisioned with Neon Auth enabled
2. ✅ Google OAuth enabled in the Neon Auth dashboard (Neon Auth ships with shared dev OAuth credentials, so Google works without further config in development)
3. Required env vars must be present in `.env.local` before Task 1 starts. If any are missing, the implementer must halt and surface the gap rather than proceed with placeholders:
   - `DATABASE_URL` — Neon pooled connection string
   - `NEON_AUTH_BASE_URL` — e.g. `https://ep-<id>.neonauth.c-5.<region>.aws.neon.tech/<dbname>/auth`
   - `NEON_AUTH_COOKIE_SECRET` — a 32+ character random string from `openssl rand -base64 32`

---

## Task 1: Swap the database driver and connection string to Neon

**Files:**
- Modify: `src/db/index.ts`
- Modify: `drizzle.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Verify required env vars are present**

```bash
grep -E '^(DATABASE_URL|NEON_AUTH_BASE_URL|NEON_AUTH_COOKIE_SECRET)=' .env.local
```

Expected: three lines printed. If any are missing, halt and report which one.

- [ ] **Step 2: Install the Neon driver and remove postgres-js**

```bash
pnpm add @neondatabase/serverless
pnpm remove postgres
```

- [ ] **Step 3: Update `src/db/index.ts` to use the Neon HTTP driver**

```typescript
import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

config({ path: '.env.local' })

export const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle({ client: sql })
```

- [ ] **Step 4: Update `drizzle.config.ts` to write migrations to `./drizzle/migrations`**

Open `drizzle.config.ts` and change line 8 from `out: './supabase/migrations'` to `out: './drizzle/migrations'`.

- [ ] **Step 5: Verify a trivial query against Neon succeeds**

```bash
pnpm tsx -e 'import { db } from "./src/db"; import { sql as raw } from "drizzle-orm"; db.execute(raw`SELECT 1 as one`).then(r => console.log(r))'
```

Expected: prints a result row containing `one: 1`.

- [ ] **Step 6: Commit**

```bash
git add src/db/index.ts drizzle.config.ts package.json pnpm-lock.yaml
git commit -m "chore(db): point Drizzle at Neon via @neondatabase/serverless"
```

---

## Task 2: Replace the schema — drop RLS, drop `users`, drop FKs to `users`

The new Neon DB is empty. We're not migrating data, so we just push a clean schema.

**Files:**
- Modify: `src/db/schema.ts`
- Generate: `drizzle/migrations/0000_*.sql` (Drizzle generates this from the new schema)

- [ ] **Step 1: Replace `src/db/schema.ts` with the simplified version**

```typescript
import { pgTable, serial, smallint, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const quizAnswers = pgTable('quiz_answers', {
  id: serial().primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  selectedOption: smallint('selected_option'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  unique('quiz_answers_user_question_unique').on(table.userId, table.questionId),
])

export const careerRecommendations = pgTable('career_recommendations', {
  id: serial().primaryKey(),
  userId: text('user_id').notNull(),
  onetId: text('onet_id').notNull(),
  title: text().notNull(),
  description: text().notNull(),
  whyItMatches: text('why_it_matches').notNull(),
  jobGrowth: text('job_growth').notNull(),
  salaryRange: text('salary_range').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

No `users` table. No `pgPolicy` entries. No FK to `neon_auth.users_sync` (Neon docs recommend against hard FKs to the synced view — validate ownership in app code).

- [ ] **Step 2: Generate and apply the initial migration to the empty Neon DB**

```bash
pnpm dk:generate
pnpm dk:push
```

Expected: a new migration file at `drizzle/migrations/0000_*.sql` that creates two tables. Confirm with:

```bash
psql "$DATABASE_URL" -c "\dt"
```
Expected output lists `quiz_answers` and `career_recommendations`.

- [ ] **Step 3: Write a smoke test confirming inserts work without `auth.uid()`**

Create `tests/db/quiz-answers-insert.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { db } from '@/db'
import { quizAnswers } from '@/db/schema'
import { eq } from 'drizzle-orm'

describe('quiz_answers insert without auth.uid()', () => {
  it('inserts a row with a plain text user_id', async () => {
    const userId = `test-${crypto.randomUUID()}`
    await db.insert(quizAnswers).values({ userId, questionId: 'q-test', selectedOption: 1 })
    const [row] = await db.select().from(quizAnswers).where(eq(quizAnswers.userId, userId))
    expect(row?.questionId).toBe('q-test')
    await db.delete(quizAnswers).where(eq(quizAnswers.userId, userId))
  })
})
```

- [ ] **Step 4: Run the test**

Run: `pnpm test tests/db/quiz-answers-insert.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/migrations tests/db/quiz-answers-insert.test.ts
git commit -m "feat(db): replace schema with Neon-native tables (no users, no RLS)

User identity lives in neon_auth.users_sync (managed by Neon Auth).
quiz_answers and career_recommendations key off user_id as plain text."
```

---

## Task 3: Install Neon Auth, configure the server instance, mount the handler, wire the middleware

**Files:**
- Create: `src/lib/auth/server.ts`
- Create: `src/lib/auth/client.ts`
- Create: `src/app/api/auth/[...path]/route.ts`
- Modify: `src/proxy.ts`
- Modify: `package.json`

- [ ] **Step 1: Install `@neondatabase/auth`**

```bash
pnpm add @neondatabase/auth
```

- [ ] **Step 2: Create `src/lib/auth/server.ts`**

```typescript
import 'server-only'
import { createNeonAuth } from '@neondatabase/auth/next/server'

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
})
```

- [ ] **Step 3: Create `src/lib/auth/client.ts`**

```typescript
'use client'
import { createAuthClient } from '@neondatabase/auth/next'

export const authClient = createAuthClient()
```

- [ ] **Step 4: Mount the catch-all handler at `src/app/api/auth/[...path]/route.ts`**

```typescript
import { auth } from '@/lib/auth/server'

export const { GET, POST } = auth.handler()
```

- [ ] **Step 5: Replace `src/proxy.ts` with the Neon Auth middleware wrapper**

```typescript
import { auth } from '@/lib/auth/server'

export const proxy = auth.middleware()

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

(Note: if `auth.middleware()` returns a function that needs to be called with `(request)` rather than the request being passed implicitly, change to `export async function proxy(request: NextRequest) { return auth.middleware()(request) }`. Verify by reading the function's TypeScript signature in your IDE before committing.)

- [ ] **Step 6: Smoke-test the handler**

```bash
pnpm dev
```

In another terminal:
```bash
curl -i http://localhost:3000/api/auth/get-session
```
Expected: HTTP 200 with body `{"data":null,"error":null}` (no session yet, but the route is mounted).

Then visit http://localhost:3000/api/auth in the browser to confirm the handler responds rather than 404'ing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth src/app/api/auth src/proxy.ts package.json pnpm-lock.yaml
git commit -m "feat(auth): wire Neon Auth — server instance, catch-all handler, middleware"
```

---

## Task 4: Create the `getSession` server helper and a unit test

**Files:**
- Create: `src/lib/auth/get-session.ts`
- Create: `tests/lib/auth/get-session.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `tests/lib/auth/get-session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  auth: { getSession: () => mockGetSession() },
}))

describe('getSession', () => {
  beforeEach(() => mockGetSession.mockReset())

  it('returns the session payload when Neon Auth resolves one', async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1' } }, error: null })
    const { getSession } = await import('@/lib/auth/get-session')
    const result = await getSession()
    expect(result?.user.id).toBe('u1')
  })

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: null, error: null })
    const { getSession } = await import('@/lib/auth/get-session')
    expect(await getSession()).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/lib/auth/get-session.test.ts`
Expected: FAIL with `Cannot find module '@/lib/auth/get-session'`.

- [ ] **Step 3: Create `src/lib/auth/get-session.ts`**

```typescript
import 'server-only'
import { auth } from '@/lib/auth/server'

export async function getSession() {
  const { data } = await auth.getSession()
  return data ?? null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/lib/auth/get-session.test.ts`
Expected: PASS for both cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth tests/lib/auth
git commit -m "feat(auth): add getSession server helper around auth.getSession"
```

---

## Task 5: Replace `getUser()` with `getSession()` in all server-side code

**Files:**
- Modify: `src/app/api/user/route.ts`
- Modify: `src/app/api/user/progress/route.ts`
- Modify: `src/app/api/careers/[onetId]/route.ts`
- Modify: `src/app/careers/actions.ts`
- Modify: `src/app/careers/page.tsx`
- Modify: `src/app/discover/interests/page.tsx`
- Delete: `src/app/discover/interests/actions.ts`

The pattern is identical in every file: import swap + auth-block swap. Query bodies (which already filter by `user.id`) stay unchanged. The local `users` table is gone, so any insert/update against `users` must be removed.

- [ ] **Step 1: Replace `src/app/api/user/route.ts` entirely**

This file's `users` queries become moot — profile fields live in Neon Auth, and `interests` stays as client-side Zustand state (already the source of truth per CLAUDE.md). New contents:

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const { user } = session
  return NextResponse.json({
    email: user.email ?? null,
    firstName: user.name?.split(' ')[0] ?? null,
    lastName: user.name?.split(' ').slice(1).join(' ') || null,
    interests: [], // moved to client-side Zustand state
  })
}
```

(Drop the POST handler entirely — `interests` no longer round-trips through this endpoint. Update any client caller in Step 8 below.)

- [ ] **Step 2: Update `src/app/api/user/progress/route.ts`**

Replace lines 1-2 with:
```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
```

In both `GET` (lines 8-21) and `POST` (lines 53-62), replace the supabase auth block with:
```typescript
const session = await getSession()
if (!session?.user) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}
const user = session.user
```

The query bodies stay exactly as-is (they already use `user.id`).

- [ ] **Step 3: Update `src/app/api/careers/[onetId]/route.ts`**

Same pattern as Step 2: import swap + auth-block swap. Query body unchanged.

- [ ] **Step 4: Update `src/app/careers/actions.ts`**

Same import + auth-block swap. **Additionally:** delete the "Ensure user row exists" block (the existing lines 92-107 that select/insert/update the `users` table) — there's no `users` table anymore. Keep the `careerRecommendations` delete + insert blocks intact.

- [ ] **Step 5: Update `src/app/careers/page.tsx`**

Same import + auth-block swap. Keep the existing `careerRecommendations` query.

- [ ] **Step 6: Replace `src/app/discover/interests/page.tsx`**

The page currently reads interests from the `users` table. Replace the entire file with:

```typescript
import InterestsClient from './_components/InterestsClient'

export default function InterestsPage() {
  return <InterestsClient initialInterests={[]} />
}
```

`InterestsClient` already uses Zustand for interests state; it will hydrate from there on mount.

- [ ] **Step 7: Delete `src/app/discover/interests/actions.ts`**

```bash
rm src/app/discover/interests/actions.ts
```

- [ ] **Step 8: Update callers of `saveInterestsAction` / `saveInterestsAndRedirect` and the POST `/api/user`**

Search for stale callers:
```bash
rg -l "saveInterestsAction|saveInterestsAndRedirect|fetch\\(['\"]/api/user['\"], \\{ method: ['\"]POST" src/
```

For each caller (likely `src/app/discover/interests/_components/InterestsClient.tsx` and any onboarding flow), replace the server-action call with:
1. Direct write to the Zustand interests slice (already imported in those components)
2. `router.push('/discover/preferences')` after the write

Example replacement for an `InterestsClient` save handler — replace:
```typescript
await saveInterestsAndRedirect(selectedInterests)
```
with:
```typescript
useInterestsStore.getState().setInterests(selectedInterests)
router.push('/discover/preferences')
```
(Adjust the store import + setter name to match the actual Zustand slice in `src/store/slices/interestsSlice.ts`.)

- [ ] **Step 9: Run the full test suite**

```bash
pnpm test
```

Expected: existing unit tests pass. Tests that mocked `@/lib/supabase/server` need their mocks pointed at `@/lib/auth/get-session` and returning `{ user: { id: '<test-id>', email: 'test@example.com', name: 'Test User' }, session: { id: 's1' } }`.

- [ ] **Step 10: Commit**

```bash
git add src/app
git commit -m "refactor(auth): swap supabase getUser for Neon Auth getSession in server code

Drops the local users table dependency entirely. Profile fields come from
Neon Auth's users_sync; interests stays as client-side Zustand state."
```

---

## Task 6: Swap the sign-up form to `authClient.signUp.email`

**Files:**
- Modify: `src/components/sign-up-form.tsx`

- [ ] **Step 1: Replace the supabase import and the `handleSignUp` body**

Open `src/components/sign-up-form.tsx`. Replace line 4 (`import { createClient } from '@/lib/supabase/client'`) with:
```typescript
import { authClient } from '@/lib/auth/client'
```

Replace lines 29-57 (the `handleSignUp` function) with:
```typescript
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  const parsed = signUpSchema.safeParse({ email, password, repeatPassword })
  if (!parsed.success) {
    setError(parsed.error.issues[0]?.message ?? 'Invalid input')
    setIsLoading(false)
    return
  }

  const { error } = await authClient.signUp.email({
    email,
    password,
    name: email.split('@')[0],
    callbackURL: '/',
  })
  if (error) {
    setError(error.message ?? 'An error occurred')
    setIsLoading(false)
    return
  }
  router.push('/')
}
```

The JSX stays unchanged — the form's visual design is preserved.

- [ ] **Step 2: Manual smoke test**

```bash
pnpm dev
```

Visit http://localhost:3000/auth/sign-up. Create a new account. Expected: redirect to `/`, and `curl http://localhost:3000/api/auth/get-session` returns the new user's session. Confirm the user appears in `psql "$DATABASE_URL" -c "SELECT id, primary_email FROM neon_auth.users_sync;"` (sync may take a few seconds).

- [ ] **Step 3: Commit**

```bash
git add src/components/sign-up-form.tsx
git commit -m "feat(auth): swap sign-up form to Neon Auth"
```

---

## Task 7: Swap the password login, forgot-password, and update-password forms

**Files:**
- Modify: `src/components/password-login-form.tsx`
- Modify: `src/components/forgot-password-form.tsx`
- Modify: `src/components/update-password-form.tsx`

- [ ] **Step 1: Update `password-login-form.tsx`**

Replace line 4 with `import { authClient } from '@/lib/auth/client'`.

Replace lines 16-33 (`handleLogin`) with:
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  const { error } = await authClient.signIn.email({ email, password, callbackURL: '/' })
  if (error) {
    setError(error.message ?? 'Invalid email or password')
    setIsLoading(false)
    return
  }
  router.push('/')
}
```

- [ ] **Step 2: Update `forgot-password-form.tsx`**

Replace line 4 with `import { authClient } from '@/lib/auth/client'`.

Replace lines 14-33 (`handleForgotPassword`) with:
```typescript
const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  const { error } = await authClient.forgetPassword({
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
```

- [ ] **Step 3: Update `update-password-form.tsx`**

Replace line 4 with `import { authClient } from '@/lib/auth/client'`.

Replace lines 14-31 (`handleUpdatePassword`) with:
```typescript
const handleUpdatePassword = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  const url = new URL(window.location.href)
  const token = url.searchParams.get('token') ?? ''
  const { error } = await authClient.resetPassword({ newPassword: password, token })
  if (error) {
    setError(error.message ?? 'An error occurred')
    setIsLoading(false)
    return
  }
  router.push('/')
}
```

- [ ] **Step 4: Manual smoke test of each flow**

1. From `/auth/login`, sign in with the account from Task 6 → expect redirect to `/`.
2. From `/auth/forgot-password`, request a reset email. Neon Auth sends the email out of the box (no SMTP config needed in development — check Neon Auth's hosted inbox preview, or look in your real inbox if production SMTP is wired).
3. Open the reset link → land on `/auth/update-password?token=...` → set a new password → expect redirect to `/` with a fresh session.

- [ ] **Step 5: Commit**

```bash
git add src/components/password-login-form.tsx src/components/forgot-password-form.tsx src/components/update-password-form.tsx
git commit -m "feat(auth): swap password login/reset/update forms to Neon Auth"
```

---

## Task 8: Swap the social (Google) login form and delete the legacy OAuth callback routes

**Files:**
- Modify: `src/components/social-login-form.tsx`
- Delete: `src/app/auth/oauth/route.ts`
- Delete: `src/app/auth/confirm/route.ts`

- [ ] **Step 1: Update `social-login-form.tsx`**

Replace line 4 with `import { authClient } from '@/lib/auth/client'`.

Replace lines 13-32 (`handleSocialLogin`) with:
```typescript
const handleSocialLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  const { error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: '/',
  })
  if (error) {
    const msg = error.message ?? 'An error occurred'
    setError(msg)
    toast.error(`Login failed: ${msg}`)
    setIsLoading(false)
  }
}
```

- [ ] **Step 2: Delete the legacy callback routes**

```bash
rm src/app/auth/oauth/route.ts src/app/auth/confirm/route.ts
rmdir src/app/auth/oauth src/app/auth/confirm 2>/dev/null || true
```

- [ ] **Step 3: Smoke-test the Google flow**

Visit http://localhost:3000/auth/login → click "Continue with Google" → Google consent → redirect lands at `/api/auth/callback/google` (Neon Auth's handler) → `/`. Verify the user landed in `neon_auth.users_sync` and a session cookie is set (`document.cookie` should contain a Neon Auth session token).

- [ ] **Step 4: Commit**

```bash
git add src/components/social-login-form.tsx src/app/auth
git commit -m "feat(auth): swap Google OAuth to Neon Auth + delete legacy callback routes"
```

---

## Task 9: Replace anonymous auth provider, the auth context, and the logout button

**Files:**
- Modify: `src/components/anonymous-auth-provider.tsx`
- Modify: `src/providers/auth-provider.tsx`
- Modify: `src/components/logout-button.tsx`

**Note on anonymous auth in Neon Auth:** Neon Auth supports anonymous sessions via `authClient.signIn.anonymous()` (Better Auth's anonymous plugin is enabled by Neon Auth's defaults). If the implementer finds that method does not exist on `authClient`, they should:
- (a) check Neon Auth's release notes for the anonymous-plugin opt-in (it may need enabling in `createNeonAuth()`'s plugins option), or
- (b) report BLOCKED with a link to the SDK reference, rather than guessing an API.

- [ ] **Step 1: Update `anonymous-auth-provider.tsx`**

Replace the entire file with:
```typescript
'use client'

import { authClient } from '@/lib/auth/client'
import { useEffect } from 'react'

export function AnonymousAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const ensureSession = async () => {
      const { data } = await authClient.getSession()
      if (!data) {
        const { error } = await authClient.signIn.anonymous()
        if (error) console.error('Failed to create anonymous session:', error.message)
      }
    }
    ensureSession()
  }, [])

  return <>{children}</>
}
```

- [ ] **Step 2: Update `auth-provider.tsx`**

Replace the entire file with:
```typescript
'use client'

import { createContext, useContext, useMemo } from 'react'
import { authClient } from '@/lib/auth/client'

interface AuthContext {
  user: { id: string, email: string | null, name: string, isAnonymous: boolean } | null
  loading: boolean
  isLoggedIn: boolean
  isAnonymous: boolean
}

const AuthContext = createContext<AuthContext>({
  user: null,
  loading: true,
  isLoggedIn: false,
  isAnonymous: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()

  const value = useMemo(() => {
    const u = session?.user
    if (!u) {
      return { user: null, loading: isPending, isLoggedIn: false, isAnonymous: true }
    }
    const isAnon = !!(u as { isAnonymous?: boolean }).isAnonymous
    return {
      user: { id: u.id, email: u.email ?? null, name: u.name ?? '', isAnonymous: isAnon },
      loading: isPending,
      isLoggedIn: !isAnon,
      isAnonymous: isAnon,
    }
  }, [session, isPending])

  return <AuthContext value={value}>{children}</AuthContext>
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 3: Update `logout-button.tsx`**

Replace the entire file with:
```typescript
'use client'

import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    try {
      await authClient.signOut()
      router.push('/auth/login')
    }
    catch (error) {
      toast.error('Failed to log out. Please try again.')
      console.error('Logout error:', error)
    }
  }

  return <Button variant="outline" onClick={logout}>Logout</Button>
}
```

- [ ] **Step 4: Smoke-test all three flows**

1. Open the site in an incognito window — expect `AnonymousAuthProvider` to mint a guest session; `useAuth().isAnonymous` is `true`.
2. Sign in via Google → `useAuth().isAnonymous` flips to `false`, `useAuth().user.id` matches the Neon Auth user ID.
3. Click logout → expect redirect to `/auth/login` and `/api/auth/get-session` returns null data.

- [ ] **Step 5: Commit**

```bash
git add src/components/anonymous-auth-provider.tsx src/providers/auth-provider.tsx src/components/logout-button.tsx
git commit -m "feat(auth): swap anonymous provider, auth context, and logout to Neon Auth"
```

---

## Task 10: Cleanup — remove Supabase deps, files, and archive old migrations

**Files:**
- Delete: `src/lib/supabase/` (whole directory)
- Modify: `package.json`
- Move: `supabase/` → `archive/supabase-migrations/`
- Modify: `.env.local`, `.env.example`

- [ ] **Step 1: Delete the supabase lib directory**

```bash
rm -rf src/lib/supabase
```

- [ ] **Step 2: Remove the supabase npm packages**

```bash
pnpm remove @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 3: Archive the old supabase migrations folder**

```bash
mkdir -p archive
mv supabase archive/supabase-migrations
```

- [ ] **Step 4: Strip `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local` and `.env.example`**

Open both files; delete the two `NEXT_PUBLIC_SUPABASE_*` lines. Mirror the new Neon Auth keys (`NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`) with empty values into `.env.example`.

- [ ] **Step 5: Run lint + tests + build**

```bash
pnpm lint
pnpm test
pnpm build
```

Expected: clean lint, green tests, successful build with no references to `@supabase/*` or `@/lib/supabase`.

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "chore(supabase): remove Supabase deps, lib, and archive old migrations"
```

---

## Self-Review

**Spec coverage check:**
- [x] Neon DB host swap → Task 1
- [x] Drop RLS + `auth.uid()` default + drop local `users` table → Task 2
- [x] Neon Auth installed, server instance, handler, middleware → Task 3
- [x] Server `getSession()` helper → Task 4
- [x] All 7 server-side `getUser()` call sites swapped + dependent `users`-table writes removed + interests moved to client-only Zustand → Task 5
- [x] Sign-up form swap (custom UI preserved) → Task 6
- [x] Login + forgot/update password forms (custom UI preserved) → Task 7
- [x] Google OAuth + delete legacy callback routes → Task 8
- [x] Anonymous auth + auth context + logout → Task 9
- [x] Cleanup of deps + files + env vars → Task 10

**Placeholder scan:** No `TBD`, `TODO`, or "implement later". Every code-touching step has the literal code or command. The one uncertainty (anonymous-plugin opt-in path) is explicitly handled with a halt-if-missing instruction in Task 9 rather than a guess.

**Type / name consistency:**
- `getSession()` is the single server-side helper across Tasks 4 and 5. Returns `{ user, session } | null` — call sites use `session.user.id` and `session.user.email`.
- `authClient` is the single client-side surface across Tasks 6–9. Methods used: `signUp.email`, `signIn.email`, `signIn.social`, `signIn.anonymous`, `forgetPassword`, `resetPassword`, `signOut`, `getSession`, `useSession`. All exist in Neon Auth's client (Better Auth API surface).
- `auth.handler()` (Task 3) and `auth.getSession()` (Task 4) both come from the same `auth` server instance defined in Task 3.
- `quizAnswers.userId` and `careerRecommendations.userId` are plain text columns (Task 2) that store Neon Auth user IDs (Task 5). Same column type, no FK conflicts.
- `useAuth()` consumer contract preserved: `{ user, loading, isLoggedIn, isAnonymous }` — same shape consumers used with the Supabase implementation.

**Known caveats:**
- All existing data is dropped (Task 2 starts from an empty Neon DB); confirmed with the user.
- `interests` moves from server (DB column on `users`) to client-only (Zustand store). This was already the de facto source of truth per CLAUDE.md.
- Production Google OAuth credentials must be added in the Neon Auth dashboard at deploy time (dev uses Neon's shared dev credentials).
- Email delivery for password reset is provided by Neon Auth out of the box.
- `authClient.signIn.anonymous()` API existence is verified against Better Auth's anonymous plugin; if Neon Auth doesn't auto-enable it, Task 9 calls for a halt rather than a guess.
