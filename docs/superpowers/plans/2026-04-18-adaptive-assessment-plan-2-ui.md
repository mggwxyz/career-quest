# Adaptive Assessment — Plan 2: API, Store, UI, LLM, Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed 30-item "would-you-rather" quiz UI, API, and LLM prompt with the adaptive engine landed in Plan 1 — end-to-end, shipping the full user-facing experience described in the spec.

**Architecture:** Three thin Next.js route handlers (`/api/assessment/session`, `/api/assessment/response`, `/api/assessment/result`) own session lifecycle and persist to the new Drizzle tables. A rewritten Zustand slice (`assessmentSlice`) owns in-flight UI state only (current item, last-shown for undo, ephemeral posterior snapshot for the confidence meter / peek modal). The quiz page and profile page are rewritten against the new `Item` / `AssessmentResult` types. `careers/actions.ts` swaps raw tally JSON for `formatResultForPrompt(...)` and writes to `recommendation_runs`. Final step drops legacy tables (`quiz_answers`), rebuilds `career_recommendations` with the new shape, and deletes legacy source (`questions.ts`, `wouldYouRatherSlice.ts`, `/api/user/progress`).

**Tech Stack:** TypeScript, Next.js 16 App Router, Drizzle ORM, Neon Postgres, Zustand, Vitest, Playwright, framer-motion, Tailwind + DaisyUI.

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-04-18-adaptive-assessment-design.md`
- Plan 1: `docs/superpowers/plans/2026-04-18-adaptive-assessment-plan-1-engine.md` (completed)

**Prerequisite:** Plan 1 is merged or on the same branch. `src/lib/assessment/` and the new Drizzle tables are already in place. Legacy tables (`quiz_answers`, old `career_recommendations`) are still present and still serving the old UI. This plan finishes the cutover.

---

## File Structure

| Path | Status | Purpose |
|---|---|---|
| `src/app/api/assessment/session/route.ts` | create | POST create + GET active session |
| `src/app/api/assessment/response/route.ts` | create | POST record response, advance, return next item or final result |
| `src/app/api/assessment/result/route.ts` | create | GET completed `AssessmentResult` for the user's latest session |
| `src/lib/assessment/serverSession.ts` | create | Server-side session helpers: load active, persist posterior, reconstruct from DB |
| `src/store/slices/assessmentSlice.ts` | create | Zustand slice — UI state for the adaptive flow |
| `src/store/slices/__tests__/assessmentSlice.test.ts` | create | Unit tests for the new slice |
| `src/store/appStore.ts` | modify | Swap `wouldYouRatherSlice` for `assessmentSlice` |
| `src/app/discover/preferences/page.tsx` | rewrite | Grade question → intro → adaptive loop → completion → profile link |
| `src/app/discover/preferences/_components/GradeQuestion.tsx` | create | First screen: optional grade selection |
| `src/app/discover/preferences/_components/IntroCard.tsx` | create | Second screen: "about 12–20 quick choices" intro |
| `src/app/discover/preferences/_components/OptionCard.tsx` | rewrite | Takes new `Option` type; same visual design |
| `src/app/discover/preferences/_components/ConfidenceMeter.tsx` | create | "Getting clearer" → "Almost there" → "Got it" |
| `src/app/discover/preferences/_components/PeekModal.tsx` | create | After item 8: "peek at your profile so far" |
| `src/app/discover/preferences/_components/InconsistencyModal.tsx` | create | Gentle "want to revisit any?" on inconsistent result |
| `src/app/discover/profile/page.tsx` | rewrite | Reads `AssessmentResult` from API; new sections |
| `src/app/discover/profile/_components/HollandCodeHero.tsx` | create | "You're an SAE" headline + 3 letter cards |
| `src/app/discover/profile/_components/RiasecRadarChart.tsx` | rewrite | Posterior means with shaded confidence bands |
| `src/app/discover/profile/_components/WorkValuesPills.tsx` | create | Top motivators pill list |
| `src/app/discover/profile/_components/WorkContextSliders.tsx` | create | Three bipolar sliders |
| `src/app/careers/actions.ts` | modify | Use `formatResultForPrompt`, write to `recommendation_runs` |
| `src/app/careers/page.tsx` | modify | Read careers via new FK (`recommendation_runs` → `career_recommendations`) |
| `src/db/schema.ts` | modify | Drop `quizAnswers`, rebuild `careerRecommendations` with `runId` + `rank` |
| `drizzle/migrations/<timestamp>_cutover.sql` | create | `DROP TABLE quiz_answers; DROP TABLE career_recommendations; CREATE TABLE career_recommendations (new shape)` |
| `src/app/_data/questions.ts` | delete | Legacy deck data |
| `src/store/slices/wouldYouRatherSlice.ts` | delete | Legacy slice |
| `src/store/slices/__tests__/wouldYouRatherSlice.test.ts` | delete | Legacy tests |
| `src/app/api/user/progress/route.ts` | delete | Legacy endpoint |
| `tests/db/quiz-answers-insert.test.ts` | delete | Legacy DB test |
| `e2e/fixtures/test-base.ts` | modify | Replace `quiz_answers` truncate; drop `seedZustandStore` use of old shape |
| `e2e/specs/assessment.spec.ts` | rewrite | End-to-end adaptive quiz happy path + resume |

---

## Task 1: POST /api/assessment/session — create a new session

**Files:**
- Create: `src/app/api/assessment/session/route.ts`
- Create: `src/lib/assessment/serverSession.ts`
- Test: `src/app/api/assessment/session/__tests__/route.test.ts`

**Context:** The endpoint creates an `assessment_sessions` row for the authenticated user with the given grade band (or null), initializes the posterior, picks the deterministic first item, and returns `{ sessionId, item, itemsAnswered: 0 }`. If an active session already exists, it is marked abandoned and replaced. The DB's partial unique index `assessment_sessions_one_active_per_user` prevents concurrent races.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/assessment/session/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}))

import { POST } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'

describe('POST /api/assessment/session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'middle' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a session and returns the first item', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })

    // Mock abandon-existing to no-op
    const setChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) }
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(setChain)

    const returningChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'sess-1' }]),
    }
    ;(db.insert as ReturnType<typeof vi.fn>).mockReturnValue(returningChain)

    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'middle' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sessionId).toBe('sess-1')
    expect(body.item).toBeDefined()
    expect(body.item.option1).toBeDefined()
    expect(body.itemsAnswered).toBe(0)
  })

  it('rejects unknown gradeBand values', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const req = new Request('http://x/api/assessment/session', {
      method: 'POST',
      body: JSON.stringify({ gradeBand: 'kindergarten' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/assessment/session/__tests__/route.test.ts`
Expected: FAIL — "Cannot find module '../route'"

- [ ] **Step 3: Implement the server-session helpers**

Create `src/lib/assessment/serverSession.ts`:

```ts
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { items } from '@/app/_data/items'
import {
  advance, AdvanceOutput, chooseFirstItem, ENGINE_VERSION, finalize,
  GradeBand, initialPosterior, Item, Posterior, ResponseChoice, startSession,
  Session,
} from '@/lib/assessment'

export const VALID_GRADE_BANDS: GradeBand[] = ['middle', 'early-hs', 'late-hs', 'college']
export function isGradeBand(x: unknown): x is GradeBand {
  return typeof x === 'string' && (VALID_GRADE_BANDS as string[]).includes(x)
}

export async function abandonActiveSessionsForUser(userId: string): Promise<void> {
  await db.update(assessmentSessions)
    .set({ abandonedAt: new Date() })
    .where(and(
      eq(assessmentSessions.userId, userId),
      isNull(assessmentSessions.completedAt),
      isNull(assessmentSessions.abandonedAt),
    ))
}

export async function createNewSession(
  userId: string, gradeBand: GradeBand | undefined,
): Promise<{ sessionId: string, firstItem: Item }> {
  const posterior = initialPosterior({ gradeBand })
  const engineSession = startSession({ bank: items, gradeBand })
  const firstItem = chooseFirstItem(items, engineSession)

  const [row] = await db.insert(assessmentSessions).values({
    userId,
    gradeBand: gradeBand ?? null,
    engineVersion: ENGINE_VERSION,
    posterior,
    inconsistency: false,
  }).returning({ id: assessmentSessions.id })

  await db.insert(assessmentResponses).values({
    sessionId: row.id,
    itemId: firstItem.id,
    position: 1,
  })

  return { sessionId: row.id, firstItem }
}

export async function loadActiveSession(userId: string): Promise<{
  sessionId: string
  posterior: Posterior
  gradeBand: GradeBand | undefined
  responses: Array<{ itemId: string, position: number, choice: ResponseChoice, responseMs: number | null, respondedAt: Date | null }>
} | null> {
  const [session] = await db.select().from(assessmentSessions).where(and(
    eq(assessmentSessions.userId, userId),
    isNull(assessmentSessions.completedAt),
    isNull(assessmentSessions.abandonedAt),
  )).limit(1)
  if (!session) return null

  const responses = await db.select().from(assessmentResponses)
    .where(eq(assessmentResponses.sessionId, session.id))
    .orderBy(assessmentResponses.position)

  return {
    sessionId: session.id,
    posterior: session.posterior as Posterior,
    gradeBand: (session.gradeBand ?? undefined) as GradeBand | undefined,
    responses: responses.map(r => ({
      itemId: r.itemId,
      position: r.position,
      choice: r.choice as ResponseChoice,
      responseMs: r.responseMs,
      respondedAt: r.respondedAt,
    })),
  }
}

export function rebuildSessionFromLog(args: {
  gradeBand: GradeBand | undefined
  responses: Array<{ itemId: string, choice: ResponseChoice, responseMs: number | null }>
}): { session: Session, lastAdvance: AdvanceOutput | null } {
  let session = startSession({ bank: items, gradeBand: args.gradeBand })
  let lastAdvance: AdvanceOutput | null = null
  for (const r of args.responses) {
    const item = items.find(i => i.id === r.itemId)
    if (!item) continue
    if (r.choice === null || r.choice === undefined) continue // un-answered shown rows ignored
    lastAdvance = advance({
      session, bank: items, shownItem: item,
      choice: r.choice, responseMs: r.responseMs ?? undefined,
    })
    session = lastAdvance.kind === 'next' ? lastAdvance.session : lastAdvance.session
  }
  return { session, lastAdvance }
}

export { finalize }
```

- [ ] **Step 4: Implement the POST handler**

Create `src/app/api/assessment/session/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import {
  abandonActiveSessionsForUser, createNewSession, isGradeBand,
} from '@/lib/assessment/serverSession'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const body = await request.json().catch(() => ({})) as { gradeBand?: unknown }
    const gradeBand = body.gradeBand === undefined || body.gradeBand === null
      ? undefined
      : (isGradeBand(body.gradeBand) ? body.gradeBand : '__invalid__')
    if (gradeBand === '__invalid__') {
      return NextResponse.json({ error: 'Invalid gradeBand' }, { status: 400 })
    }

    await abandonActiveSessionsForUser(session.user.id)
    const { sessionId, firstItem } = await createNewSession(session.user.id, gradeBand)

    return NextResponse.json({ sessionId, item: firstItem, itemsAnswered: 0 })
  }
  catch (err) {
    console.error('[api/assessment/session] POST failed:', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/app/api/assessment/session/__tests__/route.test.ts`
Expected: PASS — all three tests

- [ ] **Step 6: Commit**

```bash
git add src/app/api/assessment/session/route.ts src/lib/assessment/serverSession.ts src/app/api/assessment/session/__tests__/route.test.ts
git commit -m "feat(assessment): POST /api/assessment/session creates adaptive session"
```

---

## Task 2: GET /api/assessment/session — fetch active session for resume

**Files:**
- Modify: `src/app/api/assessment/session/route.ts` (add GET)
- Test: `src/app/api/assessment/session/__tests__/route.test.ts` (add GET tests)

**Context:** Resume flow needs the currently-active session state: its id, grade band, count of answered items, and the next item to show. If there is no active session, return `{ active: null }` so the UI can show the grade question fresh.

- [ ] **Step 1: Write the failing test**

Append to `src/app/api/assessment/session/__tests__/route.test.ts`:

```ts
import { GET } from '../route'

describe('GET /api/assessment/session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns { active: null } when no active session', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain)

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.active).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/assessment/session/__tests__/route.test.ts -t "GET"`
Expected: FAIL — "GET is not exported from '../route'"

- [ ] **Step 3: Implement GET**

Append to `src/app/api/assessment/session/route.ts`:

```ts
import { items } from '@/app/_data/items'
import { chooseFirstItem, startSession } from '@/lib/assessment'
import { loadActiveSession, rebuildSessionFromLog } from '@/lib/assessment/serverSession'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const active = await loadActiveSession(session.user.id)
    if (!active) {
      return NextResponse.json({ active: null })
    }

    // Reconstruct engine state from the response log so we can pick the next item deterministically.
    const answered = active.responses.filter(r => r.choice !== null && r.choice !== undefined)
    const answeredCount = answered.length

    if (answeredCount === 0) {
      // No answers yet — user is on the first item. Return the most recent unanswered item or the deterministic first.
      const unanswered = active.responses.find(r => r.choice === null || r.choice === undefined)
      const firstItem = unanswered
        ? items.find(i => i.id === unanswered.itemId) ?? chooseFirstItem(items, startSession({ bank: items, gradeBand: active.gradeBand }))
        : chooseFirstItem(items, startSession({ bank: items, gradeBand: active.gradeBand }))
      return NextResponse.json({
        active: {
          sessionId: active.sessionId,
          gradeBand: active.gradeBand ?? null,
          itemsAnswered: 0,
          item: firstItem,
        },
      })
    }

    const { lastAdvance } = rebuildSessionFromLog({
      gradeBand: active.gradeBand,
      responses: answered.map(a => ({ itemId: a.itemId, choice: a.choice, responseMs: a.responseMs })),
    })
    if (lastAdvance?.kind === 'stop') {
      // Session converged mid-reconstruction — finalize it lazily through /result on next request.
      // Here we just tell the client the item count; the client should call /result.
      return NextResponse.json({
        active: {
          sessionId: active.sessionId,
          gradeBand: active.gradeBand ?? null,
          itemsAnswered: answeredCount,
          item: null,
          stopped: true,
        },
      })
    }
    const nextItem = lastAdvance?.kind === 'next' ? lastAdvance.nextItem : null
    return NextResponse.json({
      active: {
        sessionId: active.sessionId,
        gradeBand: active.gradeBand ?? null,
        itemsAnswered: answeredCount,
        item: nextItem,
      },
    })
  }
  catch (err) {
    console.error('[api/assessment/session] GET failed:', err)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/api/assessment/session/__tests__/route.test.ts`
Expected: PASS — all session tests

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assessment/session/route.ts src/app/api/assessment/session/__tests__/route.test.ts
git commit -m "feat(assessment): GET /api/assessment/session for resume"
```

---

## Task 3: POST /api/assessment/response — record answer + return next item

**Files:**
- Create: `src/app/api/assessment/response/route.ts`
- Test: `src/app/api/assessment/response/__tests__/route.test.ts`

**Context:** Accepts `{ sessionId, itemId, choice, responseMs }` where `choice` is `1 | 2 | null` (null = skip). Writes the response row, rebuilds the engine session from the full response log, runs `advance(...)`, persists the updated posterior on `assessment_sessions`, and returns either `{ kind: 'next', item, itemsAnswered, posteriorSnapshot }` or `{ kind: 'stop', result }` where `result` is the finalized `AssessmentResult`. Guards: the provided `itemId` must match a response row for this session with a NULL choice; otherwise 409.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/assessment/response/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

import { POST } from '../route'
import { getSession } from '@/lib/auth/get-session'

describe('POST /api/assessment/response', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects invalid choice values', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const req = new Request('http://x/api/assessment/response', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's', itemId: 'i', choice: 3 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

(We deliberately keep the DB-path happy case as an integration test exercised via e2e in Task 21, because mocking the chained Drizzle calls for the full flow is lower-value than running it against Postgres.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/assessment/response/__tests__/route.test.ts`
Expected: FAIL — "Cannot find module '../route'"

- [ ] **Step 3: Implement the POST handler**

Create `src/app/api/assessment/response/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { items } from '@/app/_data/items'
import { advance, finalize, ResponseChoice } from '@/lib/assessment'
import { rebuildSessionFromLog } from '@/lib/assessment/serverSession'

type Body = { sessionId?: string, itemId?: string, choice?: number | null, responseMs?: number }

function isValidChoice(c: unknown): c is ResponseChoice {
  return c === 1 || c === 2 || c === null
}

export async function POST(request: Request) {
  try {
    const auth = await getSession()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const body = await request.json() as Body
    if (!body.sessionId || !body.itemId || !isValidChoice(body.choice ?? null)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const choice = (body.choice ?? null) as ResponseChoice

    // Verify session belongs to this user and is active
    const [sessionRow] = await db.select().from(assessmentSessions).where(and(
      eq(assessmentSessions.id, body.sessionId),
      eq(assessmentSessions.userId, auth.user.id),
      isNull(assessmentSessions.completedAt),
      isNull(assessmentSessions.abandonedAt),
    )).limit(1)
    if (!sessionRow) {
      return NextResponse.json({ error: 'Session not found or inactive' }, { status: 404 })
    }

    // Record the response against the outstanding row for this item in this session
    const [shownRow] = await db.select().from(assessmentResponses).where(and(
      eq(assessmentResponses.sessionId, body.sessionId),
      eq(assessmentResponses.itemId, body.itemId),
      isNull(assessmentResponses.choice),
    )).limit(1)
    if (!shownRow) {
      return NextResponse.json({ error: 'Item not outstanding in this session' }, { status: 409 })
    }
    await db.update(assessmentResponses)
      .set({ choice, respondedAt: new Date(), responseMs: body.responseMs ?? null })
      .where(eq(assessmentResponses.id, shownRow.id))

    // Load full response log and rebuild engine state
    const allRows = await db.select().from(assessmentResponses)
      .where(eq(assessmentResponses.sessionId, body.sessionId))
      .orderBy(assessmentResponses.position)
    const answered = allRows.filter(r => r.choice !== null && r.choice !== undefined)

    const { session: engineSession, lastAdvance } = rebuildSessionFromLog({
      gradeBand: (sessionRow.gradeBand ?? undefined) as Parameters<typeof rebuildSessionFromLog>[0]['gradeBand'],
      responses: answered.map(r => ({
        itemId: r.itemId, choice: r.choice as ResponseChoice, responseMs: r.responseMs,
      })),
    })

    if (!lastAdvance) {
      return NextResponse.json({ error: 'Engine rebuild failed' }, { status: 500 })
    }

    // Persist posterior
    await db.update(assessmentSessions)
      .set({ posterior: engineSession.posterior })
      .where(eq(assessmentSessions.id, body.sessionId))

    if (lastAdvance.kind === 'stop') {
      const result = finalize(engineSession)
      await db.update(assessmentSessions).set({
        completedAt: new Date(),
        result,
        inconsistency: result.meta.inconsistencyFlag,
      }).where(eq(assessmentSessions.id, body.sessionId))
      return NextResponse.json({ kind: 'stop', reason: lastAdvance.reason, result })
    }

    // Record the next item as shown (unanswered row) — position is answered-count + 1
    const nextPosition = allRows.length + 1
    await db.insert(assessmentResponses).values({
      sessionId: body.sessionId,
      itemId: lastAdvance.nextItem.id,
      position: nextPosition,
    })

    return NextResponse.json({
      kind: 'next',
      item: lastAdvance.nextItem,
      itemsAnswered: answered.length,
      posteriorSnapshot: engineSession.posterior,
    })
  }
  catch (err) {
    console.error('[api/assessment/response] POST failed:', err)
    return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/app/api/assessment/response/__tests__/route.test.ts`
Expected: PASS — both tests

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assessment/response/route.ts src/app/api/assessment/response/__tests__/route.test.ts
git commit -m "feat(assessment): POST /api/assessment/response advances session"
```

---

## Task 4: GET /api/assessment/result — fetch completed result

**Files:**
- Create: `src/app/api/assessment/result/route.ts`
- Test: `src/app/api/assessment/result/__tests__/route.test.ts`

**Context:** Returns the most-recently-completed `assessment_sessions.result` for the authenticated user, or `{ result: null }` if none exists. Used by the profile page on load.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/assessment/result/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}))

import { GET } from '../route'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'

describe('GET /api/assessment/result', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns { result: null } when no completed session', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.result).toBeNull()
  })

  it('returns the result blob when completed', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } })
    const mockResult = { hollandCode: 'SAE' }
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ result: mockResult }]),
    }
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain)
    const res = await GET()
    const body = await res.json()
    expect(body.result).toEqual(mockResult)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/assessment/result/__tests__/route.test.ts`
Expected: FAIL — module missing

- [ ] **Step 3: Implement GET**

Create `src/app/api/assessment/result/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { assessmentSessions } from '@/db/schema'
import { AssessmentResult } from '@/lib/assessment'

export async function GET() {
  try {
    const auth = await getSession()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const [row] = await db.select({ result: assessmentSessions.result })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.userId, auth.user.id),
        isNotNull(assessmentSessions.completedAt),
      ))
      .orderBy(desc(assessmentSessions.completedAt))
      .limit(1)

    return NextResponse.json({ result: (row?.result as AssessmentResult | undefined) ?? null })
  }
  catch (err) {
    console.error('[api/assessment/result] GET failed:', err)
    return NextResponse.json({ error: 'Failed to load result' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/api/assessment/result/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assessment/result/route.ts src/app/api/assessment/result/__tests__/route.test.ts
git commit -m "feat(assessment): GET /api/assessment/result returns completed profile"
```

---

## Task 5: Zustand `assessmentSlice`

**Files:**
- Create: `src/store/slices/assessmentSlice.ts`
- Create: `src/store/slices/__tests__/assessmentSlice.test.ts`

**Context:** New slice owns ephemeral UI state for the adaptive flow. Persistent state (posterior, responses) lives on the server; the slice only mirrors what the UI needs between renders. Fields:

- `phase: 'grade' | 'intro' | 'question' | 'complete' | 'loading'`
- `sessionId: string | null`
- `gradeBand: GradeBand | null`
- `currentItem: Item | null`
- `lastShownItem: Item | null` (for undo)
- `itemsAnswered: number`
- `posteriorSnapshot: Posterior | null` (for confidence meter / peek modal)
- `result: AssessmentResult | null`
- `inconsistencyDismissed: boolean`

Actions:
- `setPhase(phase)`
- `setGradeBand(band | null)`
- `startSession(sessionId, item)` — transitions to 'question'
- `receiveNext(item, itemsAnswered, posteriorSnapshot)` — swaps `currentItem` → `lastShownItem`
- `receiveStop(result)` — transitions to 'complete'
- `dismissInconsistency()`
- `reset()`

The slice does NOT fetch — the page component handles fetch/errors and calls slice actions.

- [ ] **Step 1: Write the failing test**

```ts
// src/store/slices/__tests__/assessmentSlice.test.ts
import { describe, it, expect } from 'vitest'
import { create } from 'zustand'
import { createAssessmentSlice, AssessmentState } from '../assessmentSlice'
import { items } from '@/app/_data/items'

function makeStore() {
  return create<AssessmentState>()((...a) => createAssessmentSlice(...a))
}

describe('assessmentSlice', () => {
  it('starts in grade phase', () => {
    const s = makeStore().getState()
    expect(s.phase).toBe('grade')
    expect(s.sessionId).toBeNull()
    expect(s.currentItem).toBeNull()
  })

  it('setGradeBand updates band and moves to intro', () => {
    const store = makeStore()
    store.getState().setGradeBand('middle')
    const s = store.getState()
    expect(s.gradeBand).toBe('middle')
    expect(s.phase).toBe('intro')
  })

  it('setGradeBand(null) (skip) still moves to intro', () => {
    const store = makeStore()
    store.getState().setGradeBand(null)
    expect(store.getState().phase).toBe('intro')
    expect(store.getState().gradeBand).toBeNull()
  })

  it('startSession transitions to question with current item', () => {
    const store = makeStore()
    const item = items[0]
    store.getState().startSession('sess-1', item)
    const s = store.getState()
    expect(s.phase).toBe('question')
    expect(s.sessionId).toBe('sess-1')
    expect(s.currentItem).toBe(item)
  })

  it('receiveNext swaps currentItem to lastShownItem', () => {
    const store = makeStore()
    store.getState().startSession('s', items[0])
    store.getState().receiveNext(items[1], 1, null)
    const s = store.getState()
    expect(s.lastShownItem).toBe(items[0])
    expect(s.currentItem).toBe(items[1])
    expect(s.itemsAnswered).toBe(1)
  })

  it('receiveStop transitions to complete with result', () => {
    const store = makeStore()
    const result = { hollandCode: 'SAE' } as unknown as AssessmentState['result']
    store.getState().receiveStop(result!)
    const s = store.getState()
    expect(s.phase).toBe('complete')
    expect(s.result).toEqual(result)
  })

  it('reset clears all state', () => {
    const store = makeStore()
    store.getState().setGradeBand('middle')
    store.getState().startSession('s', items[0])
    store.getState().reset()
    const s = store.getState()
    expect(s.phase).toBe('grade')
    expect(s.sessionId).toBeNull()
    expect(s.gradeBand).toBeNull()
    expect(s.currentItem).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/store/slices/__tests__/assessmentSlice.test.ts`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the slice**

Create `src/store/slices/assessmentSlice.ts`:

```ts
import { StateCreator } from 'zustand'
import { AssessmentResult, GradeBand, Item, Posterior } from '@/lib/assessment'

export type AssessmentPhase = 'grade' | 'intro' | 'question' | 'complete' | 'loading'

export interface AssessmentState {
  phase: AssessmentPhase
  sessionId: string | null
  gradeBand: GradeBand | null
  currentItem: Item | null
  lastShownItem: Item | null
  itemsAnswered: number
  posteriorSnapshot: Posterior | null
  result: AssessmentResult | null
  inconsistencyDismissed: boolean

  setPhase: (phase: AssessmentPhase) => void
  setGradeBand: (band: GradeBand | null) => void
  startSession: (sessionId: string, firstItem: Item) => void
  receiveNext: (item: Item, itemsAnswered: number, posteriorSnapshot: Posterior | null) => void
  receiveStop: (result: AssessmentResult) => void
  dismissInconsistency: () => void
  reset: () => void
}

const initial: Pick<
  AssessmentState,
  | 'phase' | 'sessionId' | 'gradeBand' | 'currentItem' | 'lastShownItem'
  | 'itemsAnswered' | 'posteriorSnapshot' | 'result' | 'inconsistencyDismissed'
> = {
  phase: 'grade',
  sessionId: null,
  gradeBand: null,
  currentItem: null,
  lastShownItem: null,
  itemsAnswered: 0,
  posteriorSnapshot: null,
  result: null,
  inconsistencyDismissed: false,
}

export const createAssessmentSlice: StateCreator<AssessmentState> = set => ({
  ...initial,
  setPhase: phase => set({ phase }),
  setGradeBand: band => set({ gradeBand: band, phase: 'intro' }),
  startSession: (sessionId, firstItem) => set({
    sessionId, currentItem: firstItem, lastShownItem: null,
    itemsAnswered: 0, phase: 'question',
  }),
  receiveNext: (item, itemsAnswered, posteriorSnapshot) => set(state => ({
    lastShownItem: state.currentItem,
    currentItem: item,
    itemsAnswered,
    posteriorSnapshot,
  })),
  receiveStop: result => set({ result, phase: 'complete', posteriorSnapshot: null }),
  dismissInconsistency: () => set({ inconsistencyDismissed: true }),
  reset: () => set({ ...initial }),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/store/slices/__tests__/assessmentSlice.test.ts`
Expected: PASS — all tests

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/assessmentSlice.ts src/store/slices/__tests__/assessmentSlice.test.ts
git commit -m "feat(store): add assessmentSlice for adaptive UI state"
```

---

## Task 6: Wire new slice into appStore (keep old slice in parallel for now)

**Files:**
- Modify: `src/store/appStore.ts`

**Context:** We add the new slice to the composed store alongside the old one so we can incrementally migrate the UI. The old `wouldYouRatherSlice` is deleted in Task 20.

- [ ] **Step 1: Add the new slice**

Replace `src/store/appStore.ts` with:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { createInterestsSlice, InterestsState } from './slices/interestsSlice'
import { createWouldYouRatherSlice, WouldYouRatherState } from './slices/wouldYouRatherSlice'
import { createAssessmentSlice, AssessmentState } from './slices/assessmentSlice'

export type AppState = InterestsState & WouldYouRatherState & AssessmentState

const withDevtools = process.env.NODE_ENV === 'development' ? devtools : ((fn: unknown) => fn) as typeof devtools

export const useAppStore = create<AppState>()(
  withDevtools(
    persist(
      (...a) => ({
        ...createInterestsSlice(...a),
        ...createWouldYouRatherSlice(...a),
        ...createAssessmentSlice(...a),
      }),
      {
        name: 'app-store',
        partialize: state => ({
          interests: state.interests,
          // Assessment state is intentionally NOT persisted — server is the source of truth.
          // The old wouldYouRatherSlice fields remain persisted until deleted in Task 20.
          currentQuestionIndex: state.currentQuestionIndex,
          answers: state.answers,
          skippedQuestions: Array.from(state.skippedQuestions),
        }),
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name)
            if (!str) return null
            const parsed = JSON.parse(str)
            if (parsed.state?.skippedQuestions && Array.isArray(parsed.state.skippedQuestions)) {
              parsed.state.skippedQuestions = new Set(parsed.state.skippedQuestions)
            }
            return parsed
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value))
          },
          removeItem: name => localStorage.removeItem(name),
        },
      },
    ),
  ),
)
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `pnpm vitest run src/store`
Expected: PASS — both old `wouldYouRatherSlice` tests and new `assessmentSlice` tests pass.

- [ ] **Step 3: Run lint and build to verify types**

Run: `pnpm lint && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/store/appStore.ts
git commit -m "feat(store): register assessmentSlice in appStore alongside legacy slice"
```

---

## Task 7: GradeQuestion component

**Files:**
- Create: `src/app/discover/preferences/_components/GradeQuestion.tsx`
- Create: `src/app/discover/preferences/_components/__tests__/GradeQuestion.test.tsx`

**Context:** First screen. Offers 6th–8th, 9th–10th, 11th–12th, College+, Prefer not to say. "Prefer not to say" and any of the four bands both call `onContinue(band | null)`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/discover/preferences/_components/__tests__/GradeQuestion.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GradeQuestion from '../GradeQuestion'

describe('GradeQuestion', () => {
  it('renders all five options', () => {
    render(<GradeQuestion onContinue={() => {}} />)
    expect(screen.getByRole('button', { name: /6th.*8th/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /9th.*10th/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /11th.*12th/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /College/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prefer not to say/ })).toBeInTheDocument()
  })

  it('calls onContinue("middle") for 6th-8th', () => {
    const fn = vi.fn()
    render(<GradeQuestion onContinue={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /6th.*8th/ }))
    expect(fn).toHaveBeenCalledWith('middle')
  })

  it('calls onContinue(null) for "Prefer not to say"', () => {
    const fn = vi.fn()
    render(<GradeQuestion onContinue={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Prefer not to say/ }))
    expect(fn).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/GradeQuestion.test.tsx`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the component**

Create `src/app/discover/preferences/_components/GradeQuestion.tsx`:

```tsx
'use client'
import { GradeBand } from '@/lib/assessment'

type Choice = { label: string, value: GradeBand | null }

const CHOICES: Choice[] = [
  { label: '6th–8th', value: 'middle' },
  { label: '9th–10th', value: 'early-hs' },
  { label: '11th–12th', value: 'late-hs' },
  { label: 'College+', value: 'college' },
  { label: 'Prefer not to say', value: null },
]

export default function GradeQuestion({ onContinue }: { onContinue: (band: GradeBand | null) => void }) {
  return (
    <div className="text-center pt-20 px-4">
      <h1 className="font-serif text-3xl text-foreground mb-3">What grade are you in?</h1>
      <p className="text-sm text-muted-foreground mb-8">This helps us tune your results.</p>
      <div className="flex flex-col gap-3 items-stretch max-w-xs mx-auto">
        {CHOICES.map(c => (
          <button
            key={c.label}
            onClick={() => onContinue(c.value)}
            className="px-6 py-3 rounded-full border border-border text-foreground hover:border-border-hover hover:text-primary-soft transition-all"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/GradeQuestion.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/preferences/_components/GradeQuestion.tsx src/app/discover/preferences/_components/__tests__/GradeQuestion.test.tsx
git commit -m "feat(quiz): GradeQuestion first-screen component"
```

---

## Task 8: IntroCard component

**Files:**
- Create: `src/app/discover/preferences/_components/IntroCard.tsx`
- Create: `src/app/discover/preferences/_components/__tests__/IntroCard.test.tsx`

**Context:** Second screen after grade. Shows: "About 12–20 quick choices. There are no wrong answers. You can skip any question." plus a "Let's go" button.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/discover/preferences/_components/__tests__/IntroCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import IntroCard from '../IntroCard'

describe('IntroCard', () => {
  it('shows the 12–20 choice copy', () => {
    render(<IntroCard onStart={() => {}} />)
    expect(screen.getByText(/12.*20/)).toBeInTheDocument()
  })

  it('calls onStart when the button is clicked', () => {
    const fn = vi.fn()
    render(<IntroCard onStart={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Let's go|Start/i }))
    expect(fn).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/IntroCard.test.tsx`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the component**

Create `src/app/discover/preferences/_components/IntroCard.tsx`:

```tsx
'use client'

export default function IntroCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center pt-20 px-4 max-w-md mx-auto">
      <h1 className="font-serif text-3xl text-foreground mb-4">Ready?</h1>
      <p className="text-base text-muted-foreground mb-3">
        About 12–20 quick choices. There are no wrong answers. You can skip any question, and you can pause anytime.
      </p>
      <button
        onClick={onStart}
        className="mt-6 px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)]"
      >
        Let's go →
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/IntroCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/preferences/_components/IntroCard.tsx src/app/discover/preferences/_components/__tests__/IntroCard.test.tsx
git commit -m "feat(quiz): IntroCard intro-screen component"
```

---

## Task 9: ConfidenceMeter component

**Files:**
- Create: `src/app/discover/preferences/_components/ConfidenceMeter.tsx`
- Create: `src/app/discover/preferences/_components/__tests__/ConfidenceMeter.test.tsx`

**Context:** Replaces the "X of 30" counter. Three stages based on `itemsAnswered`: 0–4 "Getting clearer", 5–9 "Almost there", 10+ "Got it — just a few more". Also renders a gradient bar filled proportionally to `itemsAnswered / 20`, capping at 100%.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/discover/preferences/_components/__tests__/ConfidenceMeter.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfidenceMeter from '../ConfidenceMeter'

describe('ConfidenceMeter', () => {
  it('shows "Getting clearer" at 0 items', () => {
    render(<ConfidenceMeter itemsAnswered={0} />)
    expect(screen.getByText(/Getting clearer/i)).toBeInTheDocument()
  })

  it('shows "Almost there" after 5 answered', () => {
    render(<ConfidenceMeter itemsAnswered={6} />)
    expect(screen.getByText(/Almost there/i)).toBeInTheDocument()
  })

  it('shows "Got it" after 10 answered', () => {
    render(<ConfidenceMeter itemsAnswered={12} />)
    expect(screen.getByText(/Got it/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/ConfidenceMeter.test.tsx`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the component**

Create `src/app/discover/preferences/_components/ConfidenceMeter.tsx`:

```tsx
'use client'
import { motion } from 'framer-motion'

function stageFor(itemsAnswered: number): string {
  if (itemsAnswered < 5) return 'Getting clearer'
  if (itemsAnswered < 10) return 'Almost there'
  return 'Got it — just a few more'
}

export default function ConfidenceMeter({ itemsAnswered }: { itemsAnswered: number }) {
  const pct = Math.min(100, (itemsAnswered / 20) * 100)
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="flex-1 h-1 rounded-full bg-primary/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_8px_rgba(124,58,237,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-text-dim whitespace-nowrap">{stageFor(itemsAnswered)}</span>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/ConfidenceMeter.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/preferences/_components/ConfidenceMeter.tsx src/app/discover/preferences/_components/__tests__/ConfidenceMeter.test.tsx
git commit -m "feat(quiz): ConfidenceMeter progress indicator"
```

---

## Task 10: Rewrite OptionCard for new Option type

**Files:**
- Rewrite: `src/app/discover/preferences/_components/OptionCard.tsx`

**Context:** The old component typed against `WouldYouRatherQuestionOption` (from the legacy slice). Rewrite to accept the new `Option` type from `@/lib/assessment/types`. The visual design is identical — only the import changes. Also drop the `text` body section since the new items carry `text` in a different place (but keep the footer heading).

- [ ] **Step 1: Rewrite the component**

Replace `src/app/discover/preferences/_components/OptionCard.tsx` with:

```tsx
'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Option } from '@/lib/assessment'

interface OptionCardProps {
  option: Option
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
          : 'border-border bg-surface/50 hover:border-border-hover hover:shadow-[0_0_40px_rgba(124,58,237,0.15)] focus-visible:border-primary/70 focus-visible:shadow-[0_0_40px_rgba(124,58,237,0.2)]'
      }`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <figure className="relative w-full">
        <Image
          src={option.imageUrl}
          alt={option.prompt}
          width={1024}
          height={1024}
          className="w-full h-auto block"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
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
      <div className="p-5 flex-none text-left">
        <h2 className="text-[15px] font-semibold text-foreground mb-1.5 leading-snug">
          {option.text}
        </h2>
      </div>
    </motion.button>
  )
}
```

- [ ] **Step 2: Run lint + build to verify types**

Run: `pnpm lint && pnpm build`
Expected: PASS — note: the legacy preferences/page.tsx still imports the old shape via the old slice; because both types happen to share the `{ id, text, imageUrl, prompt }` surface used here, the legacy page will keep rendering (compile check passes because `WouldYouRatherQuestionOption` has the same fields OptionCard uses). If build fails because of the `codes` field, keep the import but widen the prop type:

```ts
type OptionCardProps = {
  option: Pick<Option, 'id' | 'text' | 'imageUrl' | 'prompt'>
  ...
}
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/discover/preferences/_components/OptionCard.tsx
git commit -m "refactor(quiz): OptionCard typed against adaptive Option"
```

---

## Task 11: PeekModal component

**Files:**
- Create: `src/app/discover/preferences/_components/PeekModal.tsx`
- Create: `src/app/discover/preferences/_components/__tests__/PeekModal.test.tsx`

**Context:** Shown when the user taps the "peek" link after item 8. Renders a compact view of the current posterior snapshot (six RIASEC rows with mean bar + confidence badge). The user can close it and continue the quiz. Accepts `posterior: Posterior | null` (null → render loading state) and `onClose: () => void`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/discover/preferences/_components/__tests__/PeekModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PeekModal from '../PeekModal'
import { initialPosterior } from '@/lib/assessment'

describe('PeekModal', () => {
  it('renders all six RIASEC rows', () => {
    render(<PeekModal posterior={initialPosterior({})} onClose={() => {}} />)
    for (const code of ['R', 'I', 'A', 'S', 'E', 'C']) {
      expect(screen.getByText(new RegExp(`\\b${code}\\b`))).toBeInTheDocument()
    }
  })

  it('calls onClose when the close button is clicked', () => {
    const fn = vi.fn()
    render(<PeekModal posterior={initialPosterior({})} onClose={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Keep going|Close/i }))
    expect(fn).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/PeekModal.test.tsx`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the component**

Create `src/app/discover/preferences/_components/PeekModal.tsx`:

```tsx
'use client'
import { confidenceBand, Posterior, RIASEC_SCALES } from '@/lib/assessment'

const LABELS: Record<string, string> = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
}

export default function PeekModal({ posterior, onClose }: { posterior: Posterior | null, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[min(92vw,420px)] rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-serif text-xl text-foreground mb-1">Your profile so far</h2>
        <p className="text-xs text-muted-foreground mb-4">Still forming — keep answering for a sharper picture.</p>
        {posterior === null
          ? <p className="text-sm text-muted-foreground">Loading…</p>
          : (
            <ul className="space-y-2">
              {RIASEC_SCALES.map((code) => {
                const { mean, variance } = posterior.riasec[code]
                const pct = Math.max(0, Math.min(100, ((mean + 2) / 4) * 100))
                const band = confidenceBand(variance)
                return (
                  <li key={code} className="flex items-center gap-3">
                    <span className="w-4 text-xs font-semibold text-foreground">{code}</span>
                    <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">{LABELS[code]}</span>
                    <span className="w-24 h-1 bg-primary/10 rounded-full overflow-hidden">
                      <span className="block h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-12 text-right text-[10px] uppercase tracking-wider text-muted-foreground">{band}</span>
                  </li>
                )
              })}
            </ul>
          )}
        <button
          onClick={onClose}
          className="mt-6 w-full px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all"
        >
          Keep going →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/PeekModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/preferences/_components/PeekModal.tsx src/app/discover/preferences/_components/__tests__/PeekModal.test.tsx
git commit -m "feat(quiz): PeekModal preview of in-flight posterior"
```

---

## Task 12: InconsistencyModal component

**Files:**
- Create: `src/app/discover/preferences/_components/InconsistencyModal.tsx`
- Create: `src/app/discover/preferences/_components/__tests__/InconsistencyModal.test.tsx`

**Context:** Shown on completion if `result.meta.inconsistencyFlag === true` and the user hasn't dismissed it. Gentle copy: "A few answers seemed to pull in different directions. Want to revisit any before we wrap up?" Two actions: "Review answers" (triggers retake) or "See my results anyway".

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/discover/preferences/_components/__tests__/InconsistencyModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InconsistencyModal from '../InconsistencyModal'

describe('InconsistencyModal', () => {
  it('renders both actions', () => {
    render(<InconsistencyModal onDismiss={() => {}} onRetake={() => {}} />)
    expect(screen.getByRole('button', { name: /Review answers|Retake/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /See my results anyway|Continue/i })).toBeInTheDocument()
  })

  it('calls onDismiss on "continue" and onRetake on "retake"', () => {
    const dismiss = vi.fn()
    const retake = vi.fn()
    render(<InconsistencyModal onDismiss={dismiss} onRetake={retake} />)
    fireEvent.click(screen.getByRole('button', { name: /See my results anyway|Continue/i }))
    expect(dismiss).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Review answers|Retake/i }))
    expect(retake).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/InconsistencyModal.test.tsx`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the component**

Create `src/app/discover/preferences/_components/InconsistencyModal.tsx`:

```tsx
'use client'

export default function InconsistencyModal({
  onDismiss, onRetake,
}: { onDismiss: () => void, onRetake: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[min(92vw,420px)] rounded-2xl border border-border bg-surface p-6 text-center">
        <h2 className="font-serif text-xl text-foreground mb-2">Want to revisit a few?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          A few of your answers seemed to pull in different directions. That's OK — want to take another quick pass, or just see what we've got?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onRetake}
            className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold"
          >
            Review answers
          </button>
          <button
            onClick={onDismiss}
            className="px-6 py-2.5 rounded-full border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all text-sm"
          >
            See my results anyway
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/discover/preferences/_components/__tests__/InconsistencyModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/preferences/_components/InconsistencyModal.tsx src/app/discover/preferences/_components/__tests__/InconsistencyModal.test.tsx
git commit -m "feat(quiz): InconsistencyModal gentle revisit prompt"
```

---

## Task 13: Rewrite preferences/page.tsx — full adaptive flow

**Files:**
- Rewrite: `src/app/discover/preferences/page.tsx`

**Context:** The page orchestrates the full flow: grade → intro → adaptive loop → completion. It uses the `assessmentSlice` for UI state and calls the three `/api/assessment/*` routes. Skip is implemented by POSTing `choice: null`. The peek modal opens on a button that appears after `itemsAnswered >= 8`. On completion, the page shows the inconsistency modal if needed, then links to `/discover/profile`.

- [ ] **Step 1: Rewrite the page**

Replace `src/app/discover/preferences/page.tsx` with:

```tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAppStore } from '@/store/appStore'
import { useShallow } from 'zustand/react/shallow'
import OptionCard from './_components/OptionCard'
import GradeQuestion from './_components/GradeQuestion'
import IntroCard from './_components/IntroCard'
import ConfidenceMeter from './_components/ConfidenceMeter'
import PeekModal from './_components/PeekModal'
import InconsistencyModal from './_components/InconsistencyModal'
import { GradeBand, Item, Posterior, AssessmentResult } from '@/lib/assessment'

export default function PreferencesPage() {
  const {
    phase, sessionId, gradeBand, currentItem, itemsAnswered, posteriorSnapshot,
    result, inconsistencyDismissed,
    setPhase, setGradeBand, startSession, receiveNext, receiveStop,
    dismissInconsistency, reset,
  } = useAppStore(useShallow(s => ({
    phase: s.phase, sessionId: s.sessionId, gradeBand: s.gradeBand,
    currentItem: s.currentItem, itemsAnswered: s.itemsAnswered,
    posteriorSnapshot: s.posteriorSnapshot, result: s.result,
    inconsistencyDismissed: s.inconsistencyDismissed,
    setPhase: s.setPhase, setGradeBand: s.setGradeBand,
    startSession: s.startSession, receiveNext: s.receiveNext,
    receiveStop: s.receiveStop, dismissInconsistency: s.dismissInconsistency,
    reset: s.reset,
  })))

  const [selectedOption, setSelectedOption] = useState<1 | 2 | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [peekOpen, setPeekOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const shownAtRef = useRef<number>(Date.now())

  // Resume on first mount
  useEffect(() => {
    if (phase !== 'grade') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/assessment/session')
        const data = await res.json()
        if (cancelled) return
        if (data.active) {
          if (data.active.stopped) {
            const rRes = await fetch('/api/assessment/result')
            const rData = await rRes.json()
            if (rData.result) receiveStop(rData.result as AssessmentResult)
          }
          else if (data.active.item) {
            startSession(data.active.sessionId, data.active.item as Item)
            // Seed itemsAnswered for resume; receiveNext won't reach this without another fetch
            useAppStore.setState({ itemsAnswered: data.active.itemsAnswered })
          }
        }
      }
      catch (err) {
        console.error('[preferences] resume fetch failed:', err)
      }
    })()
    return () => { cancelled = true }
  }, [phase, receiveStop, startSession])

  const beginNewSession = useCallback(async (band: GradeBand | null) => {
    setPhase('loading')
    try {
      const res = await fetch('/api/assessment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeBand: band ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start session')
      startSession(data.sessionId, data.item as Item)
      shownAtRef.current = Date.now()
    }
    catch (err) {
      console.error('[preferences] start failed:', err)
      setPhase('intro')
    }
  }, [setPhase, startSession])

  const submitChoice = useCallback(async (choice: 1 | 2 | null) => {
    if (!sessionId || !currentItem || submitting) return
    setSubmitting(true)
    const responseMs = Date.now() - shownAtRef.current
    try {
      const res = await fetch('/api/assessment/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, itemId: currentItem.id, choice, responseMs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      if (data.kind === 'stop') {
        receiveStop(data.result as AssessmentResult)
      }
      else {
        receiveNext(data.item as Item, data.itemsAnswered, data.posteriorSnapshot as Posterior)
        shownAtRef.current = Date.now()
      }
    }
    catch (err) {
      console.error('[preferences] submit failed:', err)
    }
    finally {
      setSelectedOption(null)
      setShowCheckmark(false)
      setSubmitting(false)
    }
  }, [sessionId, currentItem, submitting, receiveNext, receiveStop])

  const handleOptionSelect = (option: 1 | 2) => {
    if (selectedOption !== null || submitting) return
    setSelectedOption(option)
    setShowCheckmark(true)
    setTimeout(() => submitChoice(option), 500)
  }

  const handleSkip = () => {
    if (selectedOption !== null || submitting) return
    submitChoice(null)
  }

  const handleRetake = async () => {
    reset()
    // Fresh session will start when the user picks a grade again
    setPhase('grade')
  }

  if (phase === 'grade') {
    return <GradeQuestion onContinue={(band) => { setGradeBand(band) }} />
  }
  if (phase === 'intro') {
    return <IntroCard onStart={() => beginNewSession(gradeBand)} />
  }
  if (phase === 'loading') {
    return <div className="text-center pt-24 text-muted-foreground">Starting…</div>
  }
  if (phase === 'complete' && result) {
    const showInconsistency = result.meta.inconsistencyFlag && !inconsistencyDismissed
    return (
      <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
        <div className="text-center pt-20">
          <h1 className="font-serif text-3xl text-foreground mb-4">Assessment Complete</h1>
          <p className="text-lg text-muted-foreground mb-10">
            Your Holland code:
            {' '}
            <strong className="text-foreground">{result.hollandCode}</strong>
          </p>
          <div className="flex flex-col gap-3 items-center">
            <Link href="/discover/profile" className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline">
              View Your Results
            </Link>
            <Link href="/careers" className="px-8 py-3 rounded-full border border-border text-primary-soft font-medium hover:border-border-hover transition-all no-underline">
              Explore Career Matches
            </Link>
            <button onClick={handleRetake} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
              Start Over
            </button>
          </div>
        </div>
        {showInconsistency && <InconsistencyModal onDismiss={dismissInconsistency} onRetake={handleRetake} />}
      </div>
    )
  }
  if (phase !== 'question' || !currentItem) return null

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      <ConfidenceMeter itemsAnswered={itemsAnswered} />

      <div className="text-center mb-8 mt-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Would you rather...</h1>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="relative max-w-3xl mx-auto">
            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-10 h-10 rounded-full bg-background/90 border border-border flex items-center justify-center font-serif text-sm italic text-muted-foreground shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                or
              </div>
            </div>
            <div className="block sm:hidden space-y-4">
              <OptionCard option={currentItem.option1} isSelected={selectedOption === 1} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(1)} />
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-background/90 border border-border flex items-center justify-center font-serif text-sm italic text-muted-foreground">or</div>
              </div>
              <OptionCard option={currentItem.option2} isSelected={selectedOption === 2} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(2)} />
            </div>
            <div className="hidden sm:grid grid-cols-2 gap-6">
              <OptionCard option={currentItem.option1} isSelected={selectedOption === 1} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(1)} />
              <OptionCard option={currentItem.option2} isSelected={selectedOption === 2} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(2)} />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center gap-3 mt-6 flex-wrap">
        {itemsAnswered >= 8 && (
          <button onClick={() => setPeekOpen(true)} className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all">
            Peek at profile
          </button>
        )}
        <button onClick={handleSkip} disabled={selectedOption !== null || submitting} className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all disabled:opacity-30">
          Skip →
        </button>
      </div>

      {peekOpen && <PeekModal posterior={posteriorSnapshot} onClose={() => setPeekOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Manual smoke check via dev server**

Run: `pnpm dev`
Then browse: `/discover/preferences`
Expected: grade screen → intro → first adaptive item renders. Picking an option advances. Skipping advances. After item 8, the "Peek at profile" button appears. Completing (or hitting 20-item cap) shows the completion screen.

(If it breaks, the problem is almost certainly one of: (a) DB env vars missing locally, (b) auth session missing — sign in first, (c) resume fetch returning stale `active` from a previous dev run — POST a fresh session.)

- [ ] **Step 3: Run tests and lint**

Run: `pnpm lint && pnpm vitest run`
Expected: PASS — all tests still pass; new page has no unit tests (covered by e2e in Task 21).

- [ ] **Step 4: Commit**

```bash
git add src/app/discover/preferences/page.tsx
git commit -m "feat(quiz): rewrite preferences page for adaptive flow"
```

---

## Task 14: HollandCodeHero component

**Files:**
- Create: `src/app/discover/profile/_components/HollandCodeHero.tsx`
- Create: `src/app/discover/profile/_components/__tests__/HollandCodeHero.test.tsx`

**Context:** Renders "You're an SAE" plus three stacked letter cards. Each card shows the letter, the full name (Social/Artistic/Enterprising), the rank, and the confidence band as a small pill. Uses existing `RIASEC_THEME` colors from `src/app/_data/riasecTheme.ts`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/discover/profile/_components/__tests__/HollandCodeHero.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HollandCodeHero from '../HollandCodeHero'
import type { AssessmentResult } from '@/lib/assessment'

const mockResult: AssessmentResult = {
  hollandCode: 'SAE',
  riasec: {
    R: { score: 10, rank: 6, confidence: 'low' },
    I: { score: 30, rank: 4, confidence: 'medium' },
    A: { score: 60, rank: 2, confidence: 'high' },
    S: { score: 75, rank: 1, confidence: 'high' },
    E: { score: 50, rank: 3, confidence: 'medium' },
    C: { score: 20, rank: 5, confidence: 'low' },
  },
  workValues: { top: [], all: {} as never },
  workContext: {} as never,
  meta: { itemsAnswered: 14, itemsSkipped: 0, completedAt: '', engineVersion: 'v1.0.0', inconsistencyFlag: false },
}

describe('HollandCodeHero', () => {
  it('renders the full Holland code', () => {
    render(<HollandCodeHero result={mockResult} />)
    expect(screen.getByText(/SAE/)).toBeInTheDocument()
  })

  it('renders the three top letter full names', () => {
    render(<HollandCodeHero result={mockResult} />)
    expect(screen.getByText('Social')).toBeInTheDocument()
    expect(screen.getByText('Artistic')).toBeInTheDocument()
    expect(screen.getByText('Enterprising')).toBeInTheDocument()
  })

  it('renders confidence bands for the top three', () => {
    const { container } = render(<HollandCodeHero result={mockResult} />)
    const badges = container.querySelectorAll('[data-testid="confidence-badge"]')
    expect(badges.length).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/discover/profile/_components/__tests__/HollandCodeHero.test.tsx`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the component**

Create `src/app/discover/profile/_components/HollandCodeHero.tsx`:

```tsx
import type { AssessmentResult, RiasecScale } from '@/lib/assessment'
import { RIASEC_THEME } from '@/app/_data/riasecTheme'

export default function HollandCodeHero({ result }: { result: AssessmentResult }) {
  const letters = result.hollandCode.split('') as RiasecScale[]
  return (
    <section className="text-center mb-10">
      <div className="text-xs text-muted-foreground uppercase tracking-[2px] mb-2">Your Holland Code</div>
      <h1 className="font-serif text-5xl sm:text-6xl text-foreground mb-6">{result.hollandCode}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {letters.map((code, i) => {
          const theme = RIASEC_THEME[code]
          const r = result.riasec[code]
          return (
            <div
              key={code}
              className="rounded-2xl border border-border bg-surface/60 p-4 flex flex-col items-center"
            >
              <div
                className="text-4xl font-serif mb-1"
                style={{ color: theme?.colorHex ?? 'inherit' }}
              >
                {code}
              </div>
              <div className="text-sm font-semibold text-foreground">{theme?.label ?? code}</div>
              <div className="text-xs text-muted-foreground">Rank #{i + 1}</div>
              <div
                data-testid="confidence-badge"
                className="mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground"
              >
                {r.confidence}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/discover/profile/_components/__tests__/HollandCodeHero.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/profile/_components/HollandCodeHero.tsx src/app/discover/profile/_components/__tests__/HollandCodeHero.test.tsx
git commit -m "feat(profile): HollandCodeHero headline component"
```

---

## Task 15: Rewrite RiasecRadarChart with confidence bands

**Files:**
- Rewrite: `src/app/discover/profile/_components/RiasecRadarChart.tsx`

**Context:** The current chart takes `Record<string, number>`; the new one takes the per-scale posterior (mean + variance) plus a `confidence` band. We render two polygons: an inner "low edge" (mean − 1 SD) and outer "high edge" (mean + 1 SD) as a translucent band, with the point polygon on top. Axis labels stay the same.

- [ ] **Step 1: Rewrite the component**

Replace `src/app/discover/profile/_components/RiasecRadarChart.tsx` with:

```tsx
import { RIASEC_AXIS_ORDER, RIASEC_THEME } from '@/app/_data/riasecTheme'
import type { AssessmentResult, RiasecScale } from '@/lib/assessment'

interface Props {
  riasec: AssessmentResult['riasec']
}

const CHART_SIZE = 320
const CENTER = CHART_SIZE / 2
const RADIUS = 110
const LABEL_RADIUS = RADIUS + 22

// Scores are 0..100. Variance to SD mapped onto the same 0..100 band roughly by multiplying by 25 (engine's score scale factor).
const VAR_TO_SCORE_SD = 25

function pointFor(value: number, angle: number): [number, number] {
  const r = (value / 100) * RADIUS
  return [Math.cos(angle) * r, Math.sin(angle) * r]
}
function angleFor(i: number) {
  return (Math.PI * 2 * i) / RIASEC_AXIS_ORDER.length - Math.PI / 2
}

export function RiasecRadarChart({ riasec }: Props) {
  const topCodes = new Set(
    RIASEC_AXIS_ORDER
      .map(code => ({ code, rank: riasec[code as RiasecScale].rank }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map(x => x.code),
  )

  const meanPoly = RIASEC_AXIS_ORDER.map((code, i) => pointFor(riasec[code as RiasecScale].score, angleFor(i)))
    .map(p => `${p[0]},${p[1]}`)
    .join(' ')

  const highPoly = RIASEC_AXIS_ORDER.map((code, i) => {
    const s = riasec[code as RiasecScale]
    // Approximate SD from variance by sqrt, scaled.
    const sd = Math.sqrt(riasecVariance(s.confidence)) * VAR_TO_SCORE_SD
    return pointFor(Math.min(100, s.score + sd), angleFor(i))
  }).map(p => `${p[0]},${p[1]}`).join(' ')

  const lowPoly = RIASEC_AXIS_ORDER.map((code, i) => {
    const s = riasec[code as RiasecScale]
    const sd = Math.sqrt(riasecVariance(s.confidence)) * VAR_TO_SCORE_SD
    return pointFor(Math.max(0, s.score - sd), angleFor(i))
  }).map(p => `${p[0]},${p[1]}`).join(' ')

  const gridRings = [0.33, 0.67, 1].map(scale =>
    RIASEC_AXIS_ORDER.map((_, i) => {
      const a = angleFor(i)
      return `${Math.cos(a) * RADIUS * scale},${Math.sin(a) * RADIUS * scale}`
    }).join(' '),
  )

  return (
    <div className="p-6 rounded-2xl border border-border bg-surface/60">
      <h2 className="font-serif text-lg text-foreground text-center mb-1">Interest Profile</h2>
      <p className="text-xs text-muted-foreground text-center mb-4">Shaded bands show confidence</p>
      <svg
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        className="w-full max-w-[340px] mx-auto block"
        overflow="visible"
        role="img"
        aria-label="RIASEC radar chart with confidence bands"
      >
        <defs>
          <radialGradient id="riasec-radar-fill">
            <stop offset="0%" stopColor="rgba(124,58,237,0.5)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0.15)" />
          </radialGradient>
        </defs>
        <g transform={`translate(${CENTER},${CENTER})`}>
          {gridRings.map((pts, i) => (
            <polygon key={i} points={pts} fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth={1} />
          ))}
          {RIASEC_AXIS_ORDER.map((_, i) => {
            const a = angleFor(i)
            return (
              <line
                key={i}
                x1={0} y1={0}
                x2={Math.cos(a) * RADIUS} y2={Math.sin(a) * RADIUS}
                stroke="rgba(139,92,246,0.12)" strokeWidth={1}
              />
            )
          })}
          {/* Confidence band: high outer, low inner, with even-odd fill to create the ring */}
          <path
            d={`M ${highPoly.replace(/ /g, ' L ')} Z M ${lowPoly.replace(/ /g, ' L ')} Z`}
            fill="rgba(124,58,237,0.15)"
            fillRule="evenodd"
          />
          <polygon points={meanPoly} fill="url(#riasec-radar-fill)" stroke="#7c3aed" strokeWidth={2} />
          {RIASEC_AXIS_ORDER.map((code, i) => {
            const theme = RIASEC_THEME[code]
            const a = angleFor(i)
            const [x, y] = pointFor(riasec[code as RiasecScale].score, a)
            return (
              <circle
                key={code}
                cx={x} cy={y}
                r={topCodes.has(code) ? 5 : 4}
                fill={theme?.colorHex ?? '#7c3aed'}
                stroke="#0a0a1a" strokeWidth={2}
              />
            )
          })}
          {RIASEC_AXIS_ORDER.map((code, i) => {
            const theme = RIASEC_THEME[code]
            const a = angleFor(i)
            const x = Math.cos(a) * LABEL_RADIUS
            const y = Math.sin(a) * LABEL_RADIUS
            const anchor = Math.abs(x) < 1 ? 'middle' : x > 0 ? 'start' : 'end'
            const highlighted = topCodes.has(code)
            return (
              <text
                key={code}
                x={x} y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={highlighted ? 700 : 500}
                fill={highlighted ? theme?.colorHex ?? '#c4b5fd' : '#9f99be'}
              >
                {theme?.label ?? code}
              </text>
            )
          })}
        </g>
      </svg>
      <ul className="sr-only">
        {RIASEC_AXIS_ORDER.map((code) => {
          const theme = RIASEC_THEME[code]
          const s = riasec[code as RiasecScale]
          return (
            <li key={code}>
              {theme?.label ?? code}
              : score {s.score}, confidence {s.confidence}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Approximate the variance that corresponds to a confidence band, for rendering only.
function riasecVariance(confidence: 'high' | 'medium' | 'low'): number {
  if (confidence === 'high') return 0.15
  if (confidence === 'medium') return 0.35
  return 0.7
}
```

- [ ] **Step 2: Run lint + build**

Run: `pnpm lint && pnpm build`
Expected: PASS — this breaks existing callers in `profile/page.tsx`, which is rewritten in Task 18. Until then, the build will fail. Skip this step if the build breaks and move on; Task 18 fixes it.

- [ ] **Step 3: Commit**

```bash
git add src/app/discover/profile/_components/RiasecRadarChart.tsx
git commit -m "refactor(profile): RiasecRadarChart renders confidence bands"
```

---

## Task 16: WorkValuesPills component

**Files:**
- Create: `src/app/discover/profile/_components/WorkValuesPills.tsx`
- Create: `src/app/discover/profile/_components/__tests__/WorkValuesPills.test.tsx`

**Context:** Renders `result.workValues.top` as a pill list. Each pill shows the full name and the confidence band. If `result.workValues.suppressed` is true, render a single muted line instead: "Work values are tentative at your age."

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/discover/profile/_components/__tests__/WorkValuesPills.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WorkValuesPills from '../WorkValuesPills'
import type { AssessmentResult } from '@/lib/assessment'

function buildResult(partial: Partial<AssessmentResult['workValues']>): AssessmentResult {
  return {
    hollandCode: 'SAE',
    riasec: {} as never,
    workValues: {
      top: ['REL', 'ACH'],
      all: {
        ACH: { score: 70, confidence: 'medium' },
        IND: { score: 20, confidence: 'low' },
        REC: { score: 10, confidence: 'low' },
        REL: { score: 90, confidence: 'high' },
        SUP: { score: 40, confidence: 'low' },
        WC: { score: 30, confidence: 'low' },
      },
      ...partial,
    },
    workContext: {} as never,
    meta: { itemsAnswered: 14, itemsSkipped: 0, completedAt: '', engineVersion: 'v1.0.0', inconsistencyFlag: false },
  }
}

describe('WorkValuesPills', () => {
  it('renders top values with full names', () => {
    render(<WorkValuesPills result={buildResult({})} />)
    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(screen.getByText('Achievement')).toBeInTheDocument()
  })

  it('renders a suppressed message when flagged', () => {
    render(<WorkValuesPills result={buildResult({ suppressed: true, top: [] })} />)
    expect(screen.getByText(/tentative/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/discover/profile/_components/__tests__/WorkValuesPills.test.tsx`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the component**

Create `src/app/discover/profile/_components/WorkValuesPills.tsx`:

```tsx
import type { AssessmentResult, WorkValueScale } from '@/lib/assessment'

const LABELS: Record<WorkValueScale, string> = {
  ACH: 'Achievement', IND: 'Independence', REC: 'Recognition',
  REL: 'Relationships', SUP: 'Support', WC: 'Working Conditions',
}

export default function WorkValuesPills({ result }: { result: AssessmentResult }) {
  if (result.workValues.suppressed) {
    return (
      <section className="mb-10">
        <h2 className="font-serif text-lg text-foreground mb-2">What You Value</h2>
        <p className="text-sm text-muted-foreground">
          Work values are tentative at your age — they tend to change a lot. We'll check in again later.
        </p>
      </section>
    )
  }
  if (result.workValues.top.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="font-serif text-lg text-foreground mb-2">What You Value</h2>
        <p className="text-sm text-muted-foreground">No clear standout values yet.</p>
      </section>
    )
  }
  return (
    <section className="mb-10">
      <h2 className="font-serif text-lg text-foreground mb-1">What You Value</h2>
      <p className="text-xs text-muted-foreground mb-4">Top motivators</p>
      <div className="flex flex-wrap gap-2">
        {result.workValues.top.map((code) => {
          const entry = result.workValues.all[code]
          return (
            <span
              key={code}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface/60 text-sm text-foreground"
            >
              <span>{LABELS[code]}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{entry.confidence}</span>
            </span>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/discover/profile/_components/__tests__/WorkValuesPills.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/profile/_components/WorkValuesPills.tsx src/app/discover/profile/_components/__tests__/WorkValuesPills.test.tsx
git commit -m "feat(profile): WorkValuesPills top-motivators component"
```

---

## Task 17: WorkContextSliders component

**Files:**
- Create: `src/app/discover/profile/_components/WorkContextSliders.tsx`
- Create: `src/app/discover/profile/_components/__tests__/WorkContextSliders.test.tsx`

**Context:** Three bipolar sliders. Each axis is a horizontal bar with left label, right label, and a marker at a position derived from `strength` (−1..+1 mapped to 0..100%). Also show the confidence band. If `lean === 'balanced' | 'mixed' | 'flexible'`, render the marker at 50% with a "balanced" note.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/discover/profile/_components/__tests__/WorkContextSliders.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WorkContextSliders from '../WorkContextSliders'
import type { AssessmentResult } from '@/lib/assessment'

function buildResult(ctx: AssessmentResult['workContext']): AssessmentResult {
  return {
    hollandCode: 'SAE',
    riasec: {} as never,
    workValues: { top: [], all: {} as never },
    workContext: ctx,
    meta: { itemsAnswered: 14, itemsSkipped: 0, completedAt: '', engineVersion: 'v1.0.0', inconsistencyFlag: false },
  }
}

describe('WorkContextSliders', () => {
  it('renders all three axes with endpoint labels', () => {
    render(<WorkContextSliders result={buildResult({
      structureVariety: { lean: 'variety', strength: 0.8, confidence: 'high' },
      indoorOutdoor: { lean: 'mixed', strength: 0.1, confidence: 'low' },
      soloTeam: { lean: 'team', strength: 0.6, confidence: 'medium' },
    })} />)
    expect(screen.getByText(/Structure/)).toBeInTheDocument()
    expect(screen.getByText(/Variety/)).toBeInTheDocument()
    expect(screen.getByText(/Indoor/)).toBeInTheDocument()
    expect(screen.getByText(/Outdoor/)).toBeInTheDocument()
    expect(screen.getByText(/Solo/)).toBeInTheDocument()
    expect(screen.getByText(/Team/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/discover/profile/_components/__tests__/WorkContextSliders.test.tsx`
Expected: FAIL — module missing

- [ ] **Step 3: Implement the component**

Create `src/app/discover/profile/_components/WorkContextSliders.tsx`:

```tsx
import type { AssessmentResult } from '@/lib/assessment'

type Axis = {
  key: keyof AssessmentResult['workContext']
  leftLabel: string
  rightLabel: string
  leftLeans: string[]
  rightLeans: string[]
}

const AXES: Axis[] = [
  { key: 'structureVariety', leftLabel: 'Structure', rightLabel: 'Variety', leftLeans: ['structure'], rightLeans: ['variety'] },
  { key: 'indoorOutdoor', leftLabel: 'Indoor', rightLabel: 'Outdoor', leftLeans: ['indoor'], rightLeans: ['outdoor'] },
  { key: 'soloTeam', leftLabel: 'Solo', rightLabel: 'Team', leftLeans: ['solo'], rightLeans: ['team'] },
]

function pctFor(lean: string, strength: number, leftLeans: string[]): number {
  if (leftLeans.includes(lean)) return 50 - strength * 50
  if (lean === 'balanced' || lean === 'mixed' || lean === 'flexible') return 50
  return 50 + strength * 50
}

export default function WorkContextSliders({ result }: { result: AssessmentResult }) {
  return (
    <section className="mb-10">
      <h2 className="font-serif text-lg text-foreground mb-4">Your Work Style</h2>
      <div className="space-y-5">
        {AXES.map((axis) => {
          const v = result.workContext[axis.key]
          const pct = pctFor(v.lean, v.strength, axis.leftLeans)
          return (
            <div key={axis.key}>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{axis.leftLabel}</span>
                <span className="uppercase tracking-wider text-[10px]">{v.confidence}</span>
                <span>{axis.rightLabel}</span>
              </div>
              <div className="relative h-1 rounded-full bg-primary/10">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-primary to-secondary shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                  style={{ left: `calc(${pct}% - 6px)` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/discover/profile/_components/__tests__/WorkContextSliders.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/profile/_components/WorkContextSliders.tsx src/app/discover/profile/_components/__tests__/WorkContextSliders.test.tsx
git commit -m "feat(profile): WorkContextSliders three bipolar sliders"
```

---

## Task 18: Rewrite profile/page.tsx

**Files:**
- Rewrite: `src/app/discover/profile/page.tsx`

**Context:** Fetch the latest completed `AssessmentResult` from `/api/assessment/result`. If none, show the "no results yet" empty state with a link to start. If present, render `HollandCodeHero`, then the new `RiasecRadarChart`, then `WorkValuesPills`, then `WorkContextSliders`. Retake and "Explore Careers" CTAs at the bottom. Delete the uses of `getDeckResults`, `profileImages`, `TraitHeroCard`, and `IllustratedTraitCard` from this page; leave the component files in place for now (deleted in Task 20 if no other callers).

- [ ] **Step 1: Rewrite the page**

Replace `src/app/discover/profile/page.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HollandCodeHero from './_components/HollandCodeHero'
import { RiasecRadarChart } from './_components/RiasecRadarChart'
import WorkValuesPills from './_components/WorkValuesPills'
import WorkContextSliders from './_components/WorkContextSliders'
import type { AssessmentResult } from '@/lib/assessment'

export default function ProfilePage() {
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/assessment/result')
        const data = await res.json()
        if (!cancelled) setResult(data.result as AssessmentResult | null)
      }
      catch (err) {
        console.error('[profile] fetch result failed:', err)
      }
      finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="text-center pt-24 text-muted-foreground">Loading…</div>
  }

  if (!result) {
    return (
      <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="font-serif text-2xl text-foreground mb-3">No Results Yet</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Complete the assessment to discover your career interests.
          </p>
          <Link
            href="/discover/preferences"
            className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline"
          >
            Start the Assessment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      <HollandCodeHero result={result} />
      <RiasecRadarChart riasec={result.riasec} />
      <div className="mt-10" />
      <WorkValuesPills result={result} />
      <WorkContextSliders result={result} />
      <div className="flex justify-center gap-4 mt-8">
        <Link
          href="/discover/preferences"
          className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm"
        >
          Retake Assessment
        </Link>
        <Link
          href="/careers"
          className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline"
        >
          Explore Careers →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run build + lint**

Run: `pnpm lint && pnpm build`
Expected: PASS. `TraitHeroCard` and `IllustratedTraitCard` are orphaned but still compile.

- [ ] **Step 3: Commit**

```bash
git add src/app/discover/profile/page.tsx
git commit -m "feat(profile): rewrite profile page for AssessmentResult"
```

---

## Task 19: Schema cutover — drop quiz_answers, rebuild career_recommendations

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/migrations/<timestamp>_cutover.sql`

**Context:** The spec locks in "no migration of historical data — existing tables are dropped." We drop `quiz_answers` outright. `career_recommendations` gets rebuilt with a `runId` FK to `recommendation_runs`, `rank smallint`, and everything else per spec. Because `careers/actions.ts` still reads the old shape, we do this before (Task 20) updating actions.ts, and we keep the old table shape reachable via Drizzle for the handful of minutes between these commits — or simpler, we do both schema and actions.ts in this single task. That's the approach below.

- [ ] **Step 1: Update schema.ts**

Edit `src/db/schema.ts`:
- Remove the `quizAnswers` export entirely.
- Replace the existing `careerRecommendations` export with:

```ts
export const careerRecommendations = pgTable('career_recommendations', {
  id: uuid().primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull()
    .references(() => recommendationRuns.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  rank: smallint().notNull(),
  onetId: text('onet_id').notNull(),
  title: text().notNull(),
  description: text().notNull(),
  whyItMatches: text('why_it_matches').notNull(),
  jobGrowth: text('job_growth'),
  salaryRange: text('salary_range'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  index('career_recommendations_user_run_idx').on(t.userId, t.runId),
])
```

(Note: the old version had `onetId`, `title`, `description`, `whyItMatches`, `jobGrowth`, `salaryRange` all `notNull` without `runId`. The new version adds `runId` + `rank` and makes `jobGrowth`/`salaryRange` nullable per spec.)

- [ ] **Step 2: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: A new `drizzle/migrations/<timestamp>_<name>.sql` file that contains (roughly):
```sql
DROP TABLE "quiz_answers";
ALTER TABLE "career_recommendations" ... -- drizzle may prefer DROP+CREATE for the shape change
```

If drizzle-kit produces an `ALTER`-only migration that conflicts with existing data, manually replace its content with:

```sql
DROP TABLE IF EXISTS "quiz_answers";
DROP TABLE IF EXISTS "career_recommendations";

CREATE TABLE "career_recommendations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id" uuid NOT NULL REFERENCES "recommendation_runs"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "rank" smallint NOT NULL,
  "onet_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "why_it_matches" text NOT NULL,
  "job_growth" text,
  "salary_range" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "career_recommendations_user_run_idx" ON "career_recommendations" ("user_id", "run_id");
```

- [ ] **Step 3: Push the migration**

Run: `npx drizzle-kit push`
Expected: "Changes applied" or similar.

- [ ] **Step 4: Verify schema against DB**

Run: `npx drizzle-kit push --verbose` (or inspect via Drizzle Studio)
Expected: No drift reported.

- [ ] **Step 5: Run build to verify nothing references the dropped quizAnswers**

Run: `pnpm build`
Expected: FAIL — at least `src/app/api/user/progress/route.ts` imports `quizAnswers`. That's fine: Task 20 deletes it. For now:

- Temporarily delete `src/app/api/user/progress/route.ts`:
  ```bash
  git rm src/app/api/user/progress/route.ts
  ```

- Run: `pnpm build`
- Expected: FAIL on `src/app/careers/actions.ts` because it writes the old `careerRecommendations` shape. Proceed to Step 6.

- [ ] **Step 6: Commit schema cutover (build still broken)**

```bash
git add src/db/schema.ts drizzle/migrations/ src/app/api/user/progress/route.ts
git commit -m "feat(db): cutover — drop quiz_answers, rebuild career_recommendations

Build is intentionally red between this commit and the next: careers/actions.ts
still writes the old shape and is rewritten in the following commit."
```

---

## Task 20: Update careers/actions.ts and careers/page.tsx for new pipeline

**Files:**
- Modify: `src/app/careers/actions.ts`
- Modify: `src/app/careers/page.tsx`

**Context:** `actions.ts` now: (1) fetches the user's latest `AssessmentResult` (either via `/api/assessment/result` or by querying `assessmentSessions` directly — we query directly since this is server code), (2) builds the prompt via `formatResultForPrompt(result)`, (3) inserts a `recommendation_runs` row with the prompt + interests snapshot, (4) inserts `career_recommendations` rows with a rank index + the new `runId` FK. `careers/page.tsx` fetches the most recent run's careers.

- [ ] **Step 1: Rewrite actions.ts**

Replace `src/app/careers/actions.ts` with:

```ts
'use server'

import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { assessmentSessions, careerRecommendations, recommendationRuns } from '@/db/schema'
import { CareerRecommendation, CareersResponseSchema } from '@/lib/schemas/career'
import { AssessmentResult, ENGINE_VERSION, formatResultForPrompt } from '@/lib/assessment'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const MAX_INTEREST_LENGTH = 64
const MAX_INTERESTS = 30
const MODEL_ID = 'gpt-4o'

function sanitizeInterestsForPrompt(rawInterests: string[]): string[] {
  return rawInterests
    .slice(0, MAX_INTERESTS)
    .map(interest =>
      interest
        .replace(/[\x00-\x1f\x7f-\x9f]/g, ' ')
        .replace(/[`<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_INTEREST_LENGTH),
    )
    .filter(interest => interest.length > 0)
}

export async function generateCareerRecommendationsAction(
  interests: string[],
): Promise<{ success: boolean, careers?: CareerRecommendation[], error?: string }> {
  const startedAt = Date.now()
  try {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Authentication required' }
    const user = session.user

    const [latest] = await db.select().from(assessmentSessions).where(and(
      eq(assessmentSessions.userId, user.id),
      isNotNull(assessmentSessions.completedAt),
    )).orderBy(desc(assessmentSessions.completedAt)).limit(1)
    if (!latest?.result) {
      return { success: false, error: 'Complete the assessment before requesting careers' }
    }

    const cleanInterests = sanitizeInterestsForPrompt(interests)
    const profile = formatResultForPrompt(latest.result as AssessmentResult)
    const prompt = `
${profile}

Selected Interests:
${cleanInterests.join(', ')}

Suggest 10 career paths that match the profile above. For each, return:
- title, description, onetId, whyItMatches, jobGrowth, salaryRange.
Respond as a JSON array.
    `.trim()

    const result = await generateObject({
      model: openai.chat(MODEL_ID),
      system: `You are a career counselor. Use the Holland code, confidence bands, work values, and work context to recommend careers that fit. Hedge explicitly when any scale is low confidence.`,
      prompt,
      schema: CareersResponseSchema,
    })
    if (!result) throw new Error('No response from OpenAI')

    const [run] = await db.insert(recommendationRuns).values({
      userId: user.id,
      sessionId: latest.id,
      interestsSnapshot: cleanInterests,
      prompt,
      model: MODEL_ID,
      engineVersion: ENGINE_VERSION,
      durationMs: Date.now() - startedAt,
    }).returning({ id: recommendationRuns.id })

    await db.insert(careerRecommendations).values(
      result.object.careers.map((c, i) => ({
        runId: run.id,
        userId: user.id,
        rank: i + 1,
        onetId: c.onetId,
        title: c.title,
        description: c.description,
        whyItMatches: c.whyItMatches,
        jobGrowth: c.jobGrowth,
        salaryRange: c.salaryRange,
      })),
    )

    return { success: true, careers: result.object.careers }
  }
  catch (error) {
    console.error('Error generating career recommendations:', error)
    // Best-effort: record the failed run so telemetry captures it.
    try {
      const session = await getSession()
      if (session?.user) {
        await db.insert(recommendationRuns).values({
          userId: session.user.id,
          sessionId: '00000000-0000-0000-0000-000000000000',
          interestsSnapshot: sanitizeInterestsForPrompt(interests),
          prompt: '[failed before prompt assembly]',
          model: MODEL_ID,
          engineVersion: ENGINE_VERSION,
          durationMs: Date.now() - startedAt,
          error: String(error).slice(0, 500),
        })
      }
    }
    catch {}
    return { success: false, error: 'Failed to generate career recommendations' }
  }
}
```

- [ ] **Step 2: Update careers/page.tsx to read from latest run**

Replace `src/app/careers/page.tsx` with:

```tsx
import { and, desc, eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations, recommendationRuns } from '@/db/schema'
import CareersClient from './_components/CareersClient'
import { CareerRecommendation } from '@/lib/schemas/career'

async function getUserCareers(): Promise<CareerRecommendation[]> {
  try {
    const session = await getSession()
    if (!session?.user) return []
    const user = session.user

    const [latestRun] = await db.select({ id: recommendationRuns.id })
      .from(recommendationRuns)
      .where(eq(recommendationRuns.userId, user.id))
      .orderBy(desc(recommendationRuns.createdAt))
      .limit(1)
    if (!latestRun) return []

    const rows = await db.select()
      .from(careerRecommendations)
      .where(and(eq(careerRecommendations.userId, user.id), eq(careerRecommendations.runId, latestRun.id)))
      .orderBy(careerRecommendations.rank)

    return rows.map(row => ({
      title: row.title,
      description: row.description,
      onetId: row.onetId,
      whyItMatches: row.whyItMatches,
      jobGrowth: row.jobGrowth ?? '',
      salaryRange: row.salaryRange ?? '',
    }))
  }
  catch (error) {
    if ((error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') throw error
    console.error('[careers/page] getUserCareers failed:', error)
    return []
  }
}

export default async function CareersPage() {
  const initialCareers = await getUserCareers()
  return <CareersClient initialCareers={initialCareers} />
}
```

- [ ] **Step 3: Find and update any callers of `generateCareerRecommendationsAction`**

Run: `rg -n "generateCareerRecommendationsAction" --type tsx --type ts` (in terminal, or use Grep tool)

For each caller (typically `CareersClient.tsx`): update the call site so it passes ONLY `interests` — remove the `results` / `getDeckResults()` argument.

Example fix in `CareersClient.tsx`:

```tsx
// before
const res = await generateCareerRecommendationsAction(getDeckResults(), interests)
// after
const res = await generateCareerRecommendationsAction(interests)
```

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: PASS. If there is still a reference to `getDeckResults()` anywhere, replace it with a no-op or delete it — it is not valid post-cutover.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run`
Expected: PASS. The only existing caller test was `tests/db/quiz-answers-insert.test.ts`, which is deleted in Task 21.

- [ ] **Step 6: Commit**

```bash
git add src/app/careers/actions.ts src/app/careers/page.tsx src/app/careers/_components/
git commit -m "feat(careers): use AssessmentResult + formatResultForPrompt"
```

---

## Task 21: Legacy code deletion

**Files:**
- Delete: `src/app/_data/questions.ts`
- Delete: `src/store/slices/wouldYouRatherSlice.ts`
- Delete: `src/store/slices/__tests__/wouldYouRatherSlice.test.ts`
- Delete: `tests/db/quiz-answers-insert.test.ts`
- Delete: `src/app/discover/profile/_components/TraitHeroCard.tsx` (if no other importers)
- Delete: `src/app/discover/profile/_components/IllustratedTraitCard.tsx` (if no other importers)
- Delete: `src/app/_data/profileImages.ts` (if no other importers)
- Modify: `src/store/appStore.ts` — remove legacy slice composition
- Modify: `e2e/fixtures/test-base.ts` — remove `seedZustandStore`, replace `truncateAppTables`

**Context:** After the cutover, none of the legacy files should have callers. We verify with grep before each deletion. The store shrinks to `interests + assessment`. E2E fixtures are updated to truncate the new tables instead.

- [ ] **Step 1: Verify no remaining importers**

Run each grep (stop and investigate if any hit):

```bash
rg -l "from '@/app/_data/questions'" || true
rg -l "wouldYouRatherSlice" || true
rg -l "quizAnswers" || true
rg -l "TraitHeroCard|IllustratedTraitCard|profileImages" || true
```

Expected: empty output for `questions`, `wouldYouRatherSlice`, `quizAnswers`. The TraitHero/Illustrated/profileImages greps may surface the component files themselves; that's fine if the only references are self-imports.

- [ ] **Step 2: Delete legacy files**

```bash
git rm src/app/_data/questions.ts
git rm src/store/slices/wouldYouRatherSlice.ts
git rm src/store/slices/__tests__/wouldYouRatherSlice.test.ts
git rm tests/db/quiz-answers-insert.test.ts
git rm src/app/discover/profile/_components/TraitHeroCard.tsx
git rm src/app/discover/profile/_components/IllustratedTraitCard.tsx
git rm src/app/_data/profileImages.ts
```

(Skip any `git rm` that fails because the file has a remaining importer. Investigate before proceeding.)

- [ ] **Step 3: Trim appStore.ts**

Replace `src/store/appStore.ts` with:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { createInterestsSlice, InterestsState } from './slices/interestsSlice'
import { createAssessmentSlice, AssessmentState } from './slices/assessmentSlice'

export type AppState = InterestsState & AssessmentState

const withDevtools = process.env.NODE_ENV === 'development' ? devtools : ((fn: unknown) => fn) as typeof devtools

export const useAppStore = create<AppState>()(
  withDevtools(
    persist(
      (...a) => ({
        ...createInterestsSlice(...a),
        ...createAssessmentSlice(...a),
      }),
      {
        name: 'app-store',
        partialize: state => ({ interests: state.interests }),
      },
    ),
  ),
)
```

- [ ] **Step 4: Update e2e fixtures**

Edit `e2e/fixtures/test-base.ts`:
- Replace the body of `truncateAppTables` with:
  ```ts
  const truncateAppTables = async () => {
    await sql`DELETE FROM career_recommendations WHERE user_id = ${testUser.userId}`
    await sql`DELETE FROM recommendation_runs WHERE user_id = ${testUser.userId}`
    await sql`DELETE FROM assessment_responses WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id = ${testUser.userId})`
    await sql`DELETE FROM assessment_sessions WHERE user_id = ${testUser.userId}`
    await sql`DELETE FROM user_interests WHERE user_id = ${testUser.userId}`
    await sql`DELETE FROM user_profiles WHERE user_id = ${testUser.userId}`
  }
  ```
- Remove the `seedZustandStore` fixture entirely — it targeted the old slice.
- Remove the import of `type TestUserRecord` if no longer needed.
- Remove the `seedZustandStore` entry from the `TestFixtures` type.

- [ ] **Step 5: Update e2e spec files that used `seedZustandStore`**

Run: `rg -l "seedZustandStore" e2e/`
For each hit, delete the usage. `career-results.spec.ts` likely uses it — replace its setup with a direct DB insert of an `assessmentSessions` row with a completed result + a minimal `career_recommendations` row, OR skip those tests and mark them as updated in Task 22.

- [ ] **Step 6: Run build + tests + lint**

Run: `pnpm lint && pnpm build && pnpm vitest run`
Expected: PASS across all three. If a test file still imports deleted modules, delete or update it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: delete legacy quiz code + trim store/e2e fixtures"
```

---

## Task 22: Rewrite e2e assessment.spec.ts for adaptive flow

**Files:**
- Rewrite: `e2e/specs/assessment.spec.ts`

**Context:** The old spec asserted "1 of 30", "2 of 30" counters that no longer exist. The new spec validates: grade question renders → intro → first item renders → clicking an option advances to a new item → skipping advances → after 8 answers, "Peek at profile" is visible → reload preserves the session.

- [ ] **Step 1: Rewrite the spec**

Replace `e2e/specs/assessment.spec.ts` with:

```ts
import { test, expect } from '../fixtures/test-base'

test.describe('Adaptive Assessment Flow', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('shows grade question, then intro, then first item', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/preferences')
    await expect(page.getByText(/What grade are you in/i)).toBeVisible()
    await page.getByRole('button', { name: /Prefer not to say/i }).click()
    await expect(page.getByText(/Ready\?/i)).toBeVisible()
    await page.getByRole('button', { name: /Let's go/i }).click()
    await expect(page.getByText(/Would you rather/i)).toBeVisible()
  })

  test('clicking an option advances to the next item', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/preferences')
    await page.getByRole('button', { name: /Prefer not to say/i }).click()
    await page.getByRole('button', { name: /Let's go/i }).click()

    const firstCard = page.locator('button:has(figure)').nth(2) // desktop grid first card
    const firstText = await firstCard.locator('h2').innerText()
    await firstCard.click()

    // New item should have different option text
    await expect(page.locator('button:has(figure) h2').first()).not.toHaveText(firstText, { timeout: 5000 })
  })

  test('skip advances without recording an answer', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/preferences')
    await page.getByRole('button', { name: /Prefer not to say/i }).click()
    await page.getByRole('button', { name: /Let's go/i }).click()

    const firstCard = page.locator('button:has(figure)').nth(2)
    const firstText = await firstCard.locator('h2').innerText()
    await page.getByRole('button', { name: /Skip/i }).click()
    await expect(page.locator('button:has(figure) h2').first()).not.toHaveText(firstText, { timeout: 5000 })
  })

  test('peek button appears after 8 answers', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/preferences')
    await page.getByRole('button', { name: /Prefer not to say/i }).click()
    await page.getByRole('button', { name: /Let's go/i }).click()

    for (let i = 0; i < 8; i++) {
      await page.locator('button:has(figure)').nth(2)
        .click()
      // Wait for the next item to render
      await page.waitForTimeout(700)
    }
    await expect(page.getByRole('button', { name: /Peek at profile/i })).toBeVisible()
  })

  test('session persists across reload', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/preferences')
    await page.getByRole('button', { name: /Prefer not to say/i }).click()
    await page.getByRole('button', { name: /Let's go/i }).click()
    await page.locator('button:has(figure)').nth(2)
      .click()
    await page.waitForTimeout(1000)

    await page.reload()
    // After reload: no grade question — we resumed mid-session
    await expect(page.getByText(/What grade are you in/i)).not.toBeVisible()
    await expect(page.getByText(/Would you rather/i)).toBeVisible({ timeout: 5000 })
  })
})
```

- [ ] **Step 2: Run the e2e suite locally (optional, requires DB + dev server)**

Run: `pnpm playwright test --config e2e/playwright.config.ts`
Expected: PASS. This is optional because CI will run it; add a skip/xit if the local environment can't boot the dev server.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/assessment.spec.ts
git commit -m "test(e2e): rewrite assessment flow for adaptive engine"
```

---

## Task 23: Final build + docs + cleanup

**Files:**
- Modify: `CLAUDE.md` — update the "Core Application Structure" section
- Modify: `docs/superpowers/plans/2026-04-18-adaptive-assessment-plan-1-engine.md` — add "Plan 2 complete" note at the bottom

**Context:** Wrap-up: update the living documentation to reflect that the cutover is complete.

- [ ] **Step 1: Update CLAUDE.md**

Edit `CLAUDE.md`:
- Under "Database Schema": replace the `quiz_answers` bullet with `assessment_sessions / assessment_responses`; note `career_recommendations` now has `runId` + `rank`.
- Under "Discovery Flow": change the "would-you-rather" description to "adaptive Bayesian assessment (12–20 items)".
- Under "State Management": replace `wouldYouRatherSlice.ts` with `assessmentSlice.ts`.
- Under "API Routes": remove `api/user/progress`; add the three `api/assessment/*` routes.

- [ ] **Step 2: Append completion note to Plan 1**

At the bottom of `docs/superpowers/plans/2026-04-18-adaptive-assessment-plan-1-engine.md` add:

```markdown
---

**Status: Complete.** All 21 tasks shipped. Plan 2 (this file's sibling) replaced the UI, API, and LLM prompt on top of this engine.
```

- [ ] **Step 3: Final build + test + lint**

Run: `pnpm lint && pnpm vitest run && pnpm build`
Expected: PASS on all three.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-04-18-adaptive-assessment-plan-1-engine.md
git commit -m "docs: update CLAUDE.md + Plan 1 with adaptive cutover complete"
```

---

## Self-Review

**Spec coverage:**
- [x] `/api/assessment/session` (POST + GET) — Tasks 1–2
- [x] `/api/assessment/response` — Task 3
- [x] `/api/assessment/result` — Task 4
- [x] Store rewrite — Tasks 5–6
- [x] Grade question screen — Task 7
- [x] Intro card — Task 8
- [x] Adaptive loop UI — Tasks 9–13
- [x] Peek modal — Task 11
- [x] Inconsistency modal — Task 12
- [x] Undo last — not implemented; the spec says "allowed only for the most recent answer" — treated as YAGNI for Plan 2 because the engine's `advance(...)` is forward-only and reversing it is a new server operation. Flag for follow-up.
- [x] Holland code headline + letter cards — Task 14
- [x] RIASEC radar with confidence bands — Task 15
- [x] Work values pills — Task 16
- [x] Work context sliders — Task 17
- [x] Profile page rewrite — Task 18
- [x] LLM prompt change — Task 20
- [x] Schema cutover (drop quiz_answers, rebuild career_recommendations) — Task 19
- [x] Legacy cleanup — Task 21
- [x] E2E rewrite — Task 22
- [x] Docs — Task 23

**Gap noted:** "Undo last" button is deferred. The engine currently has no `rewind` helper; adding one would require exposing a way to rebuild the session from `responses.slice(0, -1)` and re-posting the item id. The UI can trivially reload the page (which restores state from the server) to produce the same effect today. Recommend tracking this as a Plan 3 follow-up rather than expanding Plan 2.

**Placeholder scan:** No "TODO", "TBD", or "fill in" patterns in the plan. Every code block is complete.

**Type consistency:**
- `AssessmentResult` shape matches between tasks 4, 18, 20, and the components in tasks 14–17.
- `Posterior` typing matches between tasks 3 (response handler), 5 (slice state), and 11 (PeekModal).
- `GradeBand` passes cleanly from `GradeQuestion` (task 7) through `assessmentSlice.setGradeBand` (task 5) to `/api/assessment/session` POST (task 1).
- `rebuildSessionFromLog` introduced in Task 1 is reused in Task 3 — signatures match.

**Execution notes:**
- Tasks 15 and 19 intentionally leave the build red for a single commit each — they are followed immediately by the task that fixes the build. Subagent-driven execution should run the spec-compliance review at the end of each such pair, not mid-pair.
- E2E tests require the dev server + a Neon branch; CI setup is out of scope for this plan (inherited from prior work).
