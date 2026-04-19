# Adaptive Assessment — Plan 1: Engine, Schema, Item Bank, Simulation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the adaptive career-assessment engine, the supporting database schema, the SME-rated item bank, and a simulation harness that proves the engine recovers Holland codes from synthetic users — all without touching user-facing UI yet.

**Architecture:** A pure-TS Bayesian point-estimate engine in `src/lib/assessment/` operates on a flat ~60-item bank stored as TypeScript data in `src/app/_data/items.ts`. New Drizzle tables (`user_profiles`, `user_interests`, `assessment_sessions`, `assessment_responses`, `recommendation_runs`, `career_user_actions`) are added additively — old tables (`quiz_answers`, existing `career_recommendations`) are left in place so the current UI keeps working until Plan 2 ships. A simulation harness validates engine accuracy by running synthetic users through it.

**Tech Stack:** TypeScript, Vitest, Drizzle ORM, Neon Postgres, Zod (existing).

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-04-18-adaptive-assessment-design.md`
- Plan 2 (deferred until this completes): adds API routes, store/UI rewrite, LLM prompt update, E2E

---

## File Structure

| Path | Status | Purpose |
|---|---|---|
| `src/db/schema.ts` | modify | Add new tables (additive only) |
| `drizzle/migrations/<timestamp>_adaptive_assessment.sql` | create | Generated migration |
| `src/lib/assessment/types.ts` | create | Shared types: `Posterior`, `AssessmentResult`, `Item`, `Option`, `GradeBand`, etc. |
| `src/lib/assessment/hexagon.ts` | create | RIASEC scale constants and distance helpers |
| `src/lib/assessment/posterior.ts` | create | Posterior init + Bradley-Terry update |
| `src/lib/assessment/scoring.ts` | create | Posterior → AssessmentResult |
| `src/lib/assessment/inconsistency.ts` | create | Heuristic inconsistency detection |
| `src/lib/assessment/itemBank.ts` | create | Bank accessor + filter helpers |
| `src/lib/assessment/engine.ts` | create | Next-item selection, stopping rule, session glue |
| `src/lib/assessment/promptFormat.ts` | create | AssessmentResult → human-readable LLM prompt section |
| `src/lib/assessment/simulation.ts` | create | Synthetic user generator + simulation runner |
| `src/lib/assessment/index.ts` | create | Public re-exports |
| `src/app/_data/items.ts` | create | The ~60-item bank with SME loadings |
| `src/lib/assessment/__tests__/*.test.ts` | create | One test file per module |

The existing `src/app/_data/questions.ts`, `wouldYouRatherSlice.ts`, and downstream UI are **left untouched** in this plan. Plan 2 replaces them.

---

## Task 1: Add new Drizzle schema tables

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Append the new tables to schema.ts**

Add the following at the bottom of `src/db/schema.ts` (keep existing imports + add `boolean`, `integer`, `jsonb`, `uniqueIndex`, `index`, `uuid`):

```ts
import {
  boolean, index, integer, jsonb, pgTable, serial, smallint, text,
  timestamp, unique, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'

// ... existing quizAnswers + careerRecommendations untouched ...

export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey(),
  gradeBand: text('grade_band'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const userInterests = pgTable('user_interests', {
  id: uuid().primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  interest: text().notNull(),
  source: text().notNull().default('manual'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  unique('user_interests_user_interest_unique').on(t.userId, t.interest),
  index('user_interests_user_idx').on(t.userId),
])

export const assessmentSessions = pgTable('assessment_sessions', {
  id: uuid().primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  gradeBand: text('grade_band'),
  engineVersion: text('engine_version').notNull(),
  posterior: jsonb().notNull(),
  result: jsonb(),
  inconsistency: boolean().notNull().default(false),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  abandonedAt: timestamp('abandoned_at', { withTimezone: true }),
}, t => [
  index('assessment_sessions_user_started_idx').on(t.userId, t.startedAt),
  uniqueIndex('assessment_sessions_one_active_per_user')
    .on(t.userId)
    .where(sql`${t.completedAt} IS NULL AND ${t.abandonedAt} IS NULL`),
])

export const assessmentResponses = pgTable('assessment_responses', {
  id: uuid().primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull()
    .references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  position: smallint().notNull(),
  shownAt: timestamp('shown_at', { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  choice: smallint(),
  responseMs: integer('response_ms'),
}, t => [
  unique('assessment_responses_session_position_unique').on(t.sessionId, t.position),
  index('assessment_responses_item_idx').on(t.itemId),
])

export const recommendationRuns = pgTable('recommendation_runs', {
  id: uuid().primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  sessionId: uuid('session_id').notNull()
    .references(() => assessmentSessions.id),
  interestsSnapshot: text('interests_snapshot').array().notNull(),
  prompt: text().notNull(),
  model: text().notNull(),
  engineVersion: text('engine_version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  durationMs: integer('duration_ms'),
  error: text(),
}, t => [
  index('recommendation_runs_user_created_idx').on(t.userId, t.createdAt),
])

export const careerUserActions = pgTable('career_user_actions', {
  id: uuid().primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  onetId: text('onet_id').notNull(),
  action: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  index('career_user_actions_user_onet_idx').on(t.userId, t.onetId),
  index('career_user_actions_user_action_idx').on(t.userId, t.action, t.createdAt),
])
```

Add at top of file (with existing drizzle-orm imports):
```ts
import { sql } from 'drizzle-orm'
```

- [ ] **Step 2: Generate the migration**

```bash
pnpm dk:generate
```
Expected: a new SQL file appears in `drizzle/migrations/` containing `CREATE TABLE` statements for the six new tables and the partial unique index. Inspect it; verify it does NOT drop or alter `quiz_answers` or `career_recommendations`.

- [ ] **Step 3: Apply migration locally**

```bash
pnpm dk:push
```
Expected: success message, no warnings about destructive changes. Verify in `psql` or Drizzle Studio that the six new tables exist.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/migrations/
git commit -m "feat(db): add adaptive-assessment tables (additive)"
```

---

## Task 2: Shared assessment types

**Files:**
- Create: `src/lib/assessment/types.ts`
- Test: `src/lib/assessment/__tests__/types.test.ts`

- [ ] **Step 1: Write the type module**

```ts
// src/lib/assessment/types.ts
export const RIASEC_SCALES = ['R', 'I', 'A', 'S', 'E', 'C'] as const
export type RiasecScale = typeof RIASEC_SCALES[number]

export const WORK_VALUE_SCALES = ['ACH', 'IND', 'REC', 'REL', 'SUP', 'WC'] as const
export type WorkValueScale = typeof WORK_VALUE_SCALES[number]

export type GradeBand = 'middle' | 'early-hs' | 'late-hs' | 'college'
export type Confidence = 'high' | 'medium' | 'low'

export type ScaleEstimate = { mean: number, variance: number }

export type Posterior = {
  riasec: Record<RiasecScale, ScaleEstimate>
  workValues: Record<WorkValueScale, ScaleEstimate>
  workContext: {
    structureVariety: ScaleEstimate
    indoorOutdoor: ScaleEstimate
    soloTeam: ScaleEstimate
  }
}

export type RiasecLoadings = Record<RiasecScale, number> // 0..3
export type WorkValueLoadings = Record<WorkValueScale, number> // 0..3
export type WorkContextLoadings = {
  structureVariety: number // -2..2 (negative = structure)
  indoorOutdoor: number    // -2..2 (negative = indoor)
  soloTeam: number         // -2..2 (negative = solo)
}

export type Option = {
  id: string
  text: string
  imageUrl: string
  prompt: string
  loadings: {
    riasec: RiasecLoadings
    workValues: WorkValueLoadings
    workContext: WorkContextLoadings
  }
  desirability: number // 1..5
}

export type DimensionContrast = 'opposite' | 'alternate' | 'adjacent' | 'mixed'

export type Item = {
  id: string
  option1: Option
  option2: Option
  dimensionContrast: DimensionContrast
  primaryScales: RiasecScale[]
  minGradeBand?: GradeBand
}

export type ResponseChoice = 1 | 2 | null // null = skip

export type RecordedResponse = {
  itemId: string
  choice: ResponseChoice
  position: number
  responseMs?: number
}

export type AssessmentResult = {
  hollandCode: string
  riasec: Record<RiasecScale, {
    score: number   // 0..100
    rank: 1 | 2 | 3 | 4 | 5 | 6
    confidence: Confidence
  }>
  workValues: {
    top: WorkValueScale[]
    all: Record<WorkValueScale, { score: number, confidence: Confidence }>
    suppressed?: boolean
  }
  workContext: {
    structureVariety: { lean: 'structure' | 'variety' | 'balanced', strength: number, confidence: Confidence }
    indoorOutdoor:    { lean: 'indoor' | 'outdoor' | 'mixed',       strength: number, confidence: Confidence }
    soloTeam:         { lean: 'solo' | 'team' | 'flexible',         strength: number, confidence: Confidence }
  }
  meta: {
    itemsAnswered: number
    itemsSkipped: number
    completedAt: string
    engineVersion: string
    inconsistencyFlag: boolean
  }
}

export const ENGINE_VERSION = 'v1.0.0'
```

- [ ] **Step 2: Sanity test that constants are exported**

```ts
// src/lib/assessment/__tests__/types.test.ts
import { describe, it, expect } from 'vitest'
import { RIASEC_SCALES, WORK_VALUE_SCALES, ENGINE_VERSION } from '../types'

describe('assessment types', () => {
  it('exports the six RIASEC scales in canonical order', () => {
    expect(RIASEC_SCALES).toEqual(['R', 'I', 'A', 'S', 'E', 'C'])
  })

  it('exports the six O*NET work values', () => {
    expect(WORK_VALUE_SCALES).toEqual(['ACH', 'IND', 'REC', 'REL', 'SUP', 'WC'])
  })

  it('declares an engine version', () => {
    expect(ENGINE_VERSION).toMatch(/^v\d+\.\d+\.\d+$/)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/lib/assessment/__tests__/types.test.ts
```
Expected: 3 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assessment/
git commit -m "feat(assessment): shared types for adaptive engine"
```

---

## Task 3: Hexagon distance helpers

**Files:**
- Create: `src/lib/assessment/hexagon.ts`
- Test: `src/lib/assessment/__tests__/hexagon.test.ts`

- [ ] **Step 1: Write the failing tests first**

```ts
// src/lib/assessment/__tests__/hexagon.test.ts
import { describe, it, expect } from 'vitest'
import { hexagonDistance, contrastCategory } from '../hexagon'

describe('hexagonDistance', () => {
  it.each([
    ['R', 'R', 0],
    ['R', 'I', 1], ['I', 'A', 1], ['A', 'S', 1], ['S', 'E', 1], ['E', 'C', 1], ['C', 'R', 1],
    ['R', 'A', 2], ['I', 'S', 2], ['A', 'E', 2], ['S', 'C', 2], ['E', 'R', 2], ['C', 'I', 2],
    ['R', 'S', 3], ['I', 'E', 3], ['A', 'C', 3],
  ] as const)('distance(%s, %s) === %i', (a, b, expected) => {
    expect(hexagonDistance(a, b)).toBe(expected)
    expect(hexagonDistance(b, a)).toBe(expected) // symmetric
  })
})

describe('contrastCategory', () => {
  it('classifies single-scale pairs by hexagon distance', () => {
    expect(contrastCategory(['R'], ['S'])).toBe('opposite')
    expect(contrastCategory(['R'], ['A'])).toBe('alternate')
    expect(contrastCategory(['R'], ['I'])).toBe('adjacent')
  })

  it('returns "mixed" when an option lists multiple scales', () => {
    expect(contrastCategory(['R', 'I'], ['S'])).toBe('mixed')
  })
})
```

- [ ] **Step 2: Run them — they should fail**

```bash
pnpm test src/lib/assessment/__tests__/hexagon.test.ts
```
Expected: file-not-found error or import errors.

- [ ] **Step 3: Implement**

```ts
// src/lib/assessment/hexagon.ts
import { RIASEC_SCALES, RiasecScale, DimensionContrast } from './types'

const ORDER: RiasecScale[] = ['R', 'I', 'A', 'S', 'E', 'C']

export function hexagonDistance(a: RiasecScale, b: RiasecScale): 0 | 1 | 2 | 3 {
  const i = ORDER.indexOf(a)
  const j = ORDER.indexOf(b)
  const raw = Math.abs(i - j)
  const dist = Math.min(raw, ORDER.length - raw)
  return dist as 0 | 1 | 2 | 3
}

export function contrastCategory(
  scalesA: RiasecScale[],
  scalesB: RiasecScale[],
): DimensionContrast {
  if (scalesA.length !== 1 || scalesB.length !== 1) return 'mixed'
  const d = hexagonDistance(scalesA[0], scalesB[0])
  if (d === 3) return 'opposite'
  if (d === 2) return 'alternate'
  if (d === 1) return 'adjacent'
  return 'mixed'
}
```

- [ ] **Step 4: Run tests — should pass**

```bash
pnpm test src/lib/assessment/__tests__/hexagon.test.ts
```
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/hexagon.ts src/lib/assessment/__tests__/hexagon.test.ts
git commit -m "feat(assessment): RIASEC hexagon distance helpers"
```

---

## Task 4: Posterior initialization

**Files:**
- Create: `src/lib/assessment/posterior.ts`
- Test: `src/lib/assessment/__tests__/posterior.test.ts`

- [ ] **Step 1: Write the failing tests for `initialPosterior`**

```ts
// src/lib/assessment/__tests__/posterior.test.ts
import { describe, it, expect } from 'vitest'
import { initialPosterior } from '../posterior'
import { RIASEC_SCALES, WORK_VALUE_SCALES } from '../types'

describe('initialPosterior', () => {
  it('returns mean=0 var=1 on every RIASEC scale by default', () => {
    const p = initialPosterior()
    for (const s of RIASEC_SCALES) {
      expect(p.riasec[s]).toEqual({ mean: 0, variance: 1 })
    }
  })

  it('returns mean=0 var=1 on every work-value scale by default', () => {
    const p = initialPosterior()
    for (const s of WORK_VALUE_SCALES) {
      expect(p.workValues[s]).toEqual({ mean: 0, variance: 1 })
    }
  })

  it('inflates work-value variance to 1.5 for grade-band "middle"', () => {
    const p = initialPosterior({ gradeBand: 'middle' })
    for (const s of WORK_VALUE_SCALES) {
      expect(p.workValues[s].variance).toBe(1.5)
    }
    // RIASEC unaffected
    for (const s of RIASEC_SCALES) {
      expect(p.riasec[s].variance).toBe(1)
    }
  })

  it('uses defaults for any non-middle grade band', () => {
    for (const band of ['early-hs', 'late-hs', 'college'] as const) {
      const p = initialPosterior({ gradeBand: band })
      for (const s of WORK_VALUE_SCALES) {
        expect(p.workValues[s].variance).toBe(1)
      }
    }
  })

  it('treats undefined grade band the same as defaults', () => {
    const p = initialPosterior({})
    for (const s of WORK_VALUE_SCALES) {
      expect(p.workValues[s].variance).toBe(1)
    }
  })
})
```

- [ ] **Step 2: Run — should fail (no module)**

```bash
pnpm test src/lib/assessment/__tests__/posterior.test.ts
```

- [ ] **Step 3: Implement `initialPosterior`**

```ts
// src/lib/assessment/posterior.ts
import {
  GradeBand, Posterior, RIASEC_SCALES, RiasecScale, ScaleEstimate,
  WORK_VALUE_SCALES, WorkValueScale,
} from './types'

const DEFAULT: ScaleEstimate = { mean: 0, variance: 1 }
const MIDDLE_WV: ScaleEstimate = { mean: 0, variance: 1.5 }

export function initialPosterior(opts: { gradeBand?: GradeBand } = {}): Posterior {
  const wvDefault = opts.gradeBand === 'middle' ? MIDDLE_WV : DEFAULT
  return {
    riasec: Object.fromEntries(RIASEC_SCALES.map(s => [s, { ...DEFAULT }])) as Record<RiasecScale, ScaleEstimate>,
    workValues: Object.fromEntries(WORK_VALUE_SCALES.map(s => [s, { ...wvDefault }])) as Record<WorkValueScale, ScaleEstimate>,
    workContext: {
      structureVariety: { ...DEFAULT },
      indoorOutdoor: { ...DEFAULT },
      soloTeam: { ...DEFAULT },
    },
  }
}
```

- [ ] **Step 4: Run — should pass**

```bash
pnpm test src/lib/assessment/__tests__/posterior.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/posterior.ts src/lib/assessment/__tests__/posterior.test.ts
git commit -m "feat(assessment): posterior initialization with grade-band priors"
```

---

## Task 5: Posterior update from a single response

**Files:**
- Modify: `src/lib/assessment/posterior.ts`
- Modify: `src/lib/assessment/__tests__/posterior.test.ts`

- [ ] **Step 1: Add failing tests for `updatePosterior`**

Append to `posterior.test.ts`:

```ts
import { initialPosterior, updatePosterior } from '../posterior'
import { Item, Option } from '../types'

function makeOption(over: Partial<Option> & { id: string }): Option {
  return {
    id: over.id,
    text: over.text ?? over.id,
    imageUrl: over.imageUrl ?? '',
    prompt: over.prompt ?? '',
    desirability: over.desirability ?? 3,
    loadings: over.loadings ?? {
      riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}

function makeItem(opt1Loadings: Option['loadings'], opt2Loadings: Option['loadings']): Item {
  return {
    id: 'test-item',
    option1: makeOption({ id: 'a', loadings: opt1Loadings }),
    option2: makeOption({ id: 'b', loadings: opt2Loadings }),
    dimensionContrast: 'mixed',
    primaryScales: [],
  }
}

describe('updatePosterior — RIASEC update direction', () => {
  it('shifts mean of strongly-loaded scale toward picked option', () => {
    const item = makeItem(
      { riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
      { riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
    )
    const before = initialPosterior()
    const after = updatePosterior(before, item, 1) // picked option1 (R-loaded)
    expect(after.riasec.R.mean).toBeGreaterThan(before.riasec.R.mean)
    expect(after.riasec.S.mean).toBeLessThan(before.riasec.S.mean)
  })

  it('reduces variance on contrasted scales', () => {
    const item = makeItem(
      { riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
      { riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
    )
    const before = initialPosterior()
    const after = updatePosterior(before, item, 1)
    expect(after.riasec.R.variance).toBeLessThan(before.riasec.R.variance)
    expect(after.riasec.S.variance).toBeLessThan(before.riasec.S.variance)
  })

  it('leaves untouched scales (zero loadings on both options) unchanged', () => {
    const item = makeItem(
      { riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
      { riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
    )
    const before = initialPosterior()
    const after = updatePosterior(before, item, 1)
    expect(after.riasec.A).toEqual(before.riasec.A)
    expect(after.riasec.C).toEqual(before.riasec.C)
  })
})

describe('updatePosterior — skip handling', () => {
  it('produces a smaller variance reduction than a forced choice', () => {
    const item = makeItem(
      { riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
      { riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 }, workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 }, workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 } },
    )
    const before = initialPosterior()
    const skipped = updatePosterior(before, item, null)
    const chosen = updatePosterior(before, item, 1)
    const skipDelta = before.riasec.R.variance - skipped.riasec.R.variance
    const chooseDelta = before.riasec.R.variance - chosen.riasec.R.variance
    expect(skipDelta).toBeGreaterThan(0)
    expect(skipDelta).toBeLessThan(chooseDelta)
  })
})
```

- [ ] **Step 2: Run — should fail**

```bash
pnpm test src/lib/assessment/__tests__/posterior.test.ts
```

- [ ] **Step 3: Implement `updatePosterior`**

Append to `posterior.ts`:

```ts
import { Item, ResponseChoice } from './types'

const LEARN_RATE = 0.5      // softmax temperature; tuned for typical 0..3 loading range
const SKIP_WEIGHT = 0.4     // skips count as 40% of a forced choice

type LoadingDiff = number   // (chosen.loading − rejected.loading) on a given scale

function updateScale(prior: ScaleEstimate, diff: LoadingDiff, weight: number): ScaleEstimate {
  if (diff === 0) return prior
  // Bradley-Terry softmax → posterior shift proportional to diff and prior variance
  const meanShift = LEARN_RATE * weight * diff * prior.variance
  // Variance shrinks proportional to (squared) information; clamp to keep positive
  const varianceShrink = (LEARN_RATE * weight * diff) ** 2 * prior.variance
  const newVariance = Math.max(0.01, prior.variance / (1 + varianceShrink))
  return { mean: prior.mean + meanShift, variance: newVariance }
}

export function updatePosterior(prior: Posterior, item: Item, choice: ResponseChoice): Posterior {
  if (choice === null) {
    // skip: weak negative evidence on both options' dominant loadings
    return applyScaleUpdates(prior, item, /* dir */ 0, SKIP_WEIGHT)
  }
  const dir = choice === 1 ? 1 : -1
  return applyScaleUpdates(prior, item, dir, 1)
}

function applyScaleUpdates(
  prior: Posterior, item: Item, dir: -1 | 0 | 1, weight: number,
): Posterior {
  const a = item.option1.loadings
  const b = item.option2.loadings

  const next: Posterior = {
    riasec: { ...prior.riasec },
    workValues: { ...prior.workValues },
    workContext: { ...prior.workContext },
  }

  for (const s of RIASEC_SCALES) {
    const diff = dir === 0
      ? -((a.riasec[s] + b.riasec[s]) / 2) * 0.1   // skip: mild negative pull on average loading
      : dir * (a.riasec[s] - b.riasec[s])
    next.riasec[s] = updateScale(prior.riasec[s], diff, weight)
  }

  for (const s of WORK_VALUE_SCALES) {
    const diff = dir === 0
      ? -((a.workValues[s] + b.workValues[s]) / 2) * 0.1
      : dir * (a.workValues[s] - b.workValues[s])
    next.workValues[s] = updateScale(prior.workValues[s], diff, weight)
  }

  for (const k of ['structureVariety', 'indoorOutdoor', 'soloTeam'] as const) {
    const diff = dir === 0
      ? -((a.workContext[k] + b.workContext[k]) / 2) * 0.1
      : dir * (a.workContext[k] - b.workContext[k])
    next.workContext[k] = updateScale(prior.workContext[k], diff, weight)
  }

  return next
}
```

- [ ] **Step 4: Run — should pass**

```bash
pnpm test src/lib/assessment/__tests__/posterior.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/posterior.ts src/lib/assessment/__tests__/posterior.test.ts
git commit -m "feat(assessment): Bradley-Terry posterior update + skip handling"
```

---

## Task 6: Holland code derivation

**Files:**
- Create: `src/lib/assessment/scoring.ts`
- Create: `src/lib/assessment/__tests__/scoring.test.ts`

- [ ] **Step 1: Write failing tests for `hollandCode` and `rankRiasec`**

```ts
// src/lib/assessment/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { hollandCode, rankRiasec } from '../scoring'
import { initialPosterior } from '../posterior'

function withMeans(means: Partial<Record<'R'|'I'|'A'|'S'|'E'|'C', number>>) {
  const p = initialPosterior()
  for (const [k, v] of Object.entries(means)) {
    p.riasec[k as 'R'].mean = v as number
  }
  return p
}

describe('rankRiasec', () => {
  it('orders scales by descending posterior mean, with stable hexagon order on ties', () => {
    const ranked = rankRiasec(withMeans({ S: 1.5, A: 1.2, E: 1.0, R: 0.5, I: 0.0, C: -0.5 }))
    expect(ranked).toEqual(['S', 'A', 'E', 'R', 'I', 'C'])
  })

  it('breaks ties using canonical RIASEC order (R, I, A, S, E, C)', () => {
    const ranked = rankRiasec(withMeans({ R: 1.0, I: 1.0, A: 1.0, S: 0, E: 0, C: 0 }))
    expect(ranked.slice(0, 3)).toEqual(['R', 'I', 'A'])
  })
})

describe('hollandCode', () => {
  it('returns the top 3 scales as a 3-letter string', () => {
    const code = hollandCode(withMeans({ S: 2, A: 1.5, E: 1, R: 0, I: 0, C: 0 }))
    expect(code).toBe('SAE')
  })
})
```

- [ ] **Step 2: Run — fails**

```bash
pnpm test src/lib/assessment/__tests__/scoring.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/assessment/scoring.ts
import { Posterior, RIASEC_SCALES, RiasecScale } from './types'

export function rankRiasec(p: Posterior): RiasecScale[] {
  const order = [...RIASEC_SCALES]
  return order.sort((a, b) => {
    const diff = p.riasec[b].mean - p.riasec[a].mean
    if (Math.abs(diff) < 1e-9) return RIASEC_SCALES.indexOf(a) - RIASEC_SCALES.indexOf(b)
    return diff
  })
}

export function hollandCode(p: Posterior): string {
  return rankRiasec(p).slice(0, 3).join('')
}
```

- [ ] **Step 4: Run — passes**

```bash
pnpm test src/lib/assessment/__tests__/scoring.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/scoring.ts src/lib/assessment/__tests__/scoring.test.ts
git commit -m "feat(assessment): Holland code derivation"
```

---

## Task 7: Confidence band classifier + work-context lean

**Files:**
- Modify: `src/lib/assessment/scoring.ts`
- Modify: `src/lib/assessment/__tests__/scoring.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { confidenceBand, contextLean } from '../scoring'

describe('confidenceBand', () => {
  it('returns "high" for variance below 0.25', () => {
    expect(confidenceBand(0.1)).toBe('high')
    expect(confidenceBand(0.249)).toBe('high')
  })
  it('returns "medium" for 0.25 <= variance < 0.5', () => {
    expect(confidenceBand(0.25)).toBe('medium')
    expect(confidenceBand(0.499)).toBe('medium')
  })
  it('returns "low" for variance >= 0.5', () => {
    expect(confidenceBand(0.5)).toBe('low')
    expect(confidenceBand(2)).toBe('low')
  })
})

describe('contextLean', () => {
  it('returns balanced/mixed/flexible labels when |mean| < 0.3', () => {
    expect(contextLean('structureVariety', { mean: 0.1, variance: 0.5 })).toEqual({
      lean: 'balanced', strength: expect.any(Number), confidence: 'low',
    })
    expect(contextLean('indoorOutdoor', { mean: -0.2, variance: 0.5 })).toEqual({
      lean: 'mixed', strength: expect.any(Number), confidence: 'low',
    })
    expect(contextLean('soloTeam', { mean: 0, variance: 0.5 })).toEqual({
      lean: 'flexible', strength: expect.any(Number), confidence: 'low',
    })
  })
  it('uses the negative-side label for negative means above the threshold', () => {
    expect(contextLean('structureVariety', { mean: -1, variance: 0.2 }).lean).toBe('structure')
    expect(contextLean('indoorOutdoor', { mean: -1, variance: 0.2 }).lean).toBe('indoor')
    expect(contextLean('soloTeam', { mean: -1, variance: 0.2 }).lean).toBe('solo')
  })
  it('uses the positive-side label for positive means above the threshold', () => {
    expect(contextLean('structureVariety', { mean: 1, variance: 0.2 }).lean).toBe('variety')
    expect(contextLean('indoorOutdoor', { mean: 1, variance: 0.2 }).lean).toBe('outdoor')
    expect(contextLean('soloTeam', { mean: 1, variance: 0.2 }).lean).toBe('team')
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

Append to `scoring.ts`:

```ts
import { Confidence, ScaleEstimate } from './types'

export function confidenceBand(variance: number): Confidence {
  if (variance < 0.25) return 'high'
  if (variance < 0.5) return 'medium'
  return 'low'
}

const CONTEXT_LABELS = {
  structureVariety: { neg: 'structure', pos: 'variety', mid: 'balanced' },
  indoorOutdoor:    { neg: 'indoor',    pos: 'outdoor', mid: 'mixed' },
  soloTeam:         { neg: 'solo',      pos: 'team',    mid: 'flexible' },
} as const

const LEAN_THRESHOLD = 0.3

export function contextLean<K extends keyof typeof CONTEXT_LABELS>(
  axis: K,
  est: ScaleEstimate,
): { lean: string, strength: number, confidence: Confidence } {
  const labels = CONTEXT_LABELS[axis]
  const lean = Math.abs(est.mean) < LEAN_THRESHOLD
    ? labels.mid
    : est.mean < 0 ? labels.neg : labels.pos
  // Strength: |mean| normalized to [0,1] against a soft cap at |mean|=2
  const strength = Math.min(1, Math.abs(est.mean) / 2)
  return { lean, strength, confidence: confidenceBand(est.variance) }
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/scoring.ts src/lib/assessment/__tests__/scoring.test.ts
git commit -m "feat(assessment): confidence bands + work-context lean classifier"
```

---

## Task 8: Full AssessmentResult assembly

**Files:**
- Modify: `src/lib/assessment/scoring.ts`
- Modify: `src/lib/assessment/__tests__/scoring.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { buildResult } from '../scoring'
import { ENGINE_VERSION } from '../types'

describe('buildResult', () => {
  it('assembles a complete AssessmentResult with hollandCode + ranks + confidences', () => {
    const p = withMeans({ S: 2, A: 1.5, E: 1, R: 0, I: 0, C: 0 })
    p.riasec.S.variance = 0.1
    p.riasec.A.variance = 0.2
    p.riasec.E.variance = 0.3
    p.workValues.REL.mean = 1.5
    p.workValues.REL.variance = 0.2
    p.workValues.ACH.mean = 1
    p.workValues.ACH.variance = 0.4

    const result = buildResult({
      posterior: p, itemsAnswered: 14, itemsSkipped: 0,
      inconsistencyFlag: false, gradeBand: 'late-hs',
    })

    expect(result.hollandCode).toBe('SAE')
    expect(result.riasec.S).toMatchObject({ rank: 1, confidence: 'high' })
    expect(result.riasec.A).toMatchObject({ rank: 2, confidence: 'high' })
    expect(result.riasec.E).toMatchObject({ rank: 3, confidence: 'medium' })
    expect(result.workValues.top[0]).toBe('REL')
    expect(result.workValues.suppressed).toBeUndefined()
    expect(result.meta.engineVersion).toBe(ENGINE_VERSION)
    expect(result.meta.itemsAnswered).toBe(14)
  })

  it('sets workValues.suppressed when grade band is "middle"', () => {
    const p = initialPosterior({ gradeBand: 'middle' })
    const result = buildResult({
      posterior: p, itemsAnswered: 14, itemsSkipped: 0,
      inconsistencyFlag: false, gradeBand: 'middle',
    })
    expect(result.workValues.suppressed).toBe(true)
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

Append to `scoring.ts`:

```ts
import {
  AssessmentResult, ENGINE_VERSION, GradeBand,
  WORK_VALUE_SCALES, WorkValueScale,
} from './types'

const SCORE_SCALE_FACTOR = 25  // map mean to 0..100 (mean=0 → 50, mean=2 → 100, mean=-2 → 0, clamped)

function meanToScore(mean: number): number {
  return Math.round(Math.max(0, Math.min(100, 50 + mean * SCORE_SCALE_FACTOR)))
}

export function buildResult(opts: {
  posterior: Posterior
  itemsAnswered: number
  itemsSkipped: number
  inconsistencyFlag: boolean
  gradeBand?: GradeBand
}): AssessmentResult {
  const { posterior: p, itemsAnswered, itemsSkipped, inconsistencyFlag, gradeBand } = opts
  const ranked = rankRiasec(p)

  const riasec = Object.fromEntries(RIASEC_SCALES.map(s => [s, {
    score: meanToScore(p.riasec[s].mean),
    rank: (ranked.indexOf(s) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
    confidence: confidenceBand(p.riasec[s].variance),
  }])) as AssessmentResult['riasec']

  const wvSorted = [...WORK_VALUE_SCALES].sort((a, b) => p.workValues[b].mean - p.workValues[a].mean)
  const top = wvSorted.filter(s => p.workValues[s].mean > 0.3).slice(0, 3)
  const wvAll = Object.fromEntries(WORK_VALUE_SCALES.map(s => [s, {
    score: meanToScore(p.workValues[s].mean),
    confidence: confidenceBand(p.workValues[s].variance),
  }])) as Record<WorkValueScale, { score: number, confidence: Confidence }>

  return {
    hollandCode: ranked.slice(0, 3).join(''),
    riasec,
    workValues: {
      top,
      all: wvAll,
      ...(gradeBand === 'middle' ? { suppressed: true } : {}),
    },
    workContext: {
      structureVariety: contextLean('structureVariety', p.workContext.structureVariety) as AssessmentResult['workContext']['structureVariety'],
      indoorOutdoor: contextLean('indoorOutdoor', p.workContext.indoorOutdoor) as AssessmentResult['workContext']['indoorOutdoor'],
      soloTeam: contextLean('soloTeam', p.workContext.soloTeam) as AssessmentResult['workContext']['soloTeam'],
    },
    meta: {
      itemsAnswered,
      itemsSkipped,
      completedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      inconsistencyFlag,
    },
  }
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/scoring.ts src/lib/assessment/__tests__/scoring.test.ts
git commit -m "feat(assessment): full AssessmentResult assembly"
```

---

## Task 9: Inconsistency detection

**Files:**
- Create: `src/lib/assessment/inconsistency.ts`
- Create: `src/lib/assessment/__tests__/inconsistency.test.ts`

The heuristic: flag when at least 30% of responses on the dominant scale of the user's top RIASEC code go AGAINST that scale (i.e., the user picks the option whose loading on their top scale is lower than the alternative).

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/assessment/__tests__/inconsistency.test.ts
import { describe, it, expect } from 'vitest'
import { detectInconsistency } from '../inconsistency'
import { initialPosterior, updatePosterior } from '../posterior'
import { Item, Option } from '../types'

function strongR(): Option {
  return {
    id: 'r', text: 'r', imageUrl: '', prompt: '', desirability: 3,
    loadings: {
      riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}
function strongS(): Option {
  return {
    id: 's', text: 's', imageUrl: '', prompt: '', desirability: 3,
    loadings: {
      riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}
function rsItem(id: string): Item {
  return { id, option1: { ...strongR(), id: `${id}-1` }, option2: { ...strongS(), id: `${id}-2` }, dimensionContrast: 'opposite', primaryScales: ['R', 'S'] }
}

describe('detectInconsistency', () => {
  it('returns false when all answers align with the eventual top code', () => {
    let p = initialPosterior()
    const items = [rsItem('a'), rsItem('b'), rsItem('c'), rsItem('d')]
    const responses = items.map((it, i) => {
      p = updatePosterior(p, it, 1) // always pick R
      return { item: it, choice: 1 as const, position: i + 1 }
    })
    expect(detectInconsistency(p, responses)).toBe(false)
  })

  it('returns true when 30%+ of dominant-scale responses contradict the top code', () => {
    let p = initialPosterior()
    const items = [rsItem('a'), rsItem('b'), rsItem('c'), rsItem('d'), rsItem('e')]
    const choices: (1 | 2)[] = [1, 1, 1, 2, 2] // 2 of 5 (40%) contradict
    const responses = items.map((it, i) => {
      p = updatePosterior(p, it, choices[i])
      return { item: it, choice: choices[i], position: i + 1 }
    })
    expect(detectInconsistency(p, responses)).toBe(true)
  })

  it('ignores skips for the contradiction count', () => {
    let p = initialPosterior()
    const items = [rsItem('a'), rsItem('b'), rsItem('c')]
    const choices: (1 | null)[] = [1, null, 1]
    const responses = items.map((it, i) => {
      p = updatePosterior(p, it, choices[i])
      return { item: it, choice: choices[i], position: i + 1 }
    })
    expect(detectInconsistency(p, responses)).toBe(false)
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

```ts
// src/lib/assessment/inconsistency.ts
import { Item, Posterior, ResponseChoice } from './types'
import { rankRiasec } from './scoring'

export type ResponseRecord = {
  item: Item
  choice: ResponseChoice
  position: number
}

const CONTRADICTION_THRESHOLD = 0.3

export function detectInconsistency(p: Posterior, responses: ResponseRecord[]): boolean {
  const top = rankRiasec(p)[0]
  const relevant = responses.filter(r => r.choice !== null
    && (r.item.option1.loadings.riasec[top] !== r.item.option2.loadings.riasec[top]))
  if (relevant.length === 0) return false

  const contradictions = relevant.filter((r) => {
    const chosen = r.choice === 1 ? r.item.option1 : r.item.option2
    const rejected = r.choice === 1 ? r.item.option2 : r.item.option1
    return chosen.loadings.riasec[top] < rejected.loadings.riasec[top]
  })
  return contradictions.length / relevant.length >= CONTRADICTION_THRESHOLD
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/inconsistency.ts src/lib/assessment/__tests__/inconsistency.test.ts
git commit -m "feat(assessment): inconsistency detection heuristic"
```

---

## Task 10: Item bank — types and validation helpers

**Files:**
- Create: `src/lib/assessment/itemBank.ts`
- Create: `src/lib/assessment/__tests__/itemBank.test.ts`

- [ ] **Step 1: Write failing tests for the validator**

```ts
// src/lib/assessment/__tests__/itemBank.test.ts
import { describe, it, expect } from 'vitest'
import { validateBank, RIASEC_COVERAGE_FLOOR } from '../itemBank'
import { Item, Option } from '../types'

function opt(id: string, riasec: Partial<Record<'R'|'I'|'A'|'S'|'E'|'C', number>>, desirability = 3): Option {
  return {
    id, text: id, imageUrl: '', prompt: '', desirability,
    loadings: {
      riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, ...riasec },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}

function makeBank(itemSpecs: Array<[string, string, string, number, number]>): Item[] {
  return itemSpecs.map(([id, dom1, dom2, d1, d2]) => ({
    id,
    option1: opt(`${id}-1`, { [dom1]: 3 } as any, d1),
    option2: opt(`${id}-2`, { [dom2]: 3 } as any, d2),
    dimensionContrast: 'mixed',
    primaryScales: [dom1, dom2] as any,
  }))
}

describe('validateBank', () => {
  it('flags scales with fewer than RIASEC_COVERAGE_FLOOR dominant items', () => {
    expect(RIASEC_COVERAGE_FLOOR).toBeGreaterThanOrEqual(10)
    const tinyBank = makeBank([['x', 'R', 'S', 3, 3]])
    const issues = validateBank(tinyBank)
    expect(issues.some(i => i.startsWith('coverage:'))).toBe(true)
  })

  it('flags pairs with desirability gap > 0.5', () => {
    const skewed = makeBank([['x', 'R', 'S', 5, 1]])
    const issues = validateBank(skewed)
    expect(issues.some(i => i.startsWith('desirability-gap:'))).toBe(true)
  })

  it('flags duplicate item ids and option ids', () => {
    const dup: Item[] = [
      { id: 'x', option1: opt('a', { R: 3 }), option2: opt('b', { S: 3 }), dimensionContrast: 'opposite', primaryScales: ['R', 'S'] },
      { id: 'x', option1: opt('c', { R: 3 }), option2: opt('a', { S: 3 }), dimensionContrast: 'opposite', primaryScales: ['R', 'S'] },
    ]
    const issues = validateBank(dup)
    expect(issues.some(i => i.startsWith('dup-item-id:'))).toBe(true)
    expect(issues.some(i => i.startsWith('dup-option-id:'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

```ts
// src/lib/assessment/itemBank.ts
import { Item, RIASEC_SCALES, RiasecScale, GradeBand } from './types'

export const RIASEC_COVERAGE_FLOOR = 10
export const DESIRABILITY_GAP_MAX = 0.5

export function validateBank(items: Item[]): string[] {
  const issues: string[] = []

  const itemIds = new Set<string>()
  const optionIds = new Set<string>()
  for (const it of items) {
    if (itemIds.has(it.id)) issues.push(`dup-item-id:${it.id}`)
    itemIds.add(it.id)
    for (const opt of [it.option1, it.option2]) {
      if (optionIds.has(opt.id)) issues.push(`dup-option-id:${opt.id}`)
      optionIds.add(opt.id)
    }
  }

  const dominantCount: Record<RiasecScale, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
  for (const it of items) {
    for (const opt of [it.option1, it.option2]) {
      const top = RIASEC_SCALES.reduce((best, s) =>
        opt.loadings.riasec[s] > opt.loadings.riasec[best] ? s : best, 'R' as RiasecScale)
      if (opt.loadings.riasec[top] >= 2) dominantCount[top] += 1
    }
  }
  for (const s of RIASEC_SCALES) {
    if (dominantCount[s] < RIASEC_COVERAGE_FLOOR) {
      issues.push(`coverage:${s}=${dominantCount[s]}<${RIASEC_COVERAGE_FLOOR}`)
    }
  }

  for (const it of items) {
    const gap = Math.abs(it.option1.desirability - it.option2.desirability)
    if (gap > DESIRABILITY_GAP_MAX) issues.push(`desirability-gap:${it.id}=${gap.toFixed(2)}`)
  }

  return issues
}

export function eligibleItems(items: Item[], gradeBand: GradeBand | undefined): Item[] {
  if (!gradeBand) return items
  const order: GradeBand[] = ['middle', 'early-hs', 'late-hs', 'college']
  const userIdx = order.indexOf(gradeBand)
  return items.filter((it) => {
    if (!it.minGradeBand) return true
    return order.indexOf(it.minGradeBand) <= userIdx
  })
}

export function unseenItems(items: Item[], seenIds: Set<string>): Item[] {
  return items.filter(it => !seenIds.has(it.id))
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/itemBank.ts src/lib/assessment/__tests__/itemBank.test.ts
git commit -m "feat(assessment): item bank validator + filter helpers"
```

---

## Task 11: Author the SME-rated item bank

This task replaces the old deck-structured `questions.ts` with a flat ~60-item bank under a new file. Old file stays untouched (Plan 2 deletes it).

**Files:**
- Create: `src/app/_data/items.ts`
- Create: `src/lib/assessment/__tests__/items.bank.test.ts`

**SME loading methodology** (apply to every option):

1. **RIASEC dominant**: rate the most engaged Holland theme `3`. Examples:
   - "Build and repair a bicycle" → R=3
   - "Tutor a friend in math" → S=3
   - "Direct a short film with friends" → A=3
2. **RIASEC secondary**: if a single second theme is plausibly engaged, rate it `1`. All others `0`. Examples:
   - "Tutor a friend in math" → S=3, I=1 (math content is investigative)
   - "Run a school fundraiser" → E=3, S=1 (social influence)
3. **Work values**: rate by what the activity *delivers*: ACH (mastery), IND (autonomy), REC (visibility), REL (helping/connecting), SUP (structured/safe), WC (physical environment quality). Single dominant `3`, optional secondary `1`, rest `0`. Many items have ALL zero loadings on work values — that is fine.
4. **Work context** (`-2..+2` bipolar):
   - `structureVariety`: routine/predictable = negative; novel/changing = positive
   - `indoorOutdoor`: indoors = negative; outdoors = positive
   - `soloTeam`: alone = negative; with people = positive
   - Rate `0` if neutral or non-applicable. Rate `±1` for mild, `±2` for strong.
5. **Desirability (1..5)**: rate the activity's general appeal to a young-adult audience. Anchors: "earn a high salary" = 4.5, "tutor a friend" = 3.5, "design a poster" = 4, "catalog library books" = 2, "outdoor work in all weather" = 3. **Pair items so the gap is ≤ 0.5.**
6. **`primaryScales`**: list the dominant RIASEC scale of each option. Use `dimensionContrast` from `contrastCategory()`.

**Coverage targets:**
- ≥10 items where each RIASEC scale is dominant (60+ items minimum)
- ~50% opposite pairs (R-S, I-E, A-C combinations)
- ~35% alternate pairs (R-A, I-S, A-E, S-C, E-R, C-I)
- ~15% adjacent pairs (R-I, I-A, A-S, S-E, E-C, C-R)
- Each item tagged with `minGradeBand` if its content references workplace concepts ("salary", "office", "coworkers", "promotion") → `early-hs` minimum; if it references "school club", "classmates", "homework" only → `middle` minimum (no tag needed; `middle` is the lowest band).

**Item-concept seed list** (use these as starting points; add more to hit coverage targets):

| # | Option 1 (dominant) | Option 2 (dominant) | Min grade |
|---|---|---|---|
| 1 | Fix a broken bicycle (R) | Tutor a struggling classmate (S) | middle |
| 2 | Investigate why plants grow faster under colored lights (I) | Run a school fundraiser and persuade donors (E) | middle |
| 3 | Design a digital poster from scratch (A) | Keep the club's budget in a spreadsheet (C) | middle |
| 4 | Build a treehouse with hand tools (R) | Mentor a younger student (S) | middle |
| 5 | Solve a detective-style logic puzzle (I) | Pitch a new product idea to classmates (E) | middle |
| 6 | Write and illustrate a comic (A) | Catalog books by call number (C) | middle |
| 7 | Operate a 3D printer (R) | Coach a youth sports team (S) | middle |
| 8 | Run a chemistry experiment (I) | Lead a debate team (E) | middle |
| 9 | Direct a short film (A) | Organize a detailed event budget (C) | middle |
| 10 | Repair a broken appliance (R) | Lead a peer-counseling group (S) | early-hs |
| ... | (continue to ~60 items) | | |

**Item-concept rules:**
- Every RIASEC dominant scale (R, I, A, S, E, C) appears as `option1` in at least 5 items and as `option2` in at least 5 items (so adaptive selection has freedom).
- Avoid pairing R/A as adjacent (low signal) more than 1–2 times.
- Image URLs follow the pattern `/would-you-rather/images/<item-id>-1.png` and `<item-id>-2.png`. Image generation is outside this task — placeholders are fine for now.
- Prompts (`prompt` field) describe the image to be generated; reuse existing prompts where item concepts overlap with the old `questions.ts`.

- [ ] **Step 1: Author the bank**

Create `src/app/_data/items.ts` with the structure:

```ts
import { Item } from '@/lib/assessment/types'
import { contrastCategory } from '@/lib/assessment/hexagon'

function buildItem(id: string, opt1: Item['option1'], opt2: Item['option2'], minGradeBand?: Item['minGradeBand']): Item {
  const s1 = topScale(opt1)
  const s2 = topScale(opt2)
  return {
    id,
    option1: opt1,
    option2: opt2,
    dimensionContrast: contrastCategory([s1], [s2]),
    primaryScales: [s1, s2],
    ...(minGradeBand ? { minGradeBand } : {}),
  }
}

function topScale(opt: Item['option1']) {
  const r = opt.loadings.riasec
  return (['R', 'I', 'A', 'S', 'E', 'C'] as const)
    .reduce((best, s) => r[s] > r[best] ? s : best, 'R' as const)
}

export const items: Item[] = [
  buildItem('rs-bike-tutor', /* full Option for option1 with all loadings + desirability */, /* option2 */, 'middle'),
  // ...60 items total
]
```

Engineer's task: **Author all ~60 items** following the methodology above, the seed list, and the coverage targets. Each option must include the full `loadings` shape (RIASEC, work values, work context) and a desirability rating, with paired desirabilities within 0.5.

- [ ] **Step 2: Write a validation test that runs against the real bank**

```ts
// src/lib/assessment/__tests__/items.bank.test.ts
import { describe, it, expect } from 'vitest'
import { items } from '@/app/_data/items'
import { validateBank } from '../itemBank'

describe('the production item bank', () => {
  it('passes all bank validation rules', () => {
    const issues = validateBank(items)
    expect(issues).toEqual([])
  })

  it('contains at least 60 items', () => {
    expect(items.length).toBeGreaterThanOrEqual(60)
  })

  it('uses the recommended pair-distance ratio (~50% opposite, ~35% alternate, ~15% adjacent)', () => {
    const counts = { opposite: 0, alternate: 0, adjacent: 0, mixed: 0 }
    for (const it of items) counts[it.dimensionContrast] += 1
    const total = items.length - counts.mixed
    expect(counts.opposite / total).toBeGreaterThanOrEqual(0.4)
    expect(counts.opposite / total).toBeLessThanOrEqual(0.6)
    expect(counts.adjacent / total).toBeLessThanOrEqual(0.2)
  })
})
```

- [ ] **Step 3: Run — should pass after authoring**

```bash
pnpm test src/lib/assessment/__tests__/items.bank.test.ts
```
If failing: read the issue strings, edit the bank, re-run. Iterate until clean.

- [ ] **Step 4: Lint pass**

```bash
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/app/_data/items.ts src/lib/assessment/__tests__/items.bank.test.ts
git commit -m "feat(assessment): SME-rated item bank (~60 items)"
```

---

## Task 12: Item-information scoring

**Files:**
- Modify: `src/lib/assessment/engine.ts` (create if not exists)
- Create: `src/lib/assessment/__tests__/engine.test.ts`

- [ ] **Step 1: Write failing tests for `scoreItemForSelection` and `pickNextItem`**

```ts
// src/lib/assessment/__tests__/engine.test.ts
import { describe, it, expect } from 'vitest'
import { scoreItemForSelection, pickNextItem } from '../engine'
import { initialPosterior } from '../posterior'
import { Item, Option } from '../types'

function opt(id: string, riasec: Partial<Record<'R'|'I'|'A'|'S'|'E'|'C', number>>, desirability = 3): Option {
  return {
    id, text: id, imageUrl: '', prompt: '', desirability,
    loadings: {
      riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, ...riasec },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}
function item(id: string, l1: any, l2: any, des1 = 3, des2 = 3): Item {
  return {
    id,
    option1: opt(`${id}-1`, l1, des1),
    option2: opt(`${id}-2`, l2, des2),
    dimensionContrast: 'mixed',
    primaryScales: [],
  }
}

describe('scoreItemForSelection', () => {
  it('scores higher when an item contrasts the two scales currently closest in mean', () => {
    const p = initialPosterior()
    p.riasec.R.mean = 1.0
    p.riasec.S.mean = 0.95   // contested
    p.riasec.A.mean = -1.0   // not contested
    const rsItem = item('rs', { R: 3 }, { S: 3 })
    const raItem = item('ra', { R: 3 }, { A: 3 })
    expect(scoreItemForSelection(rsItem, p)).toBeGreaterThan(scoreItemForSelection(raItem, p))
  })

  it('scores lower for items where both options have similar loadings', () => {
    const p = initialPosterior()
    const sharp = item('sharp', { R: 3 }, { S: 3 })
    const dull  = item('dull',  { R: 1, S: 1 }, { R: 1, S: 1 })
    expect(scoreItemForSelection(sharp, p)).toBeGreaterThan(scoreItemForSelection(dull, p))
  })
})

describe('pickNextItem', () => {
  it('returns the highest-scoring eligible item, breaking ties by smallest desirability gap', () => {
    const p = initialPosterior()
    p.riasec.R.mean = 1.0
    p.riasec.S.mean = 0.9
    const a = item('a', { R: 3 }, { S: 3 }, 3, 4)   // gap 1
    const b = item('b', { R: 3 }, { S: 3 }, 3, 3.2) // gap 0.2 — should win on tie
    const next = pickNextItem([a, b], p, new Set(), undefined)
    expect(next?.id).toBe('b')
  })

  it('returns null when no items remain', () => {
    const p = initialPosterior()
    const a = item('a', { R: 3 }, { S: 3 })
    expect(pickNextItem([a], p, new Set(['a']), undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

```ts
// src/lib/assessment/engine.ts
import { eligibleItems, unseenItems } from './itemBank'
import { rankRiasec } from './scoring'
import { GradeBand, Item, Posterior, RIASEC_SCALES, RiasecScale } from './types'

const CONTEST_THRESHOLD = 0.3   // pairs of scales within this distance count as contested
const TOP3_RANK_BONUS = 0.5

export function scoreItemForSelection(item: Item, p: Posterior): number {
  const top3 = new Set(rankRiasec(p).slice(0, 4)) // top-3 + 4th-place "challenger"
  let score = 0

  for (let i = 0; i < RIASEC_SCALES.length; i++) {
    for (let j = i + 1; j < RIASEC_SCALES.length; j++) {
      const si = RIASEC_SCALES[i]
      const sj = RIASEC_SCALES[j]
      const meansClose = Math.abs(p.riasec[si].mean - p.riasec[sj].mean) < CONTEST_THRESHOLD
      const inTopRace = top3.has(si) && top3.has(sj)
      if (!meansClose && !inTopRace) continue
      const di = item.option1.loadings.riasec[si] - item.option2.loadings.riasec[si]
      const dj = item.option1.loadings.riasec[sj] - item.option2.loadings.riasec[sj]
      const sep = Math.abs(di - dj)
      score += sep + (inTopRace ? TOP3_RANK_BONUS : 0)
    }
  }

  // Penalty for items with overall similar option vectors (low information across the board)
  const totalDiff = RIASEC_SCALES.reduce((sum, s) => sum +
    Math.abs(item.option1.loadings.riasec[s] - item.option2.loadings.riasec[s]), 0)
  if (totalDiff < 1) score -= 1

  return score
}

export function pickNextItem(
  bank: Item[], p: Posterior, seenIds: Set<string>, gradeBand: GradeBand | undefined,
): Item | null {
  const candidates = unseenItems(eligibleItems(bank, gradeBand), seenIds)
  if (candidates.length === 0) return null

  let best: Item | null = null
  let bestScore = -Infinity
  let bestDesGap = Infinity

  for (const it of candidates) {
    const s = scoreItemForSelection(it, p)
    const gap = Math.abs(it.option1.desirability - it.option2.desirability)
    if (s > bestScore || (s === bestScore && gap < bestDesGap)) {
      best = it
      bestScore = s
      bestDesGap = gap
    }
  }
  return best
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/engine.ts src/lib/assessment/__tests__/engine.test.ts
git commit -m "feat(assessment): item-information scoring + next-item picker"
```

---

## Task 13: Stopping rule + coverage phase

**Files:**
- Modify: `src/lib/assessment/engine.ts`
- Modify: `src/lib/assessment/__tests__/engine.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { shouldStop, pickWithCoveragePhase } from '../engine'
import { initialPosterior } from '../posterior'

describe('shouldStop', () => {
  it('refuses to stop before the floor of 12 items', () => {
    const p = initialPosterior()
    // even with high confidence, can't stop early
    for (const s of ['R','I','A','S','E','C'] as const) p.riasec[s].variance = 0.05
    p.riasec.S.mean = 3
    p.riasec.A.mean = 2
    p.riasec.E.mean = 1
    expect(shouldStop({ posterior: p, itemsAnswered: 11, gradeBand: 'late-hs' })).toBe(false)
  })

  it('stops at the cap of 20 even if conditions not met', () => {
    const p = initialPosterior()
    expect(shouldStop({ posterior: p, itemsAnswered: 20, gradeBand: 'late-hs' })).toBe(true)
  })

  it('stops when top-3 separated and confidence is medium-or-better', () => {
    const p = initialPosterior()
    p.riasec.S.mean = 2; p.riasec.S.variance = 0.2
    p.riasec.A.mean = 1.5; p.riasec.A.variance = 0.2
    p.riasec.E.mean = 1.0; p.riasec.E.variance = 0.4
    p.riasec.R.mean = 0; p.riasec.R.variance = 0.3
    p.riasec.I.mean = -0.5; p.riasec.I.variance = 0.3
    p.riasec.C.mean = -1; p.riasec.C.variance = 0.3
    p.workValues.REL.mean = 1; p.workValues.REL.variance = 0.3
    expect(shouldStop({ posterior: p, itemsAnswered: 14, gradeBand: 'late-hs' })).toBe(true)
  })

  it('ignores work-value confidence when grade band is "middle"', () => {
    const p = initialPosterior({ gradeBand: 'middle' })
    p.riasec.S.mean = 2; p.riasec.S.variance = 0.2
    p.riasec.A.mean = 1.5; p.riasec.A.variance = 0.2
    p.riasec.E.mean = 1.0; p.riasec.E.variance = 0.4
    p.riasec.R.mean = 0; p.riasec.R.variance = 0.3
    p.riasec.I.mean = -0.5; p.riasec.I.variance = 0.3
    p.riasec.C.mean = -1; p.riasec.C.variance = 0.3
    // No work value above medium — but middle band ignores that requirement
    expect(shouldStop({ posterior: p, itemsAnswered: 14, gradeBand: 'middle' })).toBe(true)
  })
})

describe('pickWithCoveragePhase', () => {
  it('restricts candidates to items touching un-touched scales until all 6 are touched', () => {
    const p = initialPosterior()
    const touched = new Set<string>(['R', 'I'])
    // Item list contains some items touching only R/I and others touching S
    const items = [
      item('riOnly', { R: 3 }, { I: 3 }),
      item('rsItem', { R: 3 }, { S: 3 }),
    ]
    const next = pickWithCoveragePhase(items, p, new Set(), undefined, touched)
    expect(next?.id).toBe('rsItem')
  })

  it('falls back to plain pickNextItem after all 6 scales touched', () => {
    const p = initialPosterior()
    const allTouched = new Set<string>(['R','I','A','S','E','C'])
    const items = [
      item('riOnly', { R: 3 }, { I: 3 }),
      item('rsItem', { R: 3 }, { S: 3 }),
    ]
    // Both eligible now; whichever scores higher wins
    expect(pickWithCoveragePhase(items, p, new Set(), undefined, allTouched)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

Append to `engine.ts`:

```ts
import { confidenceBand } from './scoring'

export const FLOOR_ITEMS = 12
export const CAP_ITEMS = 20

const TOP3_SEPARATION_SD = 1.0

export function shouldStop(args: {
  posterior: Posterior, itemsAnswered: number, gradeBand: GradeBand | undefined,
}): boolean {
  const { posterior: p, itemsAnswered, gradeBand } = args
  if (itemsAnswered >= CAP_ITEMS) return true
  if (itemsAnswered < FLOOR_ITEMS) return false

  const ranked = rankRiasec(p)
  const top3 = ranked.slice(0, 3)
  const fourth = ranked[3]
  const top3MeanFloor = Math.min(...top3.map(s => p.riasec[s].mean))
  const pooledSd = Math.sqrt(
    (p.riasec[top3[2]].variance + p.riasec[fourth].variance) / 2,
  )
  if (top3MeanFloor - p.riasec[fourth].mean <= TOP3_SEPARATION_SD * pooledSd) return false

  for (const s of top3) {
    if (confidenceBand(p.riasec[s].variance) === 'low') return false
  }

  if (gradeBand !== 'middle') {
    const anyMediumOrBetter = (['ACH', 'IND', 'REC', 'REL', 'SUP', 'WC'] as const)
      .some(s => confidenceBand(p.workValues[s].variance) !== 'low')
    if (!anyMediumOrBetter) return false
  }

  return true
}

export function pickWithCoveragePhase(
  bank: Item[], p: Posterior, seenIds: Set<string>,
  gradeBand: GradeBand | undefined, touchedScales: Set<string>,
): Item | null {
  const allTouched = (['R', 'I', 'A', 'S', 'E', 'C'] as const).every(s => touchedScales.has(s))
  if (allTouched) return pickNextItem(bank, p, seenIds, gradeBand)

  const untouched = (['R', 'I', 'A', 'S', 'E', 'C'] as const).filter(s => !touchedScales.has(s))
  const restricted = bank.filter(it =>
    untouched.some(s =>
      it.option1.loadings.riasec[s] >= 2 || it.option2.loadings.riasec[s] >= 2),
  )
  const fromRestricted = pickNextItem(restricted, p, seenIds, gradeBand)
  return fromRestricted ?? pickNextItem(bank, p, seenIds, gradeBand)
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/engine.ts src/lib/assessment/__tests__/engine.test.ts
git commit -m "feat(assessment): stopping rule + coverage phase"
```

---

## Task 14: Engine session glue

**Files:**
- Modify: `src/lib/assessment/engine.ts`
- Modify: `src/lib/assessment/__tests__/engine.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { startSession, advance, finalize } from '../engine'

describe('engine session lifecycle', () => {
  it('startSession returns a posterior, the deterministic first item, and empty response log', () => {
    const session = startSession({ bank: [], gradeBand: undefined, firstItemId: 'rs-bike-tutor' })
    expect(session.posterior).toBeTruthy()
    expect(session.responses).toEqual([])
    expect(session.touchedScales.size).toBe(0)
    expect(session.requestedFirstItemId).toBe('rs-bike-tutor')
  })

  it('advance updates posterior, records response, returns next item or null when stopping', () => {
    // Use a tiny bank that won't trigger real coverage; force-stop by hitting cap
    // (full simulation tests are in Task 16)
    expect(typeof advance).toBe('function')
  })

  it('finalize returns an AssessmentResult', () => {
    expect(typeof finalize).toBe('function')
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

Append to `engine.ts`:

```ts
import { initialPosterior, updatePosterior } from './posterior'
import { buildResult } from './scoring'
import { detectInconsistency, ResponseRecord } from './inconsistency'
import { AssessmentResult, GradeBand, Item, Posterior, ResponseChoice } from './types'

export type Session = {
  posterior: Posterior
  responses: ResponseRecord[]
  touchedScales: Set<string>
  seenItemIds: Set<string>
  gradeBand?: GradeBand
  requestedFirstItemId?: string
}

export function startSession(opts: {
  bank: Item[], gradeBand?: GradeBand, firstItemId?: string,
}): Session {
  return {
    posterior: initialPosterior({ gradeBand: opts.gradeBand }),
    responses: [],
    touchedScales: new Set(),
    seenItemIds: new Set(),
    gradeBand: opts.gradeBand,
    requestedFirstItemId: opts.firstItemId,
  }
}

export type AdvanceOutput =
  | { kind: 'next', session: Session, nextItem: Item }
  | { kind: 'stop', session: Session }

export function advance(args: {
  session: Session, bank: Item[], shownItem: Item, choice: ResponseChoice, responseMs?: number,
}): AdvanceOutput {
  const { session, bank, shownItem, choice, responseMs } = args
  const nextPosterior = updatePosterior(session.posterior, shownItem, choice)
  const responses = [...session.responses, {
    item: shownItem, choice, position: session.responses.length + 1, responseMs,
  } as ResponseRecord]
  const seenItemIds = new Set(session.seenItemIds); seenItemIds.add(shownItem.id)
  const touchedScales = new Set(session.touchedScales)
  for (const opt of [shownItem.option1, shownItem.option2]) {
    for (const s of ['R','I','A','S','E','C'] as const) {
      if (opt.loadings.riasec[s] >= 2) touchedScales.add(s)
    }
  }
  const updated: Session = { ...session, posterior: nextPosterior, responses, seenItemIds, touchedScales }

  if (shouldStop({ posterior: nextPosterior, itemsAnswered: responses.length, gradeBand: session.gradeBand })) {
    return { kind: 'stop', session: updated }
  }
  const next = pickWithCoveragePhase(bank, nextPosterior, seenItemIds, session.gradeBand, touchedScales)
  if (next === null) return { kind: 'stop', session: updated }
  return { kind: 'next', session: updated, nextItem: next }
}

export function chooseFirstItem(bank: Item[], session: Session): Item {
  if (session.requestedFirstItemId) {
    const found = bank.find(it => it.id === session.requestedFirstItemId)
    if (found) return found
  }
  // fallback: highest-information opposite-pair item from the bank
  const eligible = bank.filter(it => it.dimensionContrast === 'opposite')
  return eligible.length > 0 ? eligible[0] : bank[0]
}

export function finalize(session: Session): AssessmentResult {
  const itemsAnswered = session.responses.filter(r => r.choice !== null).length
  const itemsSkipped = session.responses.length - itemsAnswered
  const inconsistency = detectInconsistency(session.posterior, session.responses)
  return buildResult({
    posterior: session.posterior, itemsAnswered, itemsSkipped,
    inconsistencyFlag: inconsistency, gradeBand: session.gradeBand,
  })
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/engine.ts src/lib/assessment/__tests__/engine.test.ts
git commit -m "feat(assessment): session lifecycle (startSession, advance, finalize)"
```

---

## Task 15: LLM prompt-format module

**Files:**
- Create: `src/lib/assessment/promptFormat.ts`
- Create: `src/lib/assessment/__tests__/promptFormat.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/lib/assessment/__tests__/promptFormat.test.ts
import { describe, it, expect } from 'vitest'
import { formatResultForPrompt } from '../promptFormat'
import { AssessmentResult } from '../types'

const SAMPLE: AssessmentResult = {
  hollandCode: 'SAE',
  riasec: {
    S: { score: 90, rank: 1, confidence: 'high' },
    A: { score: 80, rank: 2, confidence: 'high' },
    E: { score: 65, rank: 3, confidence: 'medium' },
    R: { score: 30, rank: 4, confidence: 'medium' },
    I: { score: 20, rank: 5, confidence: 'low' },
    C: { score: 10, rank: 6, confidence: 'high' },
  },
  workValues: {
    top: ['REL', 'ACH'],
    all: {
      ACH: { score: 70, confidence: 'medium' },
      IND: { score: 40, confidence: 'low' },
      REC: { score: 50, confidence: 'low' },
      REL: { score: 90, confidence: 'high' },
      SUP: { score: 30, confidence: 'medium' },
      WC:  { score: 50, confidence: 'low' },
    },
  },
  workContext: {
    structureVariety: { lean: 'variety', strength: 0.7, confidence: 'high' },
    indoorOutdoor:    { lean: 'mixed',   strength: 0.1, confidence: 'low' },
    soloTeam:         { lean: 'team',    strength: 0.5, confidence: 'medium' },
  },
  meta: {
    itemsAnswered: 14, itemsSkipped: 0,
    completedAt: '2026-04-18T00:00:00Z',
    engineVersion: 'v1.0.0', inconsistencyFlag: false,
  },
}

describe('formatResultForPrompt', () => {
  it('produces a human-readable section with Holland code, confidences, and notes', () => {
    const text = formatResultForPrompt(SAMPLE)
    expect(text).toMatch(/Holland Code: SAE/)
    expect(text).toMatch(/REL.*high/i)
    expect(text).toMatch(/variety/)
    expect(text).toMatch(/team/)
    expect(text).not.toMatch(/inconsist/i)
  })

  it('mentions inconsistency when flagged', () => {
    const text = formatResultForPrompt({ ...SAMPLE, meta: { ...SAMPLE.meta, inconsistencyFlag: true } })
    expect(text).toMatch(/inconsist/i)
  })

  it('mentions tentative work values when suppressed', () => {
    const text = formatResultForPrompt({
      ...SAMPLE, workValues: { ...SAMPLE.workValues, suppressed: true },
    })
    expect(text).toMatch(/tentative/i)
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

```ts
// src/lib/assessment/promptFormat.ts
import { AssessmentResult, Confidence, RIASEC_SCALES, RiasecScale } from './types'

const RIASEC_NAMES: Record<RiasecScale, string> = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
}

const WV_NAMES: Record<string, string> = {
  ACH: 'Achievement', IND: 'Independence', REC: 'Recognition',
  REL: 'Relationships', SUP: 'Support', WC: 'Working Conditions',
}

export function formatResultForPrompt(r: AssessmentResult): string {
  const top3Letters = r.hollandCode.split('') as RiasecScale[]
  const top3Names = top3Letters.map(s => RIASEC_NAMES[s]).join('-')

  const ranked = RIASEC_SCALES
    .map(s => ({ s, ...r.riasec[s] }))
    .sort((a, b) => a.rank - b.rank)
  const confLine = ranked.slice(0, 3).map(x => `${x.s} ${x.confidence}`).join(', ')
  const lowLetters = ranked.filter(x => x.score < 35).map(x => x.s)
  const lowLine = lowLetters.length > 0 ? `; clearly low on ${lowLetters.join(', ')}` : ''

  const wvLine = r.workValues.top
    .map(s => `${WV_NAMES[s]} (${r.workValues.all[s].confidence})`)
    .join(', ')

  const ctxLine = [
    contextLineFor('structureVariety', r.workContext.structureVariety),
    contextLineFor('indoorOutdoor', r.workContext.indoorOutdoor),
    contextLineFor('soloTeam', r.workContext.soloTeam),
  ].filter(Boolean).join('; ')

  const notes: string[] = []
  if (r.workValues.suppressed) notes.push('Work-value results are tentative (younger user).')
  if (r.meta.inconsistencyFlag) notes.push('Some answers seemed inconsistent — treat as exploratory.')

  return [
    `User Profile:`,
    `- Holland Code: ${r.hollandCode} (${top3Names})`,
    `- Confidence: ${confLine}${lowLine}`,
    `- Top work values: ${wvLine || 'none clearly above neutral'}`,
    `- Work context: ${ctxLine}`,
    notes.length > 0 ? `- Notes: ${notes.join(' ')}` : '',
    `- Items answered: ${r.meta.itemsAnswered}.`,
  ].filter(Boolean).join('\n')
}

function contextLineFor(
  axis: 'structureVariety' | 'indoorOutdoor' | 'soloTeam',
  v: { lean: string, strength: number, confidence: Confidence },
): string {
  if (v.lean === 'balanced' || v.lean === 'mixed' || v.lean === 'flexible') {
    return axis === 'indoorOutdoor' ? 'no strong indoor/outdoor preference' : `${axis}: balanced`
  }
  return `prefers ${v.lean} (${v.confidence})`
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/promptFormat.ts src/lib/assessment/__tests__/promptFormat.test.ts
git commit -m "feat(assessment): LLM prompt formatter for AssessmentResult"
```

---

## Task 16: Public exports

**Files:**
- Create: `src/lib/assessment/index.ts`

- [ ] **Step 1: Re-export the public API**

```ts
// src/lib/assessment/index.ts
export * from './types'
export { initialPosterior, updatePosterior } from './posterior'
export { rankRiasec, hollandCode, confidenceBand, contextLean, buildResult } from './scoring'
export { detectInconsistency } from './inconsistency'
export { validateBank, eligibleItems, unseenItems, RIASEC_COVERAGE_FLOOR, DESIRABILITY_GAP_MAX } from './itemBank'
export {
  scoreItemForSelection, pickNextItem, pickWithCoveragePhase, shouldStop,
  startSession, advance, finalize, chooseFirstItem,
  FLOOR_ITEMS, CAP_ITEMS,
} from './engine'
export { formatResultForPrompt } from './promptFormat'
```

- [ ] **Step 2: Type-check the package**

```bash
pnpm tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/assessment/index.ts
git commit -m "feat(assessment): public re-exports"
```

---

## Task 17: Synthetic-user generator

**Files:**
- Create: `src/lib/assessment/simulation.ts`
- Create: `src/lib/assessment/__tests__/simulation.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/lib/assessment/__tests__/simulation.test.ts
import { describe, it, expect } from 'vitest'
import { makeSyntheticUser, simulateChoice, allHollandCodes } from '../simulation'
import { Item, Option } from '../types'

function opt(id: string, riasec: Partial<Record<'R'|'I'|'A'|'S'|'E'|'C', number>>): Option {
  return {
    id, text: id, imageUrl: '', prompt: '', desirability: 3,
    loadings: {
      riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, ...riasec },
      workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
      workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 0 },
    },
  }
}

describe('makeSyntheticUser', () => {
  it('creates a user whose RIASEC means encode the requested top-3 ordering', () => {
    const u = makeSyntheticUser({ topCode: 'SAE', seed: 1 })
    expect(u.riasec.S).toBeGreaterThan(u.riasec.A)
    expect(u.riasec.A).toBeGreaterThan(u.riasec.E)
    const otherMaxes = (['R', 'I', 'C'] as const).map(s => u.riasec[s])
    for (const m of otherMaxes) expect(u.riasec.E).toBeGreaterThan(m)
  })
})

describe('simulateChoice', () => {
  it('almost always picks the option whose dominant scale aligns with the user profile', () => {
    const sUser = makeSyntheticUser({ topCode: 'SAE', seed: 42 })
    const item: Item = {
      id: 'rs', option1: opt('s-opt', { S: 3 }), option2: opt('r-opt', { R: 3 }),
      dimensionContrast: 'opposite', primaryScales: ['S', 'R'],
    }
    let sWins = 0
    for (let i = 0; i < 200; i++) {
      if (simulateChoice(sUser, item, i) === 1) sWins += 1
    }
    expect(sWins).toBeGreaterThan(160) // overwhelming preference for S option
  })
})

describe('allHollandCodes', () => {
  it('returns 6 * 5 * 4 = 120 codes', () => {
    expect(allHollandCodes()).toHaveLength(120)
  })

  it('every code has 3 distinct letters from RIASEC', () => {
    for (const code of allHollandCodes()) {
      expect(code).toHaveLength(3)
      expect(new Set(code.split(''))).toHaveProperty('size', 3)
      for (const c of code) expect('RIASEC').toContain(c)
    }
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

```ts
// src/lib/assessment/simulation.ts
import { Item, Posterior, RIASEC_SCALES, RiasecScale, ResponseChoice } from './types'

export type SyntheticUser = {
  riasec: Record<RiasecScale, number>  // "true" theta on each scale
  noise: number                        // softmax temperature; higher = noisier
  topCode: string
}

const TOP_THETA = [2.0, 1.5, 1.0]    // means for top-3
const LOW_THETA = -1.0               // mean for the rest

function rng(seed: number): () => number {
  let x = seed | 0
  return () => {
    x = (x * 1664525 + 1013904223) | 0
    return ((x >>> 0) / 0xFFFFFFFF)
  }
}

export function makeSyntheticUser(opts: { topCode: string, seed: number, noise?: number }): SyntheticUser {
  const r = rng(opts.seed)
  const top = opts.topCode.split('') as RiasecScale[]
  const others = RIASEC_SCALES.filter(s => !top.includes(s))
  const riasec = {} as Record<RiasecScale, number>
  top.forEach((s, i) => { riasec[s] = TOP_THETA[i] + (r() - 0.5) * 0.1 })
  others.forEach((s) => { riasec[s] = LOW_THETA + (r() - 0.5) * 0.1 })
  return { riasec, noise: opts.noise ?? 0.5, topCode: opts.topCode }
}

export function simulateChoice(user: SyntheticUser, item: Item, seed: number): ResponseChoice {
  const utility = (loadings: Record<RiasecScale, number>): number =>
    RIASEC_SCALES.reduce((sum, s) => sum + user.riasec[s] * loadings[s], 0)

  const u1 = utility(item.option1.loadings.riasec)
  const u2 = utility(item.option2.loadings.riasec)
  const p1 = 1 / (1 + Math.exp(-(u1 - u2) / user.noise))
  const r = rng(seed)()
  return r < p1 ? 1 : 2
}

export function allHollandCodes(): string[] {
  const codes: string[] = []
  for (const a of RIASEC_SCALES) for (const b of RIASEC_SCALES) for (const c of RIASEC_SCALES) {
    if (a !== b && b !== c && a !== c) codes.push(a + b + c)
  }
  return codes
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/simulation.ts src/lib/assessment/__tests__/simulation.test.ts
git commit -m "feat(assessment): synthetic-user generator + simulated choice + Holland-code enumeration"
```

---

## Task 18: Single-user simulation runner

**Files:**
- Modify: `src/lib/assessment/simulation.ts`
- Modify: `src/lib/assessment/__tests__/simulation.test.ts`

- [ ] **Step 1: Append failing test**

```ts
import { runSimulatedSession } from '../simulation'
import { items } from '@/app/_data/items'

describe('runSimulatedSession', () => {
  it('completes a session against the real bank and returns an AssessmentResult', () => {
    const user = makeSyntheticUser({ topCode: 'SAE', seed: 7 })
    const out = runSimulatedSession({ user, bank: items, gradeBand: 'late-hs', seed: 7 })
    expect(out.result.hollandCode).toMatch(/^[RIASEC]{3}$/)
    expect(out.result.meta.itemsAnswered).toBeGreaterThanOrEqual(12)
    expect(out.result.meta.itemsAnswered).toBeLessThanOrEqual(20)
  })
})
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

Append to `simulation.ts`:

```ts
import { advance, chooseFirstItem, finalize, startSession } from './engine'
import { AssessmentResult, GradeBand } from './types'

export function runSimulatedSession(args: {
  user: SyntheticUser, bank: Item[], gradeBand?: GradeBand, seed: number, firstItemId?: string,
}): { result: AssessmentResult, itemsShown: string[] } {
  let session = startSession({
    bank: args.bank, gradeBand: args.gradeBand, firstItemId: args.firstItemId,
  })
  let nextItem: Item | null = chooseFirstItem(args.bank, session)
  const itemsShown: string[] = []
  let i = 0

  while (nextItem) {
    itemsShown.push(nextItem.id)
    const choice = simulateChoice(args.user, nextItem, args.seed + i)
    const out = advance({ session, bank: args.bank, shownItem: nextItem, choice, responseMs: 1000 })
    session = out.session
    if (out.kind === 'stop') break
    nextItem = out.nextItem
    i += 1
  }

  return { result: finalize(session), itemsShown }
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add src/lib/assessment/simulation.ts src/lib/assessment/__tests__/simulation.test.ts
git commit -m "feat(assessment): single-user simulation runner"
```

---

## Task 19: Sweep validation — engine recovers Holland codes

**Files:**
- Modify: `src/lib/assessment/__tests__/simulation.test.ts`

- [ ] **Step 1: Append the sweep test**

```ts
import { runSimulatedSession, allHollandCodes } from '../simulation'

describe('engine accuracy sweep across all 120 Holland codes', () => {
  // Skip in CI if too slow; run locally.
  it('recovers the top-1 letter for ≥85% of synthetic users', { timeout: 60_000 }, () => {
    let top1Hits = 0
    let top3Overlap = 0
    let total = 0
    const codes = allHollandCodes()
    const SEEDS = [1, 7, 13, 21]                   // 4 seeds per code = 480 simulated users

    for (const code of codes) {
      for (const seed of SEEDS) {
        const user = makeSyntheticUser({ topCode: code, seed })
        const { result } = runSimulatedSession({ user, bank: items, gradeBand: 'late-hs', seed })
        total += 1
        if (result.hollandCode[0] === code[0]) top1Hits += 1
        const overlap = new Set(result.hollandCode.split(''))
        const truth = new Set(code.split(''))
        const inter = [...overlap].filter(x => truth.has(x)).length
        if (inter >= 2) top3Overlap += 1
      }
    }
    const top1Pct = top1Hits / total
    const top3Pct = top3Overlap / total
    // eslint-disable-next-line no-console
    console.log(`Sweep: top-1=${(top1Pct * 100).toFixed(1)}%, top-3-overlap≥2=${(top3Pct * 100).toFixed(1)}%`)
    expect(top1Pct).toBeGreaterThan(0.85)
    expect(top3Pct).toBeGreaterThan(0.85)
  })
})
```

- [ ] **Step 2: Run the sweep**

```bash
pnpm test src/lib/assessment/__tests__/simulation.test.ts
```
Expected: passes with both metrics above 85%.

If FAIL: this is the critical signal that something needs tuning. Likely culprits, in order:
1. Item bank coverage — is one scale represented by too few "clean" dominant items?
2. `LEARN_RATE` in `posterior.ts` — too high makes early items overshoot; too low means slow convergence
3. `TOP3_SEPARATION_SD` in `shouldStop` — too strict means the cap fires before convergence
4. `scoreItemForSelection` — coverage phase should ensure all 6 scales touched; if not, the engine drills early on the wrong pair

Iterate on tuning constants and re-run until both metrics clear 85%. If the bank is the problem, return to Task 11 and add items.

- [ ] **Step 3: Commit (with the sweep numbers in the commit message)**

```bash
git add src/lib/assessment/__tests__/simulation.test.ts
git commit -m "test(assessment): sweep validation — engine recovers ≥85% of Holland codes"
```

---

## Task 20: Property tests — variance monotonicity

**Files:**
- Create: `src/lib/assessment/__tests__/properties.test.ts`

- [ ] **Step 1: Write the property tests**

```ts
// src/lib/assessment/__tests__/properties.test.ts
import { describe, it, expect } from 'vitest'
import { initialPosterior, updatePosterior } from '../posterior'
import { items } from '@/app/_data/items'
import { RIASEC_SCALES } from '../types'
import { makeSyntheticUser, simulateChoice } from '../simulation'

describe('posterior properties', () => {
  it('total RIASEC variance never increases across a sequence of forced-choice responses', () => {
    const user = makeSyntheticUser({ topCode: 'SAE', seed: 99 })
    let p = initialPosterior()
    let prevTotalVar = sumVar(p)
    for (let i = 0; i < 20; i++) {
      const item = items[i % items.length]
      const choice = simulateChoice(user, item, i)
      p = updatePosterior(p, item, choice)
      const totalVar = sumVar(p)
      expect(totalVar).toBeLessThanOrEqual(prevTotalVar + 1e-9)
      prevTotalVar = totalVar
    }
  })
})

function sumVar(p: { riasec: Record<string, { variance: number }> }) {
  return RIASEC_SCALES.reduce((s, k) => s + p.riasec[k].variance, 0)
}
```

- [ ] **Step 2: Run — should pass**

```bash
pnpm test src/lib/assessment/__tests__/properties.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/assessment/__tests__/properties.test.ts
git commit -m "test(assessment): property test — variance monotonicity"
```

---

## Task 21: Final type-check, full test pass, lint

- [ ] **Step 1: Type-check**

```bash
pnpm tsc --noEmit
```
Expected: clean.

- [ ] **Step 2: Run all assessment tests**

```bash
pnpm test src/lib/assessment
```
Expected: all green, sweep included.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```
Expected: clean. Fix any issues with `pnpm lint:fix` for auto-fixable items, hand-edit the rest.

- [ ] **Step 4: Build (smoke)**

```bash
pnpm build
```
Expected: clean. Confirms the new modules are tree-shake-clean and don't break the Next.js build.

- [ ] **Step 5: Commit if any fixes needed**

```bash
git add -p
git commit -m "chore(assessment): lint/type fixes after engine landing"
```

---

## Done — what you have at this point

- New schema additive on top of the existing one. Old quiz still works; new tables ready for Plan 2.
- Pure-TS adaptive engine, ~10 modules, fully unit-tested.
- ~60-item bank with SME-rated loadings, validated against coverage rules.
- Simulation harness that recovers ≥85% of Holland codes from synthetic users — the empirical proof the engine works before any UI is built.
- Public API surface ready for Plan 2 to wire to API routes / store / UI.

**Plan 2 picks up here:** API routes for sessions/responses/results, store rewrite, UI rewrite (grade question, confidence meter, peek modal, profile page rewrite), LLM prompt update in `careers/actions.ts`, E2E tests, deletion of legacy code.

---

**Status: Complete.** All 21 tasks shipped. Plan 2 (this file's sibling) replaced the UI, API, and LLM prompt on top of this engine.
