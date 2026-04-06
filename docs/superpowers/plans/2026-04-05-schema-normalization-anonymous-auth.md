# Schema Normalization & Anonymous Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the `user_info` table into three purpose-specific tables (`users`, `quiz_answers`, `career_recommendations`) and enable Supabase anonymous sign-ins so every visitor persists data to the database.

**Architecture:** Replace the single `user_info` table with three normalized tables using Drizzle ORM. Enable Supabase anonymous auth so all visitors get a real session on first visit. Update all API routes, server actions, and client pages to use the new tables and remove the guest-vs-authenticated branching.

**Tech Stack:** Next.js 15, Drizzle ORM, Supabase Auth (anonymous sign-ins), Zustand, PostgreSQL

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Rewrite | `src/db/schema.ts` | New normalized table definitions + RLS policies |
| Create | `src/components/anonymous-auth-provider.tsx` | Auto sign-in anonymous users on first visit |
| Rewrite | `src/lib/supabase/middleware.ts` | Remove login redirect, session refresh only |
| Rewrite | `src/hooks/use-is-logged-in.ts` → `src/hooks/use-is-anonymous.ts` | Check if current user is anonymous |
| Modify | `src/app/layout.tsx` | Wrap app in AnonymousAuthProvider |
| Rewrite | `src/app/api/user/route.ts` | Use `users` table |
| Rewrite | `src/app/api/user/progress/route.ts` | Use `quiz_answers` table with individual row upserts |
| Rewrite | `src/app/api/careers/[onetId]/route.ts` | Use `career_recommendations` table |
| Rewrite | `src/app/intake/interests/actions.ts` | Use `users` table, remove guest fallback |
| Rewrite | `src/app/careers/actions.ts` | Use `career_recommendations` table for individual rows |
| Modify | `src/app/intake/would-you-rather/page.tsx` | Remove `isLoggedIn` gating, always sync to DB |
| Modify | `src/app/intake/interests/page.tsx` | Use `users` table |
| Modify | `src/app/careers/page.tsx` | Use `career_recommendations` table |
| Modify | `src/app/careers/_components/CareersClient.tsx` | Replace `isLoggedIn` check with `isAnonymous` |
| Modify | `src/components/navigation-bar.tsx` | Show "Sign Up" for anonymous users |
| Modify | `src/components/sign-up-form.tsx` | Link anonymous identity on sign-up |
| Modify | `src/components/password-login-form.tsx` | Link anonymous identity on login |
| Modify | `src/components/social-login-form.tsx` | Link anonymous identity on OAuth login |
| Delete | `src/hooks/use-is-logged-in.ts` | Replaced by `use-is-anonymous.ts` |

---

### Task 1: Rewrite Drizzle Schema

**Files:**
- Rewrite: `src/db/schema.ts`

- [ ] **Step 1: Replace `src/db/schema.ts` with normalized tables**

```typescript
import { pgTable, pgPolicy, serial, smallint, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: text()
    .primaryKey()
    .default(sql`auth.uid()`),
  email: text(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  interests: text().array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, () => [
  pgPolicy('users_select', { as: 'permissive', for: 'select', to: ['authenticated', 'anon'], using: sql`auth.uid() = id` }),
  pgPolicy('users_insert', { as: 'permissive', for: 'insert', to: ['authenticated', 'anon'], withCheck: sql`auth.uid() = id` }),
  pgPolicy('users_update', { as: 'permissive', for: 'update', to: ['authenticated', 'anon'], using: sql`auth.uid() = id` }),
])

export const quizAnswers = pgTable('quiz_answers', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull(),
  selectedOption: smallint('selected_option'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, table => [
  unique('quiz_answers_user_question_unique').on(table.userId, table.questionId),
  pgPolicy('quiz_answers_select', { as: 'permissive', for: 'select', to: ['authenticated', 'anon'], using: sql`auth.uid() = ${table.userId}` }),
  pgPolicy('quiz_answers_insert', { as: 'permissive', for: 'insert', to: ['authenticated', 'anon'], withCheck: sql`auth.uid() = ${table.userId}` }),
  pgPolicy('quiz_answers_update', { as: 'permissive', for: 'update', to: ['authenticated', 'anon'], using: sql`auth.uid() = ${table.userId}` }),
])

export const careerRecommendations = pgTable('career_recommendations', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  onetId: text('onet_id').notNull(),
  title: text().notNull(),
  description: text().notNull(),
  whyItMatches: text('why_it_matches').notNull(),
  jobGrowth: text('job_growth').notNull(),
  salaryRange: text('salary_range').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, () => [
  pgPolicy('career_recommendations_select', { as: 'permissive', for: 'select', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
  pgPolicy('career_recommendations_insert', { as: 'permissive', for: 'insert', to: ['authenticated', 'anon'], withCheck: sql`auth.uid() = user_id` }),
  pgPolicy('career_recommendations_update', { as: 'permissive', for: 'update', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
])
```

- [ ] **Step 2: Verify the schema compiles**

Run: `cd /Users/michaelgilbertson/Projects/career-quest && npx tsc --noEmit src/db/schema.ts 2>&1 | head -20`
Expected: No errors (or only errors from files that import the old schema, which we haven't updated yet)

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: normalized schema with users, quiz_answers, career_recommendations tables"
```

---

### Task 2: Generate and Push Migration

**Files:**
- Uses: `drizzle.config.ts`
- Output: `supabase/migrations/*.sql`

- [ ] **Step 1: Generate migration**

Run: `cd /Users/michaelgilbertson/Projects/career-quest && npx drizzle-kit generate`
Expected: Migration file created in `supabase/migrations/`

- [ ] **Step 2: Review the generated migration SQL**

Read the generated migration file and verify it:
- Drops the `user_info` table (or creates a new migration that creates the three new tables)
- Creates `users`, `quiz_answers`, `career_recommendations` tables
- Includes RLS policies for both `authenticated` and `anon` roles
- Includes the unique constraint on `quiz_answers(user_id, question_id)`
- Includes cascade delete on foreign keys

If the migration doesn't drop `user_info`, that's fine — we can handle that separately or it may already be gone if drizzle detects the rename.

- [ ] **Step 3: Push migration to Supabase**

Run: `cd /Users/michaelgilbertson/Projects/career-quest && npx drizzle-kit push`
Expected: Schema changes applied to database

- [ ] **Step 4: Commit migration files**

```bash
git add supabase/migrations/
git commit -m "chore: migration for normalized schema"
```

---

### Task 3: Enable Anonymous Auth in Supabase

**Files:** None (Supabase dashboard configuration)

- [ ] **Step 1: Enable anonymous sign-ins**

This is a **manual step** in the Supabase dashboard:
1. Go to project dashboard → Authentication → Settings
2. Under "Anonymous Sign-ins", toggle it ON
3. Save

Verify by checking that `supabase.auth.signInAnonymously()` resolves without error (tested in the next task).

- [ ] **Step 2: Commit a note or update the spec**

No code change needed. Mark this task complete after dashboard configuration.

---

### Task 4: Create Anonymous Auth Provider

**Files:**
- Create: `src/components/anonymous-auth-provider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/anonymous-auth-provider.tsx`**

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function AnonymousAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  useEffect(() => {
    const ensureSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await supabase.auth.signInAnonymously()
      }
    }
    ensureSession()
  }, [supabase.auth])

  return <>{children}</>
}
```

- [ ] **Step 2: Wrap the app in `AnonymousAuthProvider` in `src/app/layout.tsx`**

Add import at top:
```typescript
import { AnonymousAuthProvider } from '@/components/anonymous-auth-provider'
```

Wrap inside ThemeProvider:
```typescript
<ThemeProvider
  attribute="data-theme"
  defaultTheme="dark"
  enableSystem
  themes={['light', 'dark']}
>
  <AnonymousAuthProvider>
    <NavigationBar />
    <main className="mt-20">{children}</main>
    <Toaster />
  </AnonymousAuthProvider>
</ThemeProvider>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/anonymous-auth-provider.tsx src/app/layout.tsx
git commit -m "feat: anonymous auth provider for automatic session creation"
```

---

### Task 5: Update Middleware — Remove Login Redirect

**Files:**
- Rewrite: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Rewrite `src/lib/supabase/middleware.ts`**

Remove the login redirect logic. The middleware should only refresh sessions, not enforce authentication. Anonymous users have valid sessions, so the redirect is no longer needed.

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session — do not remove this call
  await supabase.auth.getUser()

  return supabaseResponse
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat: simplify middleware to session refresh only, remove login redirect"
```

---

### Task 6: Create `useIsAnonymous` Hook and Delete `useIsLoggedIn`

**Files:**
- Create: `src/hooks/use-is-anonymous.ts`
- Delete: `src/hooks/use-is-logged-in.ts`

- [ ] **Step 1: Create `src/hooks/use-is-anonymous.ts`**

```typescript
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useIsAnonymous = () => {
  const [isAnonymous, setIsAnonymous] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAnonymous(user?.is_anonymous ?? true)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAnonymous(session?.user?.is_anonymous ?? true)
      },
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return isAnonymous
}
```

- [ ] **Step 2: Delete `src/hooks/use-is-logged-in.ts`**

```bash
rm src/hooks/use-is-logged-in.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-is-anonymous.ts
git rm src/hooks/use-is-logged-in.ts
git commit -m "feat: replace useIsLoggedIn with useIsAnonymous hook"
```

---

### Task 7: Rewrite `/api/user` Route

**Files:**
- Rewrite: `src/app/api/user/route.ts`

- [ ] **Step 1: Rewrite `src/app/api/user/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const userData = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!userData || userData.length === 0) {
      return NextResponse.json({
        interests: [],
        email: null,
        firstName: null,
        lastName: null,
      })
    }

    const row = userData[0]
    return NextResponse.json({
      interests: row.interests || [],
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
    })
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { interests } = await request.json()

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const existingUser = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (existingUser.length > 0) {
      await db.update(users)
        .set({
          interests: interests || existingUser[0].interests,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
    }
    else {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        interests: interests || [],
      })
    }

    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/user/route.ts
git commit -m "feat: update /api/user route to use normalized users table"
```

---

### Task 8: Rewrite `/api/user/progress` Route

**Files:**
- Rewrite: `src/app/api/user/progress/route.ts`

- [ ] **Step 1: Rewrite `src/app/api/user/progress/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { quizAnswers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const rows = await db.select().from(quizAnswers)
      .where(eq(quizAnswers.userId, user.id))

    // Reconstruct the answers Record and skippedQuestions array
    const answers: Record<string, number> = {}
    const skippedQuestions: string[] = []

    for (const row of rows) {
      if (row.selectedOption === null) {
        skippedQuestions.push(row.questionId)
      }
      else {
        answers[row.questionId] = row.selectedOption
      }
    }

    return NextResponse.json({
      progress: rows.length > 0 ? { answers, skippedQuestions } : null,
    })
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { answers, skippedQuestions } = await request.json() as {
      answers: Record<string, number>
      skippedQuestions: string[]
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    // Build upsert values: answered questions + skipped questions
    const values: { userId: string, questionId: string, selectedOption: number | null }[] = []

    for (const [questionId, option] of Object.entries(answers)) {
      values.push({ userId: user.id, questionId, selectedOption: option })
    }

    for (const questionId of (skippedQuestions || [])) {
      if (!(questionId in answers)) {
        values.push({ userId: user.id, questionId, selectedOption: null })
      }
    }

    if (values.length > 0) {
      await db.insert(quizAnswers)
        .values(values)
        .onConflictDoUpdate({
          target: [quizAnswers.userId, quizAnswers.questionId],
          set: {
            selectedOption: sql`excluded.selected_option`,
            updatedAt: new Date(),
          },
        })
    }

    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 },
    )
  }
}
```

**Note:** Add `import { sql } from 'drizzle-orm'` at the top. The `onConflictDoUpdate` uses the unique constraint on `(user_id, question_id)`. The `excluded` reference gets the value from the attempted INSERT row.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/user/progress/route.ts
git commit -m "feat: update /api/user/progress to use quiz_answers table with upserts"
```

---

### Task 9: Rewrite `/api/careers/[onetId]` Route

**Files:**
- Rewrite: `src/app/api/careers/[onetId]/route.ts`

- [ ] **Step 1: Rewrite `src/app/api/careers/[onetId]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ onetId: string }> },
) {
  try {
    const { onetId } = await params

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const rows = await db.select().from(careerRecommendations)
      .where(and(
        eq(careerRecommendations.userId, user.id),
        eq(careerRecommendations.onetId, onetId),
      ))
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Career not found' },
        { status: 404 },
      )
    }

    const row = rows[0]
    return NextResponse.json({
      career: {
        title: row.title,
        description: row.description,
        onetId: row.onetId,
        whyItMatches: row.whyItMatches,
        jobGrowth: row.jobGrowth,
        salaryRange: row.salaryRange,
      },
    })
  }
  catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/careers/[onetId]/route.ts
git commit -m "feat: update /api/careers/[onetId] to use career_recommendations table"
```

---

### Task 10: Rewrite Interests Server Actions

**Files:**
- Rewrite: `src/app/intake/interests/actions.ts`

- [ ] **Step 1: Rewrite `src/app/intake/interests/actions.ts`**

With anonymous auth, every user has a session. No more guest fallback needed.

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export async function saveInterestsAction(interests: string[]) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: 'Authentication required' }
  }

  const existingUser = await db.select().from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (existingUser.length > 0) {
    await db.update(users)
      .set({
        interests,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
  }
  else {
    await db.insert(users).values({
      id: user.id,
      email: user.email,
      interests,
    })
  }

  return { success: true }
}

export async function saveInterestsAndRedirect(interests: string[]) {
  await saveInterestsAction(interests)
  redirect('/intake/would-you-rather')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/intake/interests/actions.ts
git commit -m "feat: simplify interests actions with normalized users table"
```

---

### Task 11: Rewrite Career Recommendations Action

**Files:**
- Rewrite: `src/app/careers/actions.ts`

- [ ] **Step 1: Rewrite `src/app/careers/actions.ts`**

Save individual rows to `career_recommendations` instead of a JSON blob.

```typescript
'use server'

import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users, careerRecommendations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { CareerRecommendation, CareersResponseSchema } from '@/lib/schemas/career'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateCareerRecommendationsAction(
  results: Record<string, Record<string, number>>,
  interests: string[],
): Promise<{ success: boolean, careers?: CareerRecommendation[], error?: string }> {
  try {
    const prompt = `
      Based on the following assessment results and selected interests, suggest 10 career paths that would be a good match. 
      For each career, provide a brief explanation of why it matches their profile.
      Format the response as a JSON array of objects, where each object has the following properties:
      - title: string (the title of the career)
      - description: string (a brief description of the career)
      - onetId: string (the Onet ID of the career)
      - whyItMatches: string (a brief explanation of why it matches their profile)
      - jobGrowth: string (the job growth of the career)
      - salaryRange: string (the salary range of the career)

      Selected Interests:
      ${interests.join(', ')}

      Assessment Results:
      ${JSON.stringify(results, null, 2)}
    `

    const result = await generateObject({
      model: openai.chat('gpt-4o'),
      system: `You are a career counselor helping to match people with suitable careers based on their interests, values, and preferences. 
      Consider both their explicitly selected interests and their assessment results when making recommendations.
      Prioritize careers that align with their selected interests while also matching their RIASEC profile, work values, and environment preferences.`,
      prompt,
      schema: CareersResponseSchema,
    })

    if (!result) {
      throw new Error('No response from OpenAI')
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Ensure user row exists
    const existingUser = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        interests,
      })
    }
    else {
      await db.update(users)
        .set({ interests, updatedAt: new Date() })
        .where(eq(users.id, user.id))
    }

    // Delete old recommendations and insert new ones
    await db.delete(careerRecommendations)
      .where(eq(careerRecommendations.userId, user.id))

    await db.insert(careerRecommendations).values(
      result.object.careers.map(career => ({
        userId: user.id,
        onetId: career.onetId,
        title: career.title,
        description: career.description,
        whyItMatches: career.whyItMatches,
        jobGrowth: career.jobGrowth,
        salaryRange: career.salaryRange,
      })),
    )

    return { success: true, careers: result.object.careers }
  }
  catch (error) {
    console.error('Error generating career recommendations:', error)
    return { success: false, error: 'Failed to generate career recommendations' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/careers/actions.ts
git commit -m "feat: save career recommendations as individual rows"
```

---

### Task 12: Update Interests Page (Server Component)

**Files:**
- Modify: `src/app/intake/interests/page.tsx`

- [ ] **Step 1: Update `src/app/intake/interests/page.tsx`**

Change `userInfo` import to `users`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import InterestsClient from './_components/InterestsClient'

async function getUserInterests(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return []
    }

    const userData = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!userData || userData.length === 0) {
      return []
    }

    return userData[0].interests || []
  }
  catch {
    return []
  }
}

export default async function InterestsPage() {
  const initialInterests = await getUserInterests()

  return <InterestsClient initialInterests={initialInterests} />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/intake/interests/page.tsx
git commit -m "feat: update interests page to use normalized users table"
```

---

### Task 13: Update Careers Page (Server Component)

**Files:**
- Modify: `src/app/careers/page.tsx`

- [ ] **Step 1: Rewrite `src/app/careers/page.tsx`**

Query `career_recommendations` table instead of JSON blob:

```typescript
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import CareersClient from './_components/CareersClient'
import { CareerRecommendation } from '@/lib/schemas/career'

async function getUserCareers(): Promise<CareerRecommendation[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return []
    }

    const rows = await db.select().from(careerRecommendations)
      .where(eq(careerRecommendations.userId, user.id))

    return rows.map(row => ({
      title: row.title,
      description: row.description,
      onetId: row.onetId,
      whyItMatches: row.whyItMatches,
      jobGrowth: row.jobGrowth,
      salaryRange: row.salaryRange,
    }))
  }
  catch {
    return []
  }
}

export default async function CareersPage() {
  const initialCareers = await getUserCareers()

  return <CareersClient initialCareers={initialCareers} />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/careers/page.tsx
git commit -m "feat: update careers page to use career_recommendations table"
```

---

### Task 14: Update Would-You-Rather Page — Remove Guest Branching

**Files:**
- Modify: `src/app/intake/would-you-rather/page.tsx`

- [ ] **Step 1: Remove `useIsLoggedIn` and simplify sync logic**

In `src/app/intake/would-you-rather/page.tsx`, make these changes:

1. Remove the import of `useIsLoggedIn`:
```
// DELETE: import { useIsLoggedIn } from '@/hooks/use-is-logged-in'
```

2. Remove the `isLoggedIn` state variable:
```
// DELETE: const isLoggedIn = useIsLoggedIn()
```

3. Replace the two useEffects (lines 55-64) with unconditional sync:

Replace:
```typescript
  useEffect(() => {
    if (isLoggedIn && !isHydrated) loadSavedProgress()
    else if (!isLoggedIn) setIsHydrated(true)
  }, [isLoggedIn, isHydrated, loadSavedProgress])

  useEffect(() => {
    if (isLoggedIn && isHydrated && (Object.keys(answers).length > 0 || skippedQuestions.size > 0)) {
      saveProgressToDB()
    }
  }, [answers, skippedQuestions, isLoggedIn, isHydrated, saveProgressToDB])
```

With:
```typescript
  useEffect(() => {
    if (!isHydrated) loadSavedProgress()
  }, [isHydrated, loadSavedProgress])

  useEffect(() => {
    if (isHydrated && (Object.keys(answers).length > 0 || skippedQuestions.size > 0)) {
      saveProgressToDB()
    }
  }, [answers, skippedQuestions, isHydrated, saveProgressToDB])
```

- [ ] **Step 2: Commit**

```bash
git add src/app/intake/would-you-rather/page.tsx
git commit -m "feat: remove guest branching from would-you-rather, always sync to DB"
```

---

### Task 15: Update CareersClient — Replace `isLoggedIn` with `isAnonymous`

**Files:**
- Modify: `src/app/careers/_components/CareersClient.tsx`

- [ ] **Step 1: Update imports and hook usage**

In `src/app/careers/_components/CareersClient.tsx`:

1. Replace import:
```
// OLD: import { useIsLoggedIn } from '@/hooks/use-is-logged-in'
// NEW:
import { useIsAnonymous } from '@/hooks/use-is-anonymous'
```

2. Replace hook call (line 36):
```
// OLD: const isLoggedIn = useIsLoggedIn()
// NEW:
const isAnonymous = useIsAnonymous()
```

3. Replace the empty-state logic (line 141). Change `!isLoggedIn` to `isAnonymous`:
```
// OLD: {!isLoggedIn
// NEW:
{isAnonymous
```

This preserves the "Sign in to generate" prompt for anonymous users while allowing authenticated users to generate recommendations directly.

- [ ] **Step 2: Commit**

```bash
git add src/app/careers/_components/CareersClient.tsx
git commit -m "feat: replace isLoggedIn with isAnonymous in CareersClient"
```

---

### Task 16: Update Navigation Bar for Anonymous Users

**Files:**
- Modify: `src/components/navigation-bar.tsx`

- [ ] **Step 1: Update `src/components/navigation-bar.tsx`**

The nav bar currently checks if `user` is null to show Login/Sign Up buttons. With anonymous auth, `user` is never null — but anonymous users should still see "Sign Up" / "Log In". We need to check `user.is_anonymous`.

Replace the user state check logic. Change:

```typescript
const [user, setUser] = useState<User | null>(null)
```

To:

```typescript
const [user, setUser] = useState<User | null>(null)
const isAnonymous = user?.is_anonymous ?? true
```

Then replace all `!user` checks in the JSX with `isAnonymous`:

Desktop nav (line 88): Change `user` to `!isAnonymous`:
```typescript
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
```

Mobile avatar (line 108): Change `user` to `!isAnonymous`:
```typescript
{!loading && !isAnonymous && <CurrentUserAvatar />}
```

Mobile dropdown (lines 135-145): Change `!user` to `isAnonymous` and `user` to `!isAnonymous`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/navigation-bar.tsx
git commit -m "feat: update nav bar to distinguish anonymous from authenticated users"
```

---

### Task 17: Update Auth Forms for Account Linking

**Files:**
- Modify: `src/components/sign-up-form.tsx`
- Modify: `src/components/password-login-form.tsx`
- Modify: `src/components/social-login-form.tsx`

When an anonymous user signs up or logs in, their anonymous session should be linked to the new identity. Supabase handles this automatically when you call `signUp()` or `signInWithPassword()` while an anonymous session is active — the anonymous user gets upgraded. No special linking code is needed.

However, the sign-up form currently redirects to `/auth/sign-up-success` for email confirmation. For anonymous users upgrading, we should redirect to `/` instead if no email confirmation is needed (e.g., OAuth).

- [ ] **Step 1: Update `src/components/sign-up-form.tsx`**

The only change needed is updating the email redirect URL from `/protected` to `/`:

Replace line 33:
```typescript
        options: { emailRedirectTo: `${window.location.origin}/protected` },
```

With:
```typescript
        options: { emailRedirectTo: `${window.location.origin}/` },
```

- [ ] **Step 2: Update `src/components/password-login-form.tsx`**

No changes needed. `signInWithPassword()` already works correctly — when called during an anonymous session, Supabase links the identities automatically. The redirect to `/` on success is already correct.

- [ ] **Step 3: Update `src/components/social-login-form.tsx`**

No changes needed. `signInWithOAuth()` with Google already redirects correctly. When an anonymous user authenticates via OAuth, Supabase links the anonymous identity to the OAuth identity.

- [ ] **Step 4: Commit**

```bash
git add src/components/sign-up-form.tsx
git commit -m "fix: update sign-up redirect URL from /protected to /"
```

---

### Task 18: Add RLS DELETE Policy for Career Recommendations

**Files:**
- Modify: `src/db/schema.ts`

The career generation action (Task 11) deletes old recommendations before inserting new ones. We need a DELETE policy for `career_recommendations`.

- [ ] **Step 1: Add DELETE policy to `careerRecommendations` in `src/db/schema.ts`**

Add one more policy to the `careerRecommendations` table definition:

```typescript
pgPolicy('career_recommendations_delete', { as: 'permissive', for: 'delete', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
```

So the full policies array becomes:
```typescript
}, () => [
  pgPolicy('career_recommendations_select', { as: 'permissive', for: 'select', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
  pgPolicy('career_recommendations_insert', { as: 'permissive', for: 'insert', to: ['authenticated', 'anon'], withCheck: sql`auth.uid() = user_id` }),
  pgPolicy('career_recommendations_update', { as: 'permissive', for: 'update', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
  pgPolicy('career_recommendations_delete', { as: 'permissive', for: 'delete', to: ['authenticated', 'anon'], using: sql`auth.uid() = user_id` }),
])
```

- [ ] **Step 2: Generate and push updated migration**

Run: `cd /Users/michaelgilbertson/Projects/career-quest && npx drizzle-kit generate && npx drizzle-kit push`

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts supabase/migrations/
git commit -m "feat: add DELETE RLS policy for career_recommendations"
```

---

### Task 19: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the build**

Run: `cd /Users/michaelgilbertson/Projects/career-quest && pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Fix any TypeScript errors**

If the build fails, review the errors. Common issues:
- Missing imports (old `userInfo` references)
- Type mismatches from schema changes
- Unused imports of deleted hooks

Fix each error and re-run the build.

- [ ] **Step 3: Run lint**

Run: `cd /Users/michaelgilbertson/Projects/career-quest && pnpm lint`
Expected: No lint errors

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build and lint errors from schema migration"
```

---

### Task 20: Manual Smoke Test

- [ ] **Step 1: Start dev server and test the flow**

Run: `pnpm dev`

Test the following flow:

1. Open the app in an incognito/private window
2. Verify that an anonymous session is created (check Supabase auth dashboard)
3. Select interests on `/intake/interests` → verify they save to `users` table
4. Complete the would-you-rather quiz → verify individual rows appear in `quiz_answers` table
5. View the summary page → verify it still calculates results from localStorage correctly
6. If you have an OpenAI key configured: generate career recommendations → verify rows appear in `career_recommendations` table
7. Sign up with email/password → verify the same UUID persists (account linking)
8. Verify all data is still accessible after linking

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: schema normalization and anonymous auth migration complete"
```
