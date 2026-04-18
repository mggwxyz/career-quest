# O*NET Career Explorer + Role-Play Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the thin `/careers/[onetId]` detail page with a full O*NET-backed career explorer: a new `/careers/explore` browse page, rich inline O*NET details on each career detail page, slug-based URLs, and a role-play chat persona grounded in O*NET data.

**Architecture:** Server-first (Next.js App Router Server Components) + one-shot daily revalidation for O*NET detail calls + a local Postgres mirror (`onet_occupations`) backing all browse/filter queries. Chat remains a client island against the existing `/api/careers/chat` route, extended with a new request schema.

**Tech Stack:** Next.js 16, Drizzle ORM over Neon HTTP, Zod, Vercel AI SDK with OpenAI, Vitest, Playwright. Spec: `docs/superpowers/specs/2026-04-18-career-role-chat-design.md`.

---

## File structure

**New files:**
- `src/lib/onet/client.ts` — O*NET WS fetch wrapper (auth, revalidation, zod)
- `src/lib/onet/schemas.ts` — Zod schemas for O*NET JSON responses
- `src/lib/onet/occupations.ts` — `getCareerDetail`, `resolveSlug`, `getOccupationByCode`
- `src/lib/onet/browse.ts` — `searchOccupations`
- `src/lib/onet/slugify.ts` — slug helper + collision suffix
- `src/lib/onet/index.ts` — re-exports
- `src/lib/onet/__fixtures__/mnm-career.json` — recorded O*NET detail fixture
- `src/lib/onet/__fixtures__/occupations-list.json` — recorded occupations list fixture
- `src/lib/chat/build-system-prompt.ts` — role-play system prompt assembly
- `scripts/seed-onet.ts` — O*NET mirror seed script (runnable via `pnpm seed:onet`)
- `src/app/careers/explore/page.tsx` — explore page Server Component
- `src/app/careers/explore/_components/ExploreFilters.tsx` — client filter chips
- `src/app/careers/[slug]/page.tsx` — rewrite of the detail page as Server Component
- `src/app/careers/[slug]/_components/CareerRolePlayChat.tsx` — chat client island
- `src/app/careers/[slug]/_components/CareerDetailsPanel.tsx` — left-column details (extracted + extended)
- `e2e/specs/careers-explore.spec.ts` — explore page E2E
- `e2e/specs/career-detail.spec.ts` — detail page E2E
- Various `*.test.ts` files alongside each adapter module.

**Modified files:**
- `src/db/schema.ts` — new `onetOccupations` table + `slug` column on `careerRecommendations`
- `src/app/api/careers/chat/route.ts` — zod request schema + session check + system prompt builder
- `src/app/careers/actions.ts` — `generateCareerRecommendationsAction` writes `slug`
- `src/app/careers/_components/CareersClient.tsx` — link uses slug (fallback to code)
- `.env.example` — `ONET_API_KEY` documented
- `package.json` — `seed:onet` script

**Deleted files:**
- `src/app/careers/[onetId]/page.tsx` — replaced by `[slug]/page.tsx`
- `src/app/api/careers/[onetId]/route.ts` — no longer used (server component fetches directly)
- `src/components/career-chat.tsx` — replaced by `CareerRolePlayChat.tsx`
- `src/components/career-details.tsx` — replaced by `CareerDetailsPanel.tsx`

**Baseline verification (run once before starting):**
```bash
pnpm install
pnpm test
pnpm lint
```
Expected: 28 tests pass, no lint errors.

---

## Task 1: Add ONET_API_KEY to env + client skeleton with guard

**Files:**
- Create: `src/lib/onet/client.ts`
- Create: `src/lib/onet/__tests__/client.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing test**

`src/lib/onet/__tests__/client.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('onetFetch', () => {
  const originalEnv = process.env.ONET_API_KEY

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ONET_API_KEY
    else process.env.ONET_API_KEY = originalEnv
  })

  it('throws at module import when ONET_API_KEY is missing', async () => {
    delete process.env.ONET_API_KEY
    // Force re-import
    await expect(import('../client?missing=' + Date.now()))
      .rejects.toThrow(/ONET_API_KEY/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/onet/__tests__/client.test.ts`
Expected: FAIL with "Cannot find module '../client'".

- [ ] **Step 3: Create `src/lib/onet/client.ts`**

```ts
import 'server-only'

if (!process.env.ONET_API_KEY) {
  throw new Error(
    'ONET_API_KEY is not set. Register a free account at '
    + 'https://services.onetcenter.org/ and put the credentials '
    + '(format: "username:password") in .env.local as ONET_API_KEY.',
  )
}

const ONET_BASE_URL = 'https://services.onetcenter.org/v1.9'
const ONET_AUTH = Buffer.from(process.env.ONET_API_KEY).toString('base64')

export interface OnetFetchOptions {
  revalidateSeconds?: number
  signal?: AbortSignal
}

export async function onetFetch<T>(
  path: string,
  options: OnetFetchOptions = {},
): Promise<T> {
  const url = `${ONET_BASE_URL}${path}`
  const { revalidateSeconds = 86400, signal } = options

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${ONET_AUTH}`,
      Accept: 'application/json',
    },
    next: { revalidate: revalidateSeconds },
    signal,
  })

  if (!response.ok) {
    throw new Error(`O*NET request failed: ${response.status} ${url}`)
  }
  return response.json() as Promise<T>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/onet/__tests__/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Update `.env.example`**

Append:
```
# O*NET Web Services — register free at https://services.onetcenter.org/
# Format: "username:password" (used as HTTP Basic auth)
ONET_API_KEY=
```

- [ ] **Step 6: Add ONET_API_KEY to local .env.local for dev**

Tell the user to add their credentials to `.env.local`. If they don't have them yet, document the placeholder:
```
ONET_API_KEY=your-username:your-password
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/onet/client.ts src/lib/onet/__tests__/client.test.ts .env.example
git commit -m "feat(onet): add API client with env guard"
```

---

## Task 2: Zod schemas for O*NET API responses

**Files:**
- Create: `src/lib/onet/schemas.ts`
- Create: `src/lib/onet/__fixtures__/mnm-career.json`
- Create: `src/lib/onet/__fixtures__/occupations-list.json`
- Create: `src/lib/onet/__tests__/schemas.test.ts`

- [ ] **Step 1: Record O*NET fixtures**

Fetch one sample detail and list page from O*NET with real credentials and save the raw JSON. For the purposes of this plan, use these representative fixtures.

`src/lib/onet/__fixtures__/mnm-career.json`:

```json
{
  "code": "29-1141.00",
  "title": "Registered Nurses",
  "what_they_do": "Assess patient health problems and needs, develop and implement nursing care plans, and maintain medical records.",
  "on_the_job": {
    "task": [
      "Maintain accurate, detailed reports and records.",
      "Monitor, record, and report symptoms or changes in patients' conditions.",
      "Record patients' medical information and vital signs.",
      "Modify patient treatment plans as indicated by patients' responses and conditions.",
      "Administer medications to patients and monitor patients for reactions or side effects."
    ]
  },
  "knowledge": {
    "element": [
      { "name": "Medicine and Dentistry" },
      { "name": "Psychology" },
      { "name": "Customer and Personal Service" },
      { "name": "English Language" },
      { "name": "Education and Training" }
    ]
  },
  "skills": {
    "element": [
      { "name": "Active Listening" },
      { "name": "Social Perceptiveness" },
      { "name": "Service Orientation" },
      { "name": "Critical Thinking" },
      { "name": "Monitoring" },
      { "name": "Reading Comprehension" },
      { "name": "Speaking" },
      { "name": "Coordination" },
      { "name": "Judgment and Decision Making" },
      { "name": "Time Management" }
    ]
  },
  "technology": {
    "category": [
      { "example": [ { "name": "Cerner Millennium" }, { "name": "Epic Systems" } ] },
      { "example": [ { "name": "Microsoft Office" } ] }
    ]
  },
  "where_they_work": {
    "industry": [
      { "title": "Hospitals", "percent_employed": 61 }
    ]
  },
  "job_outlook": {
    "outlook": {
      "category": "Bright",
      "description": "Faster than average"
    },
    "salary": {
      "annual_median": 81220,
      "annual_median_over": false
    },
    "bright_outlook": {
      "category": [ "Grow Rapidly", "Numerous Openings" ],
      "description": "Growing rapidly with numerous job openings."
    }
  },
  "education": {
    "job_zone": 4
  },
  "interests": {
    "element": [
      { "name": "Social", "description": "" },
      { "name": "Investigative", "description": "" },
      { "name": "Realistic", "description": "" }
    ]
  },
  "explore_more": {
    "careers": {
      "career": [
        { "code": "29-1171.00", "title": "Nurse Practitioners" },
        { "code": "29-1071.00", "title": "Physician Assistants" }
      ]
    }
  }
}
```

`src/lib/onet/__fixtures__/occupations-list.json`:

```json
{
  "total": 2,
  "start": 1,
  "end": 2,
  "occupation": [
    { "code": "29-1141.00", "title": "Registered Nurses" },
    { "code": "15-1252.00", "title": "Software Developers" }
  ]
}
```

- [ ] **Step 2: Write the failing schema test**

`src/lib/onet/__tests__/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import mnmFixture from '../__fixtures__/mnm-career.json'
import occListFixture from '../__fixtures__/occupations-list.json'
import { MnmCareerSchema, OccupationsListSchema } from '../schemas'

describe('O*NET zod schemas', () => {
  it('parses an MNM career payload', () => {
    const parsed = MnmCareerSchema.parse(mnmFixture)
    expect(parsed.code).toBe('29-1141.00')
    expect(parsed.on_the_job.task.length).toBeGreaterThan(0)
    expect(parsed.education.job_zone).toBe(4)
    expect(parsed.job_outlook.bright_outlook).toBeDefined()
    expect(parsed.interests.element[0].name).toBe('Social')
  })

  it('parses an occupations list page', () => {
    const parsed = OccupationsListSchema.parse(occListFixture)
    expect(parsed.total).toBe(2)
    expect(parsed.occupation).toHaveLength(2)
    expect(parsed.occupation[0].code).toMatch(/^\d{2}-\d{4}\.\d{2}$/)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/lib/onet/__tests__/schemas.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Write `src/lib/onet/schemas.ts`**

```ts
import { z } from 'zod'

const NamedElementSchema = z.object({ name: z.string() })

export const MnmCareerSchema = z.object({
  code: z.string(),
  title: z.string(),
  what_they_do: z.string(),
  on_the_job: z.object({ task: z.array(z.string()).default([]) }),
  knowledge: z.object({ element: z.array(NamedElementSchema).default([]) }),
  skills: z.object({ element: z.array(NamedElementSchema).default([]) }),
  technology: z.object({
    category: z.array(z.object({
      example: z.array(NamedElementSchema).default([]),
    })).default([]),
  }).default({ category: [] }),
  where_they_work: z.object({
    industry: z.array(z.object({
      title: z.string(),
      percent_employed: z.number(),
    })).default([]),
  }).optional().default({ industry: [] }),
  job_outlook: z.object({
    outlook: z.object({
      category: z.string(),
      description: z.string(),
    }),
    salary: z.object({
      annual_median: z.number().nullable().optional(),
      annual_median_over: z.boolean().optional(),
    }),
    bright_outlook: z.object({
      category: z.array(z.string()).default([]),
      description: z.string().optional(),
    }).optional(),
  }),
  education: z.object({ job_zone: z.number().int().min(1).max(5) }),
  interests: z.object({
    element: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
    })).default([]),
  }),
  explore_more: z.object({
    careers: z.object({
      career: z.array(z.object({ code: z.string(), title: z.string() })).default([]),
    }).optional(),
  }).optional(),
})

export type MnmCareer = z.infer<typeof MnmCareerSchema>

export const OccupationsListSchema = z.object({
  total: z.number(),
  start: z.number(),
  end: z.number(),
  occupation: z.array(z.object({
    code: z.string(),
    title: z.string(),
  })),
})

export type OccupationsList = z.infer<typeof OccupationsListSchema>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/lib/onet/__tests__/schemas.test.ts`
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/onet/schemas.ts src/lib/onet/__tests__/schemas.test.ts src/lib/onet/__fixtures__
git commit -m "feat(onet): add zod schemas for O*NET API responses"
```

---

## Task 3: Schema additions (onet_occupations + career_recommendations.slug)

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/migrations/0001_onet_occupations.sql` (generated)

- [ ] **Step 1: Update `src/db/schema.ts`**

Replace entire file:

```ts
import { boolean, char, integer, pgTable, serial, smallint, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const quizAnswers = pgTable('quiz_answers', {
  id: serial().primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  selectedOption: smallint('selected_option'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, table => [
  unique('quiz_answers_user_question_unique').on(table.userId, table.questionId),
])

export const careerRecommendations = pgTable('career_recommendations', {
  id: serial().primaryKey(),
  userId: text('user_id').notNull(),
  onetId: text('onet_id').notNull(),
  slug: text('slug'),
  title: text().notNull(),
  description: text().notNull(),
  whyItMatches: text('why_it_matches').notNull(),
  jobGrowth: text('job_growth').notNull(),
  salaryRange: text('salary_range').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
})

export const onetOccupations = pgTable('onet_occupations', {
  code: text().primaryKey(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  description: text(),
  jobZone: integer('job_zone').notNull(),
  brightOutlook: boolean('bright_outlook').notNull().default(false),
  riasecPrimary: char('riasec_primary', { length: 1 }),
  riasecAll: text('riasec_all').array().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
})
```

- [ ] **Step 2: Generate migration**

Run: `pnpm dk:generate`
Expected: creates `drizzle/migrations/0001_*.sql`. Open the generated file.

- [ ] **Step 3: Amend the migration with pg_trgm + indexes**

The generated migration will NOT include `CREATE EXTENSION` or the trigram / GIN indexes — drizzle-kit doesn't emit these automatically. Open the generated file and replace its content with:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE "onet_occupations" (
  "code" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "job_zone" integer NOT NULL,
  "bright_outlook" boolean NOT NULL DEFAULT false,
  "riasec_primary" char(1),
  "riasec_all" text[] NOT NULL DEFAULT '{}',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "onet_occupations_slug_unique" UNIQUE("slug")
);

CREATE INDEX "onet_occupations_job_zone_idx" ON "onet_occupations" ("job_zone");
CREATE INDEX "onet_occupations_bright_idx" ON "onet_occupations" ("bright_outlook") WHERE "bright_outlook";
CREATE INDEX "onet_occupations_riasec_idx" ON "onet_occupations" USING gin ("riasec_all");
CREATE INDEX "onet_occupations_title_trgm" ON "onet_occupations" USING gin ("title" gin_trgm_ops);

ALTER TABLE "career_recommendations" ADD COLUMN "slug" text;
```

Also rename the file to `drizzle/migrations/0001_onet_occupations.sql` for clarity.

- [ ] **Step 4: Apply migration**

Run: `pnpm dk:push`
Expected: migration applied. Verify by inspecting schema:
```
pnpm exec tsx -e "import {sql} from '@/db'; (async () => console.log(await sql`SELECT to_regclass('onet_occupations')`))()"
```

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/migrations/
git commit -m "feat(db): add onet_occupations table + career_recommendations.slug"
```

---

## Task 4: Slugify helper

**Files:**
- Create: `src/lib/onet/slugify.ts`
- Create: `src/lib/onet/__tests__/slugify.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { slugifyTitle, resolveSlugCollisions } from '../slugify'

describe('slugifyTitle', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyTitle('Registered Nurses')).toBe('registered-nurses')
  })
  it('strips punctuation and special chars', () => {
    expect(slugifyTitle('Marketing Managers & Analysts')).toBe('marketing-managers-analysts')
    expect(slugifyTitle('First-Line Supervisors')).toBe('first-line-supervisors')
    expect(slugifyTitle("Physicians'")).toBe('physicians')
  })
  it('collapses whitespace', () => {
    expect(slugifyTitle('Farm  and   Ranch Managers')).toBe('farm-and-ranch-managers')
  })
})

describe('resolveSlugCollisions', () => {
  it('returns same slug when no collision', () => {
    const taken = new Set<string>()
    expect(resolveSlugCollisions('registered-nurses', taken)).toBe('registered-nurses')
  })
  it('appends numeric suffix on collision', () => {
    const taken = new Set<string>(['nurses', 'nurses-2'])
    expect(resolveSlugCollisions('nurses', taken)).toBe('nurses-3')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/onet/__tests__/slugify.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/onet/slugify.ts`**

```ts
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function resolveSlugCollisions(
  candidate: string,
  taken: Set<string>,
): string {
  if (!taken.has(candidate))
    return candidate
  let i = 2
  while (taken.has(`${candidate}-${i}`)) i++
  return `${candidate}-${i}`
}
```

- [ ] **Step 4: Run test to verify passes**

Run: `pnpm vitest run src/lib/onet/__tests__/slugify.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/onet/slugify.ts src/lib/onet/__tests__/slugify.test.ts
git commit -m "feat(onet): add slugify helper with collision handling"
```

---

## Task 5: Local mirror query functions (resolveSlug + getOccupationByCode)

**Files:**
- Create: `src/lib/onet/occupations.ts`
- Create: `src/lib/onet/__tests__/occupations.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { resolveSlug, getOccupationByCode } from '../occupations'

describe('mirror lookups', () => {
  const fixture = {
    code: '29-1141.00',
    slug: 'registered-nurses',
    title: 'Registered Nurses',
    description: 'Assess patient health problems and needs.',
    jobZone: 4,
    brightOutlook: true,
    riasecPrimary: 'S' as const,
    riasecAll: ['S', 'I', 'R'],
  }

  beforeEach(async () => {
    await db.insert(onetOccupations).values(fixture).onConflictDoNothing()
  })
  afterEach(async () => {
    await db.delete(onetOccupations).where(eq(onetOccupations.code, fixture.code))
  })

  it('resolveSlug returns the row shape by slug', async () => {
    const row = await resolveSlug('registered-nurses')
    expect(row?.code).toBe('29-1141.00')
    expect(row?.jobZone).toBe(4)
    expect(row?.riasecAll).toEqual(['S', 'I', 'R'])
  })

  it('resolveSlug returns null for unknown slug', async () => {
    expect(await resolveSlug('not-a-career')).toBeNull()
  })

  it('getOccupationByCode returns the row shape by code', async () => {
    const row = await getOccupationByCode('29-1141.00')
    expect(row?.slug).toBe('registered-nurses')
  })

  it('getOccupationByCode returns null for unknown code', async () => {
    expect(await getOccupationByCode('00-0000.00')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/onet/__tests__/occupations.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/onet/occupations.ts`**

```ts
import 'server-only'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { onetFetch } from './client'
import { MnmCareerSchema, type MnmCareer } from './schemas'

export interface OccupationRow {
  code: string
  slug: string
  title: string
  description: string | null
  jobZone: number
  brightOutlook: boolean
  riasecPrimary: string | null
  riasecAll: string[]
}

export async function resolveSlug(slug: string): Promise<OccupationRow | null> {
  const rows = await db.select().from(onetOccupations)
    .where(eq(onetOccupations.slug, slug)).limit(1)
  return rows[0] ?? null
}

export async function getOccupationByCode(code: string): Promise<OccupationRow | null> {
  const rows = await db.select().from(onetOccupations)
    .where(eq(onetOccupations.code, code)).limit(1)
  return rows[0] ?? null
}

export async function getCareerDetail(code: string): Promise<MnmCareer> {
  const data = await onetFetch<unknown>(`/ws/mnm/careers/${code}/`)
  return MnmCareerSchema.parse(data)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/onet/__tests__/occupations.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/onet/occupations.ts src/lib/onet/__tests__/occupations.test.ts
git commit -m "feat(onet): add mirror-table lookup helpers"
```

---

## Task 6: searchOccupations (filters + pagination)

**Files:**
- Create: `src/lib/onet/browse.ts`
- Create: `src/lib/onet/__tests__/browse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { searchOccupations } from '../browse'

describe('searchOccupations', () => {
  const seed = [
    { code: '29-1141.00', slug: 'registered-nurses', title: 'Registered Nurses', description: '', jobZone: 4, brightOutlook: true, riasecPrimary: 'S', riasecAll: ['S','I','R'] },
    { code: '15-1252.00', slug: 'software-developers', title: 'Software Developers', description: '', jobZone: 4, brightOutlook: true, riasecPrimary: 'I', riasecAll: ['I','C'] },
    { code: '35-3031.00', slug: 'waiters-and-waitresses', title: 'Waiters and Waitresses', description: '', jobZone: 2, brightOutlook: false, riasecPrimary: 'E', riasecAll: ['E','C'] },
    { code: '29-1171.00', slug: 'nurse-practitioners', title: 'Nurse Practitioners', description: '', jobZone: 5, brightOutlook: true, riasecPrimary: 'I', riasecAll: ['I','S'] },
  ]

  beforeEach(async () => {
    for (const r of seed) await db.insert(onetOccupations).values(r).onConflictDoNothing()
  })
  afterEach(async () => {
    await db.delete(onetOccupations).where(inArray(onetOccupations.code, seed.map(r => r.code)))
  })

  it('keyword search matches title (case-insensitive)', async () => {
    const { rows, total } = await searchOccupations({ q: 'nurse' })
    expect(total).toBe(2)
    expect(rows.map(r => r.slug).sort()).toEqual(['nurse-practitioners', 'registered-nurses'])
  })

  it('filters by job zone', async () => {
    const { rows } = await searchOccupations({ zone: [2] })
    expect(rows.map(r => r.slug)).toEqual(['waiters-and-waitresses'])
  })

  it('filters by bright outlook only', async () => {
    const { total } = await searchOccupations({ bright: true })
    expect(total).toBe(3)
  })

  it('filters by riasec overlap', async () => {
    const { rows } = await searchOccupations({ riasec: ['S'] })
    expect(rows.map(r => r.slug).sort()).toEqual(['nurse-practitioners', 'registered-nurses'])
  })

  it('paginates by page param (size 30)', async () => {
    const { rows, page, pageSize } = await searchOccupations({ page: 1 })
    expect(page).toBe(1)
    expect(pageSize).toBe(30)
    expect(rows.length).toBeLessThanOrEqual(30)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/onet/__tests__/browse.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/onet/browse.ts`**

```ts
import 'server-only'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { and, asc, count, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm'
import type { OccupationRow } from './occupations'

export interface SearchFilters {
  q?: string
  riasec?: string[]    // one or more of R,I,A,S,E,C
  zone?: number[]      // one or more of 1..5
  bright?: boolean
  page?: number        // 1-based
}

export interface SearchResult {
  rows: OccupationRow[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 30

export async function searchOccupations(filters: SearchFilters): Promise<SearchResult> {
  const conditions: SQL[] = []

  if (filters.q && filters.q.trim().length > 0) {
    conditions.push(ilike(onetOccupations.title, `%${filters.q.trim()}%`))
  }
  if (filters.zone && filters.zone.length > 0) {
    conditions.push(inArray(onetOccupations.jobZone, filters.zone))
  }
  if (filters.bright) {
    conditions.push(eq(onetOccupations.brightOutlook, true))
  }
  if (filters.riasec && filters.riasec.length > 0) {
    // riasec_all && ARRAY['S','I']::text[] -> true if any overlap
    const arrayLiteral = sql`ARRAY[${sql.join(filters.riasec.map(c => sql`${c}`), sql`, `)}]::text[]`
    conditions.push(sql`${onetOccupations.riasecAll} && ${arrayLiteral}`)
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const page = Math.max(1, filters.page ?? 1)
  const offset = (page - 1) * PAGE_SIZE

  const [rows, [{ value: total }]] = await Promise.all([
    db.select().from(onetOccupations)
      .where(where)
      .orderBy(asc(onetOccupations.title))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(onetOccupations).where(where),
  ])

  return { rows, total, page, pageSize: PAGE_SIZE }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/onet/__tests__/browse.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/onet/browse.ts src/lib/onet/__tests__/browse.test.ts
git commit -m "feat(onet): searchOccupations over the local mirror"
```

---

## Task 7: Index re-exports

**Files:**
- Create: `src/lib/onet/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
export { onetFetch } from './client'
export { slugifyTitle, resolveSlugCollisions } from './slugify'
export { getCareerDetail, resolveSlug, getOccupationByCode, type OccupationRow } from './occupations'
export { searchOccupations, type SearchFilters, type SearchResult } from './browse'
export { MnmCareerSchema, OccupationsListSchema, type MnmCareer, type OccupationsList } from './schemas'
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/onet/index.ts
git commit -m "feat(onet): barrel exports"
```

---

## Task 8: Seed script (O*NET → local mirror)

**Files:**
- Create: `scripts/seed-onet.ts`
- Create: `src/lib/onet/seed-helpers.ts`
- Create: `src/lib/onet/__tests__/seed-helpers.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing unit tests for the pure helpers**

`src/lib/onet/__tests__/seed-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import mnmFixture from '../__fixtures__/mnm-career.json'
import { MnmCareerSchema } from '../schemas'
import { deriveMirrorRow } from '../seed-helpers'

describe('deriveMirrorRow', () => {
  it('derives mirror fields from an MNM career payload', () => {
    const parsed = MnmCareerSchema.parse(mnmFixture)
    const row = deriveMirrorRow(parsed, new Set())
    expect(row.code).toBe('29-1141.00')
    expect(row.slug).toBe('registered-nurses')
    expect(row.title).toBe('Registered Nurses')
    expect(row.description).toMatch(/Assess patient/)
    expect(row.jobZone).toBe(4)
    expect(row.brightOutlook).toBe(true)
    expect(row.riasecPrimary).toBe('S')
    expect(row.riasecAll).toEqual(['S', 'I', 'R'])
  })

  it('handles slug collisions', () => {
    const parsed = MnmCareerSchema.parse(mnmFixture)
    const taken = new Set(['registered-nurses'])
    const row = deriveMirrorRow(parsed, taken)
    expect(row.slug).toBe('registered-nurses-2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/onet/__tests__/seed-helpers.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/onet/seed-helpers.ts`**

```ts
import { slugifyTitle, resolveSlugCollisions } from './slugify'
import type { MnmCareer } from './schemas'

export interface MirrorRow {
  code: string
  slug: string
  title: string
  description: string | null
  jobZone: number
  brightOutlook: boolean
  riasecPrimary: string | null
  riasecAll: string[]
}

const INTEREST_CODES: Record<string, string> = {
  Realistic: 'R', Investigative: 'I', Artistic: 'A',
  Social: 'S', Enterprising: 'E', Conventional: 'C',
}

export function deriveMirrorRow(career: MnmCareer, takenSlugs: Set<string>): MirrorRow {
  const baseSlug = slugifyTitle(career.title)
  const slug = resolveSlugCollisions(baseSlug, takenSlugs)
  const interestCodes = career.interests.element
    .map(el => INTEREST_CODES[el.name])
    .filter((c): c is string => !!c)
  return {
    code: career.code,
    slug,
    title: career.title,
    description: career.what_they_do,
    jobZone: career.education.job_zone,
    brightOutlook: Boolean(career.job_outlook.bright_outlook),
    riasecPrimary: interestCodes[0] ?? null,
    riasecAll: interestCodes,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/onet/__tests__/seed-helpers.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Write the seed driver `scripts/seed-onet.ts`**

```ts
#!/usr/bin/env tsx
import 'dotenv-flow/config'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { onetFetch } from '@/lib/onet/client'
import { MnmCareerSchema, OccupationsListSchema } from '@/lib/onet/schemas'
import { deriveMirrorRow } from '@/lib/onet/seed-helpers'
import { sql as drizzleSql } from 'drizzle-orm'

const MIN_DELAY_MS = 3000  // ~20 rpm

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function listAllOccupationCodes(): Promise<string[]> {
  const codes: string[] = []
  let start = 1
  const pageSize = 200
  while (true) {
    const data = await onetFetch<unknown>(
      `/ws/online/occupations/?start=${start}&end=${start + pageSize - 1}`,
      { revalidateSeconds: 0 },
    )
    const parsed = OccupationsListSchema.parse(data)
    for (const occ of parsed.occupation) codes.push(occ.code)
    if (parsed.end >= parsed.total) break
    start = parsed.end + 1
    await sleep(MIN_DELAY_MS)
  }
  return codes
}

async function seedOne(code: string, taken: Set<string>) {
  let retries = 0
  while (retries < 3) {
    try {
      const raw = await onetFetch<unknown>(`/ws/mnm/careers/${code}/`, { revalidateSeconds: 0 })
      const career = MnmCareerSchema.parse(raw)
      const row = deriveMirrorRow(career, taken)
      taken.add(row.slug)
      await db.insert(onetOccupations).values(row).onConflictDoUpdate({
        target: onetOccupations.code,
        set: {
          slug: row.slug,
          title: row.title,
          description: row.description,
          jobZone: row.jobZone,
          brightOutlook: row.brightOutlook,
          riasecPrimary: row.riasecPrimary,
          riasecAll: row.riasecAll,
          updatedAt: drizzleSql`now()`,
        },
      })
      return
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/\b429\b/.test(msg)) {
        console.warn(`[seed] 429 on ${code} — sleeping 30s`)
        await sleep(30_000)
        retries++
      }
      else {
        console.error(`[seed] failed ${code}:`, msg)
        return
      }
    }
  }
}

async function main() {
  console.log('[seed] listing all occupation codes from O*NET...')
  const codes = await listAllOccupationCodes()
  console.log(`[seed] found ${codes.length} occupations. seeding...`)

  const existing = await db.select({ slug: onetOccupations.slug }).from(onetOccupations)
  const taken = new Set<string>(existing.map(r => r.slug))

  for (let i = 0; i < codes.length; i++) {
    await seedOne(codes[i], taken)
    if (i % 25 === 0) console.log(`[seed] ${i}/${codes.length}`)
    await sleep(MIN_DELAY_MS)
  }
  console.log('[seed] done')
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 6: Add script to `package.json`**

Insert inside `"scripts"`:

```json
"seed:onet": "tsx scripts/seed-onet.ts",
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/onet/seed-helpers.ts src/lib/onet/__tests__/seed-helpers.test.ts scripts/seed-onet.ts package.json
git commit -m "feat(onet): add seed script for local mirror"
```

- [ ] **Step 8: Run the seed once (manual)**

Run: `pnpm seed:onet`
Expected: ~2–4 min, populates ~1000 rows. Verify with:
```
pnpm exec tsx -e "import {db} from '@/db'; import {onetOccupations} from '@/db/schema'; import {count} from 'drizzle-orm'; (async () => console.log(await db.select({n:count()}).from(onetOccupations)))()"
```

---

## Task 9: Chat system prompt builder

**Files:**
- Create: `src/lib/chat/build-system-prompt.ts`
- Create: `src/lib/chat/__tests__/build-system-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildCareerRolePlaySystemPrompt, type CareerContext } from '../build-system-prompt'

const careerContext: CareerContext = {
  title: 'Registered Nurses',
  onetCode: '29-1141.00',
  shortDescription: 'Assess patient health problems and needs.',
  tasks: ['Administer medications', 'Monitor vitals'],
  skills: ['Active Listening', 'Critical Thinking'],
  knowledge: ['Medicine and Dentistry'],
  workActivities: ['Documenting information'],
  technology: ['Epic Systems'],
  jobZone: { number: 4, name: "Considerable Prep", description: "Several years of college" },
  riasecTop: ['Social', 'Investigative'],
  salaryMedian: '$81,220',
  outlook: 'Faster than average',
}

describe('buildCareerRolePlaySystemPrompt', () => {
  it('includes the career title and O*NET code', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).toMatch(/Registered Nurses/)
    expect(out).toMatch(/29-1141\.00/)
  })
  it('includes every task, skill, and technology', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).toMatch(/Administer medications/)
    expect(out).toMatch(/Active Listening/)
    expect(out).toMatch(/Epic Systems/)
  })
  it('omits recommendation context when null', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).not.toMatch(/recommended this career/)
  })
  it('weaves recommendation context when provided', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, { whyItMatches: 'You value helping others.' })
    expect(out).toMatch(/You value helping others\./)
    expect(out).toMatch(/recommended this career/i)
  })
  it('instructs a first-turn self-introduction with name + years + workplace', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).toMatch(/first name/i)
    expect(out).toMatch(/years/i)
    expect(out).toMatch(/workplace/i)
  })
  it('forbids breaking character', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null)
    expect(out).toMatch(/never.*AI/i)
    expect(out).toMatch(/never break character/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/chat/__tests__/build-system-prompt.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/chat/build-system-prompt.ts`**

```ts
export interface CareerContext {
  title: string
  onetCode: string
  shortDescription: string
  tasks: string[]
  skills: string[]
  knowledge: string[]
  workActivities: string[]
  technology: string[]
  jobZone: { number: number, name: string, description: string }
  riasecTop: string[]
  salaryMedian: string
  outlook: string
}

export interface RecommendationContext {
  whyItMatches: string
}

const bullets = (items: string[]) => items.map(x => `- ${x}`).join('\n')

export function buildCareerRolePlaySystemPrompt(
  career: CareerContext,
  rec: RecommendationContext | null,
): string {
  const recBlock = rec
    ? `\n# Personalization\nThe student was recommended this career because: "${rec.whyItMatches}"\nWeave this into your framing naturally — don't repeat it verbatim.\n`
    : ''

  return `You are role-playing as a working practitioner in the following career. Stay in character for the entire conversation.

# Your career
Title: ${career.title}
O*NET code: ${career.onetCode}
Short description: ${career.shortDescription}

# What you do day-to-day (from O*NET)
Top tasks:
${bullets(career.tasks)}

Work activities:
${bullets(career.workActivities)}

Technologies you use:
${bullets(career.technology)}

# Your expertise (from O*NET)
Skills:
${bullets(career.skills)}

Knowledge areas:
${bullets(career.knowledge)}

# Your background
Education / training: typical of Job Zone ${career.jobZone.number} — ${career.jobZone.name}. ${career.jobZone.description}
Interests typical of this role: ${career.riasecTop.join(', ')}
Typical compensation: ${career.salaryMedian}. Outlook: ${career.outlook}.

# How to behave
- On your FIRST message, introduce yourself ONCE with: a first name, your years of experience in this career (pick one value from 3 to 15), and a brief workplace context (e.g., "at a community hospital in Ohio"). Keep those details consistent for every later message.
- Speak in first person. Be warm and student-friendly. Explain any jargon you use.
- Ground every factual claim in the data above. If you don't know something specific (a salary in a specific city, niche specialties), say so and suggest how the student could find out.
- Share a realistic, honest picture — rewarding parts AND hard parts.
- Keep each response to 2–4 short paragraphs. End most responses with a lightweight prompt that invites the next question.
${recBlock}
# What NOT to do
- Never break character; never mention that you are an AI.
- Never invent specific company names, salaries, or statistics beyond the data above.
- Never give generic career-counselor advice. Speak as a practitioner, not a coach.`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/chat/__tests__/build-system-prompt.test.ts`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/build-system-prompt.ts src/lib/chat/__tests__/build-system-prompt.test.ts
git commit -m "feat(chat): role-play system prompt builder"
```

---

## Task 10: Chat API route extension

**Files:**
- Modify: `src/app/api/careers/chat/route.ts`
- Create: `tests/api/careers-chat.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/careers/chat/route'

vi.mock('@/lib/auth/get-session', () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }),
}))

vi.mock('ai', () => ({
  streamText: () => ({ toDataStreamResponse: () => new Response('ok') }),
}))

describe('POST /api/careers/chat', () => {
  it('returns 400 on invalid body', async () => {
    const req = new Request('http://test/api/careers/chat', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 when no session', async () => {
    const { getSession } = await import('@/lib/auth/get-session')
    vi.mocked(getSession).mockResolvedValueOnce(null)
    const req = new Request('http://test/api/careers/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [], careerContext: validCtx(), recommendationContext: null }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('passes through on a valid body', async () => {
    const req = new Request('http://test/api/careers/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hi' }],
        careerContext: validCtx(),
        recommendationContext: null,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})

function validCtx() {
  return {
    title: 'Registered Nurses',
    onetCode: '29-1141.00',
    shortDescription: 'x',
    tasks: ['t'], skills: ['s'], knowledge: ['k'],
    workActivities: ['wa'], technology: ['tech'],
    jobZone: { number: 4, name: 'n', description: 'd' },
    riasecTop: ['Social'],
    salaryMedian: '$80,000',
    outlook: 'Bright',
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/api/careers-chat.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite `src/app/api/careers/chat/route.ts`**

```ts
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { buildCareerRolePlaySystemPrompt } from '@/lib/chat/build-system-prompt'

export const maxDuration = 30

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const CareerContextSchema = z.object({
  title: z.string(),
  onetCode: z.string(),
  shortDescription: z.string(),
  tasks: z.array(z.string()).max(10),
  skills: z.array(z.string()).max(15),
  knowledge: z.array(z.string()).max(10),
  workActivities: z.array(z.string()).max(10),
  technology: z.array(z.string()).max(15),
  jobZone: z.object({ number: z.number(), name: z.string(), description: z.string() }),
  riasecTop: z.array(z.string()).max(6),
  salaryMedian: z.string(),
  outlook: z.string(),
})

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  careerContext: CareerContextSchema,
  recommendationContext: z.object({ whyItMatches: z.string() }).nullable(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    })
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    })
  }

  const system = buildCareerRolePlaySystemPrompt(body.careerContext, body.recommendationContext)

  const result = streamText({
    model: openai('gpt-4o'),
    system,
    messages: body.messages,
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/api/careers-chat.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/careers/chat/route.ts tests/api/careers-chat.test.ts
git commit -m "feat(api): role-play chat body schema + session gate"
```

---

## Task 11: Derive `careerContext` from MNM payload (projector)

**Files:**
- Create: `src/lib/onet/projectors.ts`
- Create: `src/lib/onet/__tests__/projectors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import mnmFixture from '../__fixtures__/mnm-career.json'
import { MnmCareerSchema } from '../schemas'
import { toCareerContext, JOB_ZONE_NAMES, JOB_ZONE_DESCRIPTIONS } from '../projectors'

describe('toCareerContext', () => {
  it('projects an MNM payload to the chat CareerContext shape', () => {
    const career = MnmCareerSchema.parse(mnmFixture)
    const ctx = toCareerContext(career)
    expect(ctx.title).toBe('Registered Nurses')
    expect(ctx.onetCode).toBe('29-1141.00')
    expect(ctx.tasks.length).toBeGreaterThan(0)
    expect(ctx.tasks.length).toBeLessThanOrEqual(5)
    expect(ctx.skills.length).toBeLessThanOrEqual(10)
    expect(ctx.knowledge.length).toBeLessThanOrEqual(5)
    expect(ctx.technology.length).toBeLessThanOrEqual(8)
    expect(ctx.jobZone.number).toBe(4)
    expect(ctx.jobZone.name).toBe(JOB_ZONE_NAMES[4])
    expect(ctx.jobZone.description).toBe(JOB_ZONE_DESCRIPTIONS[4])
    expect(ctx.riasecTop).toContain('Social')
    expect(ctx.salaryMedian).toMatch(/\$81/)
    expect(ctx.outlook).toMatch(/Faster/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/onet/__tests__/projectors.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/onet/projectors.ts`**

```ts
import type { MnmCareer } from './schemas'
import type { CareerContext } from '@/lib/chat/build-system-prompt'

export const JOB_ZONE_NAMES: Record<number, string> = {
  1: 'Little or No Preparation Needed',
  2: 'Some Preparation Needed',
  3: 'Medium Preparation Needed',
  4: 'Considerable Preparation Needed',
  5: 'Extensive Preparation Needed',
}

export const JOB_ZONE_DESCRIPTIONS: Record<number, string> = {
  1: 'Some may require a high school diploma or GED; little formal education beyond that.',
  2: 'Usually requires a high school diploma plus some on-the-job training.',
  3: 'Usually requires training in vocational schools, related on-the-job experience, or an associate\'s degree.',
  4: 'Usually requires a four-year bachelor\'s degree; some require advanced training.',
  5: 'Extensive skill, knowledge, and experience — advanced degrees are usually required.',
}

export function toCareerContext(career: MnmCareer): CareerContext {
  const formatSalary = (n: number | null | undefined) =>
    typeof n === 'number' ? `$${n.toLocaleString('en-US')}` : 'varies'

  return {
    title: career.title,
    onetCode: career.code,
    shortDescription: career.what_they_do,
    tasks: career.on_the_job.task.slice(0, 5),
    skills: career.skills.element.slice(0, 10).map(e => e.name),
    knowledge: career.knowledge.element.slice(0, 5).map(e => e.name),
    workActivities: [],  // MNM payload does not include structured work activities; left empty.
    technology: career.technology.category
      .flatMap(c => c.example)
      .slice(0, 8)
      .map(e => e.name),
    jobZone: {
      number: career.education.job_zone,
      name: JOB_ZONE_NAMES[career.education.job_zone],
      description: JOB_ZONE_DESCRIPTIONS[career.education.job_zone],
    },
    riasecTop: career.interests.element.slice(0, 3).map(e => e.name),
    salaryMedian: formatSalary(career.job_outlook.salary.annual_median),
    outlook: career.job_outlook.outlook.description,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/onet/__tests__/projectors.test.ts`
Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/onet/projectors.ts src/lib/onet/__tests__/projectors.test.ts
git commit -m "feat(onet): MNM → CareerContext projector"
```

---

## Task 12: Details panel component

**Files:**
- Create: `src/app/careers/[slug]/_components/CareerDetailsPanel.tsx`

- [ ] **Step 1: Write `CareerDetailsPanel.tsx`**

```tsx
import Link from 'next/link'
import { ExternalLink, TrendingUp, DollarSign, Target, GraduationCap, Wrench } from 'lucide-react'
import type { MnmCareer } from '@/lib/onet/schemas'
import type { OccupationRow } from '@/lib/onet/occupations'
import { JOB_ZONE_NAMES, JOB_ZONE_DESCRIPTIONS } from '@/lib/onet/projectors'

interface Props {
  occupation: OccupationRow
  detail: MnmCareer | null
  whyItMatches: string | null
}

export function CareerDetailsPanel({ occupation, detail, whyItMatches }: Props) {
  const tasks = detail?.on_the_job.task.slice(0, 5) ?? []
  const skills = detail?.skills.element.slice(0, 10).map(e => e.name) ?? []
  const knowledge = detail?.knowledge.element.slice(0, 5).map(e => e.name) ?? []
  const tech = detail?.technology.category.flatMap(c => c.example).slice(0, 8).map(e => e.name) ?? []
  const related = detail?.explore_more?.careers?.career.slice(0, 6) ?? []
  const salary = detail?.job_outlook.salary.annual_median
    ? `$${detail.job_outlook.salary.annual_median.toLocaleString('en-US')}`
    : 'varies'

  return (
    <div className="p-6 bg-surface/50 border border-border rounded-2xl">
      <h2 className="font-serif text-xl text-foreground mb-1">{occupation.title}</h2>
      <div className="text-xs text-muted-foreground mb-5 flex flex-wrap gap-2">
        <span>Job Zone {occupation.jobZone} · {JOB_ZONE_NAMES[occupation.jobZone]}</span>
        {occupation.brightOutlook && <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Bright Outlook</span>}
        <span>{occupation.riasecAll.join(' · ')}</span>
      </div>

      <div className="space-y-5">
        {occupation.description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{occupation.description}</p>
          </div>
        )}

        {whyItMatches && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-soft" />
              Why it fits you
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{whyItMatches}</p>
          </div>
        )}

        {tasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">What they do</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              {tasks.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Skills</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{skills.join(' · ')}</p>
          </div>
        )}

        {knowledge.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Knowledge areas</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{knowledge.join(' · ')}</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-accent" />
            Education
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{JOB_ZONE_DESCRIPTIONS[occupation.jobZone]}</p>
        </div>

        {tech.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary-soft" />
              Technology used
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{tech.join(' · ')}</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Salary & outlook
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Median: <strong className="text-foreground">{salary}</strong>
            {detail && ` · Outlook: ${detail.job_outlook.outlook.description}`}
          </p>
        </div>

        {related.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Related careers</h3>
            <div className="flex flex-wrap gap-2">
              {related.map(r => (
                <Link key={r.code} href={`/careers/${r.code}`} className="text-xs px-3 py-1 rounded-full border border-border hover:border-border-hover text-muted-foreground no-underline">
                  {r.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {!detail && (
          <div className="p-3 rounded-xl border border-border bg-surface/30 text-xs text-muted-foreground">
            More details are refreshing — check back soon.
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <a
            href={`https://www.onetonline.org/link/summary/${occupation.code}`}
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

- [ ] **Step 2: Commit**

```bash
git add src/app/careers/[slug]/_components/CareerDetailsPanel.tsx
git commit -m "feat(careers): details panel component with O*NET fields"
```

---

## Task 13: Role-play chat client component

**Files:**
- Create: `src/app/careers/[slug]/_components/CareerRolePlayChat.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { Chat } from '@/components/ui/chat'
import type { CareerContext } from '@/lib/chat/build-system-prompt'

interface Props {
  careerContext: CareerContext
  recommendationContext: { whyItMatches: string } | null
}

export function CareerRolePlayChat({ careerContext, recommendationContext }: Props) {
  const { messages, input, handleInputChange, handleSubmit, status, error, reload, setMessages } = useChat({
    api: '/api/careers/chat',
    body: { careerContext, recommendationContext },
    initialMessages: [],
  })

  const onStartOver = () => setMessages([])

  return (
    <div className="bg-surface/50 border border-border rounded-2xl h-[600px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span aria-hidden className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary" />
            Talk with a <span>{careerContext.title}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Speaking from experience — ask about the day-to-day, getting started, what surprises people, or anything else.
          </p>
        </div>
        <button
          onClick={onStartOver}
          className="text-xs text-muted-foreground hover:text-primary-soft underline disabled:opacity-40"
          disabled={messages.length === 0 || status === 'streaming'}
        >
          Start over
        </button>
      </div>

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

- [ ] **Step 2: Commit**

```bash
git add src/app/careers/[slug]/_components/CareerRolePlayChat.tsx
git commit -m "feat(careers): role-play chat client component"
```

---

## Task 14: Detail page (`/careers/[slug]`) Server Component

**Files:**
- Create: `src/app/careers/[slug]/page.tsx`
- Delete: `src/app/careers/[onetId]/page.tsx`
- Delete: `src/app/api/careers/[onetId]/route.ts`
- Delete: `src/components/career-chat.tsx`
- Delete: `src/components/career-details.tsx`

- [ ] **Step 1: Write `src/app/careers/[slug]/page.tsx`**

```tsx
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { resolveSlug, getOccupationByCode, getCareerDetail } from '@/lib/onet/occupations'
import { toCareerContext } from '@/lib/onet/projectors'
import { CareerDetailsPanel } from './_components/CareerDetailsPanel'
import { CareerRolePlayChat } from './_components/CareerRolePlayChat'
import { containerClassName } from '../../_styles/classes'

const ONET_CODE_RE = /^\d{2}-\d{4}\.\d{2}$/

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Legacy O*NET-code URLs → 301 to canonical slug
  if (ONET_CODE_RE.test(slug)) {
    const byCode = await getOccupationByCode(slug)
    if (byCode) redirect(`/careers/${byCode.slug}`)
    notFound()
  }

  const session = await getSession()
  if (!session?.user) redirect(`/auth/login?redirect=${encodeURIComponent(`/careers/${slug}`)}`)

  const occupation = await resolveSlug(slug)
  if (!occupation) notFound()

  const [detail, recRows] = await Promise.all([
    getCareerDetail(occupation.code).catch(err => {
      console.error('[careers/[slug]] getCareerDetail failed:', err)
      return null
    }),
    db.select().from(careerRecommendations)
      .where(and(
        eq(careerRecommendations.userId, session.user.id),
        eq(careerRecommendations.onetId, occupation.code),
      ))
      .limit(1),
  ])

  const whyItMatches = recRows[0]?.whyItMatches ?? null

  // Map RIASEC letter codes back to full names so the fallback chat context
  // stays consistent with the projector (which emits full names).
  const RIASEC_NAMES: Record<string, string> = {
    R: 'Realistic', I: 'Investigative', A: 'Artistic',
    S: 'Social', E: 'Enterprising', C: 'Conventional',
  }
  const careerContext = detail
    ? toCareerContext(detail)
    : {
        title: occupation.title,
        onetCode: occupation.code,
        shortDescription: occupation.description ?? '',
        tasks: [],
        skills: [],
        knowledge: [],
        workActivities: [],
        technology: [],
        jobZone: {
          number: occupation.jobZone,
          name: '',
          description: '',
        },
        riasecTop: occupation.riasecAll.map(c => RIASEC_NAMES[c] ?? c),
        salaryMedian: 'varies',
        outlook: '',
      }

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CareerDetailsPanel
            occupation={occupation}
            detail={detail}
            whyItMatches={whyItMatches}
          />
        </div>
        <div className="lg:col-span-2">
          <CareerRolePlayChat
            careerContext={careerContext}
            recommendationContext={whyItMatches ? { whyItMatches } : null}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the replaced files**

```bash
rm src/app/careers/[onetId]/page.tsx
rm -r src/app/careers/[onetId]
rm src/app/api/careers/[onetId]/route.ts
rm -r src/app/api/careers/[onetId]
rm src/components/career-chat.tsx
rm src/components/career-details.tsx
```

- [ ] **Step 3: Build to verify compile**

Run: `pnpm build`
Expected: build succeeds; no references to the deleted files remain. (Fix import sites if the compiler flags any — they should all be on the deleted detail page already.)

- [ ] **Step 4: Commit**

```bash
git add src/app/careers src/app/api/careers src/components
git commit -m "feat(careers): rewrite detail page as Server Component with slug routing"
```

---

## Task 15: Recommendation card links use slug (+ action writes slug)

**Files:**
- Modify: `src/app/careers/actions.ts`
- Modify: `src/app/careers/_components/CareersClient.tsx`
- Modify: `src/lib/schemas/career.ts`

- [ ] **Step 1: Extend the career schema to include slug**

`src/lib/schemas/career.ts`:

```ts
import { z } from 'zod'

export const CareerRecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  onetId: z.string(),
  slug: z.string().nullable().optional(),
  whyItMatches: z.string(),
  jobGrowth: z.string(),
  salaryRange: z.string(),
})

export const CareersResponseSchema = z.object({
  careers: z.array(CareerRecommendationSchema),
})

export type CareerRecommendation = z.infer<typeof CareerRecommendationSchema>
export type CareersResponse = z.infer<typeof CareersResponseSchema>
```

- [ ] **Step 2: Update `src/app/careers/actions.ts` to write slug**

Replace the insert block with a slug-aware version:

```ts
// inside generateCareerRecommendationsAction, replace the db.delete + db.insert block:

await db.delete(careerRecommendations)
  .where(eq(careerRecommendations.userId, user.id))

// Look up slugs from mirror
const codes = result.object.careers.map(c => c.onetId)
const mirrorRows = codes.length > 0
  ? await db.select({ code: onetOccupations.code, slug: onetOccupations.slug })
      .from(onetOccupations)
      .where(inArray(onetOccupations.code, codes))
  : []
const slugByCode = new Map(mirrorRows.map(r => [r.code, r.slug]))

await db.insert(careerRecommendations).values(
  result.object.careers.map(career => ({
    userId: user.id,
    onetId: career.onetId,
    slug: slugByCode.get(career.onetId) ?? null,
    title: career.title,
    description: career.description,
    whyItMatches: career.whyItMatches,
    jobGrowth: career.jobGrowth,
    salaryRange: career.salaryRange,
  })),
)

return {
  success: true,
  careers: result.object.careers.map(c => ({ ...c, slug: slugByCode.get(c.onetId) ?? null })),
}
```

Make sure to add to imports:

```ts
import { eq, inArray } from 'drizzle-orm'
import { onetOccupations, careerRecommendations } from '@/db/schema'
```

- [ ] **Step 3: Update read path in `src/app/careers/page.tsx`**

Include slug in the returned rows (`select` it and map it into the returned object).

- [ ] **Step 4: Update `CareersClient.tsx` link**

Change:
```tsx
href={`/careers/${career.onetId}`}
```
to:
```tsx
href={`/careers/${career.slug ?? career.onetId}`}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/careers/actions.ts src/app/careers/_components/CareersClient.tsx src/app/careers/page.tsx src/lib/schemas/career.ts
git commit -m "feat(careers): link cards to slug URLs, write slug on recommendation insert"
```

---

## Task 16: Explore page — server component with filters

**Files:**
- Create: `src/app/careers/explore/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { searchOccupations } from '@/lib/onet/browse'
import { containerClassName } from '../../_styles/classes'
import { ExploreFilters } from './_components/ExploreFilters'

interface SearchParams {
  q?: string
  riasec?: string
  zone?: string
  bright?: string
  page?: string
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await getSession()
  if (!session?.user) redirect('/auth/login?redirect=/careers/explore')

  const params = await searchParams
  const filters = {
    q: params.q,
    riasec: params.riasec?.split(',').filter(Boolean) ?? [],
    zone: params.zone?.split(',').map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 5) ?? [],
    bright: params.bright === '1',
    page: parseInt(params.page ?? '1', 10),
  }

  const { rows, total, page, pageSize } = await searchOccupations(filters)
  const hasMore = page * pageSize < total

  return (
    <div className={containerClassName}>
      <div className="text-center mb-8 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Explore careers</h1>
        <p className="text-sm text-muted-foreground">Search and filter the full O*NET catalog</p>
      </div>

      <ExploreFilters
        q={filters.q ?? ''}
        riasec={filters.riasec}
        zone={filters.zone}
        bright={filters.bright}
      />

      <div className="flex items-center justify-between mt-6 mb-4">
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} careers match</p>
        {(filters.q || filters.riasec.length || filters.zone.length || filters.bright) && (
          <Link href="/careers/explore" className="text-sm text-primary-soft hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      {rows.length === 0
        ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="font-serif text-xl text-foreground mb-3">No careers match these filters</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-4">Try removing a filter or searching for a different keyword.</p>
          </div>
        )
        : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map(row => (
                <Link
                  key={row.code}
                  href={`/careers/${row.slug}`}
                  className="block p-5 rounded-2xl border border-border bg-surface/50 hover:border-border-hover hover:-translate-y-0.5 transition-all no-underline"
                >
                  <h3 className="text-sm font-semibold text-foreground">{row.title}</h3>
                  <p className="text-xs text-muted-foreground mt-2">
                    Zone {row.jobZone}
                    {row.brightOutlook && ' · Bright'}
                    {row.riasecAll.length > 0 && ` · ${row.riasecAll.join('·')}`}
                  </p>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Link
                  href={{
                    pathname: '/careers/explore',
                    query: { ...params, page: String(page + 1) },
                  }}
                  className="px-6 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:border-border-hover no-underline"
                  scroll={false}
                >
                  Load more
                </Link>
              </div>
            )}
          </>
        )}
    </div>
  )
}
```

- [ ] **Step 2: Commit (ExploreFilters doesn't exist yet — next task)**

Don't commit until Task 17 is done, or stub the import.

---

## Task 17: ExploreFilters client component

**Files:**
- Create: `src/app/careers/explore/_components/ExploreFilters.tsx`

- [ ] **Step 1: Write the filter chip UI**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  q: string
  riasec: string[]
  zone: number[]
  bright: boolean
}

const RIASEC_OPTIONS = [
  { code: 'R', name: 'Realistic' },
  { code: 'I', name: 'Investigative' },
  { code: 'A', name: 'Artistic' },
  { code: 'S', name: 'Social' },
  { code: 'E', name: 'Enterprising' },
  { code: 'C', name: 'Conventional' },
]

const EDUCATION_OPTIONS: Array<{ label: string, zones: number[] }> = [
  { label: 'HS or less', zones: [1] },
  { label: 'Some college', zones: [2, 3] },
  { label: "Bachelor's", zones: [4] },
  { label: 'Advanced', zones: [5] },
]

export function ExploreFilters({ q, riasec, zone, bright }: Props) {
  const router = useRouter()
  const currentParams = useSearchParams()

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(currentParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    next.delete('page')  // reset pagination on filter change
    router.push(`/careers/explore?${next.toString()}`)
  }

  const toggleRiasec = (code: string) => {
    const set = new Set(riasec)
    set.has(code) ? set.delete(code) : set.add(code)
    updateParams({ riasec: [...set].join(',') || null })
  }

  const toggleZoneGroup = (zones: number[]) => {
    const set = new Set(zone)
    const allSelected = zones.every(z => set.has(z))
    for (const z of zones) allSelected ? set.delete(z) : set.add(z)
    updateParams({ zone: [...set].sort().join(',') || null })
  }

  const toggleBright = () => updateParams({ bright: bright ? null : '1' })

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => {
        e.preventDefault()
        const input = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)
        updateParams({ q: input.value.trim() || null })
      }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search 1,000+ careers by title or keyword…"
          className="w-full rounded-full border-2 border-primary/40 bg-surface/50 px-5 py-3 text-sm focus:outline-none focus:border-primary"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground mr-1">Interest</span>
        {RIASEC_OPTIONS.map(opt => {
          const active = riasec.includes(opt.code)
          return (
            <button
              key={opt.code}
              onClick={() => toggleRiasec(opt.code)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${active ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-border-hover'}`}
            >
              {opt.code} · {opt.name}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground mr-1">Education</span>
        {EDUCATION_OPTIONS.map(opt => {
          const active = opt.zones.every(z => zone.includes(z))
          return (
            <button
              key={opt.label}
              onClick={() => toggleZoneGroup(opt.zones)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${active ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-border-hover'}`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground mr-1">Outlook</span>
        <button
          onClick={toggleBright}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${bright ? 'bg-green-500 text-white border-green-500' : 'border-border text-muted-foreground hover:border-border-hover'}`}
        >
          ✦ Bright outlook
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to check**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit Task 16 + 17 together**

```bash
git add src/app/careers/explore
git commit -m "feat(careers): explore page with chip filters over local mirror"
```

---

## Task 18: Add `/careers/explore` link to the navigation bar

**Files:**
- Modify: `src/components/navigation-bar.tsx`

- [ ] **Step 1: Check navigation bar for existing link pattern**

Run: `pnpm exec rg -n 'careers' src/components/navigation-bar.tsx`
Look at how the existing `/careers` link is rendered.

- [ ] **Step 2: Add an "Explore" link**

Add `{ href: '/careers/explore', label: 'Explore' }` in the same style as the existing `/careers` entry. Match whatever auth-gate the existing careers link uses.

- [ ] **Step 3: Commit**

```bash
git add src/components/navigation-bar.tsx
git commit -m "feat(nav): add explore careers link"
```

---

## Task 19: E2E — career detail page

**Files:**
- Create: `e2e/specs/career-detail.spec.ts`

- [ ] **Step 1: Write the E2E spec**

```ts
import { test, expect } from '../fixtures/test-base'

const SAMPLE_CODE = '29-1141.00'
const SAMPLE_SLUG = 'registered-nurses'

test.describe('Career detail page', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
    // ensure the mirror row exists for the test career
    await dbUtils.sql`
      INSERT INTO onet_occupations (code, slug, title, description, job_zone, bright_outlook, riasec_primary, riasec_all)
      VALUES (${SAMPLE_CODE}, ${SAMPLE_SLUG}, 'Registered Nurses', 'Assess patient health.', 4, true, 'S', ARRAY['S','I','R'])
      ON CONFLICT (code) DO NOTHING
    `
  })

  test('renders O*NET details for a known slug', async ({ authenticatedPage: page, mockChatStream }) => {
    await mockChatStream(page)
    await page.goto(`/careers/${SAMPLE_SLUG}`)
    await expect(page.getByRole('heading', { name: 'Registered Nurses' })).toBeVisible()
    await expect(page.getByText(/Job Zone 4/)).toBeVisible()
    await expect(page.getByText(/Bright Outlook/i)).toBeVisible()
  })

  test('redirects O*NET code URL to canonical slug (301)', async ({ authenticatedPage: page }) => {
    const response = await page.goto(`/careers/${SAMPLE_CODE}`)
    expect(response?.status()).toBe(200)
    expect(page.url()).toContain(`/careers/${SAMPLE_SLUG}`)
  })

  test('shows 404 for an unknown slug', async ({ authenticatedPage: page }) => {
    await page.goto('/careers/no-such-career')
    await expect(page.getByText(/not found/i)).toBeVisible()
  })

  test('renders "Why it fits you" when career is in user recommendations', async ({
    authenticatedPage: page,
    dbUtils,
    mockChatStream,
  }) => {
    await mockChatStream(page)
    const userId = await dbUtils.getTestUserId()
    await dbUtils.sql`
      INSERT INTO career_recommendations (user_id, onet_id, slug, title, description, why_it_matches, job_growth, salary_range)
      VALUES (${userId}, ${SAMPLE_CODE}, ${SAMPLE_SLUG}, 'Registered Nurses', 'd', 'You care about helping people.', 'Fast', '$80k')
    `
    await page.goto(`/careers/${SAMPLE_SLUG}`)
    await expect(page.getByText('Why it fits you')).toBeVisible()
    await expect(page.getByText(/You care about helping people/)).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the spec**

Run: `pnpm test:e2e e2e/specs/career-detail.spec.ts`
Expected: 4 tests pass. (Real O*NET calls will happen; make sure `ONET_API_KEY` is set in the test env or stub `getCareerDetail` for the test run via a Playwright fixture.)

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/career-detail.spec.ts
git commit -m "test(e2e): career detail page"
```

---

## Task 20: E2E — explore page filters

**Files:**
- Create: `e2e/specs/careers-explore.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '../fixtures/test-base'

test.describe('/careers/explore', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
    await dbUtils.sql`
      INSERT INTO onet_occupations (code, slug, title, description, job_zone, bright_outlook, riasec_primary, riasec_all) VALUES
        ('29-1141.00', 'registered-nurses', 'Registered Nurses', '', 4, true, 'S', ARRAY['S','I','R']),
        ('15-1252.00', 'software-developers', 'Software Developers', '', 4, true, 'I', ARRAY['I','C']),
        ('35-3031.00', 'waiters-and-waitresses', 'Waiters and Waitresses', '', 2, false, 'E', ARRAY['E','C'])
      ON CONFLICT (code) DO NOTHING
    `
  })

  test('renders the default grid', async ({ authenticatedPage: page }) => {
    await page.goto('/careers/explore')
    await expect(page.getByRole('heading', { name: 'Explore careers' })).toBeVisible()
    await expect(page.getByText('Registered Nurses')).toBeVisible()
    await expect(page.getByText('Software Developers')).toBeVisible()
  })

  test('filters by keyword search', async ({ authenticatedPage: page }) => {
    await page.goto('/careers/explore')
    await page.getByPlaceholder(/Search/).fill('nurse')
    await page.getByPlaceholder(/Search/).press('Enter')
    await expect(page).toHaveURL(/q=nurse/)
    await expect(page.getByText('Registered Nurses')).toBeVisible()
    await expect(page.getByText('Software Developers')).not.toBeVisible()
  })

  test('filters by bright outlook chip', async ({ authenticatedPage: page }) => {
    await page.goto('/careers/explore')
    await page.getByRole('button', { name: /Bright outlook/i }).click()
    await expect(page).toHaveURL(/bright=1/)
    await expect(page.getByText('Waiters and Waitresses')).not.toBeVisible()
  })

  test('links to the detail page by slug', async ({ authenticatedPage: page }) => {
    await page.goto('/careers/explore')
    await page.getByText('Registered Nurses').click()
    await expect(page).toHaveURL('/careers/registered-nurses')
  })
})
```

- [ ] **Step 2: Run the spec**

Run: `pnpm test:e2e e2e/specs/careers-explore.spec.ts`
Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/careers-explore.spec.ts
git commit -m "test(e2e): explore page filter behavior"
```

---

## Task 21: E2E — extend career-chat spec for role-play persona

**Files:**
- Modify: `e2e/specs/career-chat.spec.ts`
- Modify: `e2e/fixtures/test-base.ts` (if needed — to seed onet_occupations)

- [ ] **Step 1: Update the mock-chat fixture to return a first-turn persona intro**

Look at `e2e/fixtures/test-base.ts` for the `mockChatStream` implementation. Find `MOCK_CHAT_RESPONSE` and replace with text that looks like a first-person practitioner intro:

```
Hi! I'm Sarah — I've been a Registered Nurse for 8 years, mostly in pediatric ICU at a community hospital in Ohio. Ask me anything about the career or what a typical shift is like. What would you like to know first?
```

- [ ] **Step 2: Update the existing tests to use the new slug-based URL**

In `e2e/specs/career-chat.spec.ts`:
- Add a `beforeEach` to seed `onet_occupations` for the test career.
- Change `page.goto('/careers/${career.onetId}')` → `page.goto('/careers/${career.slug ?? career.onetId}')`.
- Assert the new chat header: `Talk with a Registered Nurses` instead of `Chat about Registered Nurses`.
- Assert the first-turn introduction text (`"I've been a Registered Nurse for 8 years"`).

- [ ] **Step 3: Run the spec**

Run: `pnpm test:e2e e2e/specs/career-chat.spec.ts`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "test(e2e): role-play persona + slug URLs in chat specs"
```

---

## Task 22: Final verification — full test suite + lint + build

- [ ] **Step 1: Run all unit tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 2: Run all E2E tests**

Run: `pnpm test:e2e`
Expected: all pass.

- [ ] **Step 3: Run linter**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit the final verification state (if any formatting changed)**

If `pnpm lint` modified files:
```bash
git add -u
git commit -m "chore: lint fixes after feature completion"
```

---

## Rollout checklist

- [ ] `ONET_API_KEY` added to production env (Vercel / wherever)
- [ ] Migration applied to production DB (`pnpm dk:push` against prod URL, or via managed migration flow)
- [ ] `pnpm seed:onet` run once against production (~3-5 min)
- [ ] Old bookmarked URLs like `/careers/29-1141.00` redirect to canonical slug on prod
- [ ] Recommendations table `slug` backfilled (run an ad-hoc UPDATE joining on `onet_id = code`)
- [ ] Spot-check at least 3 careers: detail page renders O*NET data, chat streams a first-person intro with a name, Start Over re-rolls persona
