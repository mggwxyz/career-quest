# O*NET Career Explorer + Role-Play Chat — Design

**Date:** 2026-04-18
**Status:** Approved for planning
**Scope:** Replace the current thin `/careers/[onetId]` detail page with a full O*NET-backed career explorer. Users can browse and search the full O*NET occupation catalog, view rich O*NET details on a per-career page, and have a conversation with an AI that role-plays as a working practitioner in that career.

---

## Motivation

Today, `/careers` shows the user's AI-generated career recommendations and `/careers/[onetId]` links each out to onetonline.org for details while offering a generic "career counselor" AI chat. Students never see O*NET data inline and the chat voice is neutral and impersonal. This spec moves the product toward a more engaging, information-rich experience: real O*NET content in-app, a full catalog to browse beyond the AI recommendations, and a chat persona that feels like talking with someone who actually works in the career.

## Goals

1. Let logged-in users browse and filter the full O*NET catalog via a new `/careers/explore` page.
2. Render inline O*NET details on the per-career page (tasks, skills, knowledge, technology, education, salary, outlook).
3. Replace the "career counselor" chat persona with a named practitioner who role-plays as someone working in that career, grounded strictly in the injected O*NET data.
4. Use human-readable slugs in URLs (not numeric O*NET codes).
5. When the career is in the signed-in user's recommendations, personalize the chat with their "why it matches you" context.

## Non-goals (v1)

- Chat persistence (no DB table, reload clears the thread and re-rolls the persona).
- Guest / unauthenticated browsing (all routes require auth).
- Sharing specific chat threads via URL.
- Industry-cluster or Green-job filters.
- Automated background refresh of the local O*NET mirror (re-seed is a manual `pnpm seed:onet` for v1).

---

## Architecture

```
/careers/explore            /careers/[slug]                 /api/careers/chat
(Server Component)          (Server Component)              (unchanged route,
  - URL-state filters        - SSR details panel              richer request body)
  - Client <ExploreFilters>  - <CareerRolePlayChat/> island
        │                           │                              │
        ▼                           ▼                              │
  src/lib/onet/               src/lib/onet/                         │
  searchOccupations           getCareerDetail()                     │
  (SQL, local mirror)         (O*NET WS, revalidate 86400)          │
        │                           │                              │
        ▼                           ▼                              ▼
  Postgres                     O*NET Web Services              OpenAI (Vercel AI SDK)
  onet_occupations table       /mnm/careers/{code}/            system prompt assembled
  (seeded via                                                  server-side from O*NET
   pnpm seed:onet)                                             + recommendation context
```

**Key decisions:**

- **Approach:** Server-first rendering with Next.js `fetch` revalidation (`revalidate: 86400`). No client-side data fetching except the chat stream.
- **O*NET data source:** O*NET Web Services "My Next Move" JSON (`/ws/mnm/careers/{code}/`) for detail pages. Catalog list comes from `/ws/online/occupations/` and is mirrored locally.
- **Local mirror (`onet_occupations`):** Backs the explore page's search and filter queries via plain SQL. Avoids juggling four different O*NET browse endpoints.
- **URL shape:** `/careers/[slug]` (e.g. `/careers/registered-nurses`). Old `/careers/29-1141.00` URLs detect the code pattern and 301-redirect to the canonical slug.

---

## Data layer

### New table: `onet_occupations`

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE onet_occupations (
  code            text PRIMARY KEY,          -- e.g. "29-1141.00"
  slug            text NOT NULL UNIQUE,      -- e.g. "registered-nurses"
  title           text NOT NULL,
  description     text,                      -- short description from O*NET
  job_zone        integer NOT NULL,          -- 1..5
  bright_outlook  boolean NOT NULL DEFAULT false,
  riasec_primary  char(1),                   -- R/I/A/S/E/C (strongest interest)
  riasec_all      char(1)[] NOT NULL DEFAULT '{}',  -- all interests that apply
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX onet_occupations_job_zone_idx ON onet_occupations (job_zone);
CREATE INDEX onet_occupations_bright_idx   ON onet_occupations (bright_outlook) WHERE bright_outlook;
CREATE INDEX onet_occupations_riasec_idx   ON onet_occupations USING gin (riasec_all);
CREATE INDEX onet_occupations_title_trgm   ON onet_occupations USING gin (title gin_trgm_ops);
```

### Migration to `career_recommendations`

```sql
ALTER TABLE career_recommendations ADD COLUMN slug text;
-- Backfill existing rows by joining on onet_id = onet_occupations.code.
UPDATE career_recommendations cr
   SET slug = o.slug
  FROM onet_occupations o
 WHERE cr.onet_id = o.code;
-- Not made NOT NULL yet; resolve-on-render tolerates nulls for rows whose
-- code isn't yet in the mirror (e.g. very recent O*NET additions).
```

Slug is populated at insert time in the careers `generateCareerRecommendations` action by looking up the code in the mirror. If the code isn't in the mirror, `slug` stays null and is resolved on read.

### Adapter module `src/lib/onet/`

```
src/lib/onet/
  client.ts        // fetch wrapper: ONET_API_KEY basic auth, next revalidate, zod validation
  schemas.ts       // zod schemas for the O*NET JSON responses we consume
  occupations.ts   // getCareerDetail(code), resolveSlug(slug)
  browse.ts        // searchOccupations({ q?, riasec?, zone?, bright?, page? })
  seed.ts          // seedOnetOccupations() - full refresh of the mirror
  index.ts         // re-exports
```

- `getCareerDetail(code)` → `fetch` against `/ws/mnm/careers/{code}/` with `next: { revalidate: 86400 }`. Returns parsed & validated detail object (including the related-careers array that O*NET includes in the payload) or throws.
- `resolveSlug(slug)` → single-row Drizzle lookup in `onet_occupations` by slug. Returns `{ code, title, description, jobZone, brightOutlook, riasecAll } | null`.
- `getOccupationByCode(code)` → single-row Drizzle lookup in `onet_occupations` by code. Same return shape as `resolveSlug`. Used by the O*NET-code redirect path.
- `searchOccupations(filters)` → Drizzle query with WHERE clauses per filter. Keyword search uses `ILIKE '%q%'` + pg_trgm for fuzziness; filter fields use the dedicated indexes. Sorted by title, paginated at 30 per page.
- `seedOnetOccupations()` → walks `/ws/online/occupations/` (paginated), then for each code calls `/ws/mnm/careers/{code}/` to gather `job_zone`, `bright_outlook`, and RIASEC interest codes. Slugifies title (lowercase, hyphen, strip punctuation). Appends `-2`, `-3`, … on collision. Upserts into `onet_occupations`.

### Seed script

- Entry point: `scripts/seed-onet.ts`, runnable via `pnpm seed:onet`.
- Idempotent: re-running refreshes rows without duplicating.
- Rate-limit aware: sleeps on 429 and resumes. Throttles to ~20 req/min to stay inside O*NET free-tier.
- Target total: ~1000 rows × 2 API calls ≈ 2000 calls, ~2–4 min wall time.
- Intended usage: once locally during setup, once in CI before deploy. No cron for v1.

### Environment

New required env var: `ONET_API_KEY` (format: `username:password` per O*NET WS basic auth). Add to `.env.example` with instructions: register at https://services.onetcenter.org/ for a free account, then supply the credentials in Basic Auth form. Module-level guard in `src/lib/onet/client.ts` throws with a clear message if missing.

---

## Page: `/careers/[slug]`

### Server component data fetching

In parallel (no waterfalls):

1. `resolveSlug(slug)` — yields `{ code, title, ... }` or triggers 404. Also handles the O*NET-code-in-URL case by detecting the pattern `^\d{2}-\d{4}\.\d{2}$` and issuing a 301 redirect to the canonical slug.
2. `getCareerDetail(code)` — full O*NET My Next Move payload.
3. `getSession()` + conditional `SELECT * FROM career_recommendations WHERE user_id = $1 AND onet_id = $2` — yields `recommendationContext` or null.

### Layout — balanced two-column

Picked layout B from the brainstorming mockups:

- Left column (1/3): O*NET details panel.
  - Hero: title, short description, quick facts (Job Zone label, Bright Outlook badge, RIASEC letters).
  - Salary/outlook strip: median salary + growth label.
  - Sections (stacked cards):
    - What they do (top 5 tasks)
    - Skills (top 10)
    - Knowledge (top 5)
    - Education & training (job zone description)
    - Technology used (top 8 items)
    - Related careers (clickable tags, up to 6, linking to their slugs)
    - "Why it fits you" (only when `recommendationContext` is present)
    - External link: "View on O*NET" (retained for authoritative reference)
- Right column (2/3): Role-play chat — `<CareerRolePlayChat />` client island.
- Mobile: columns stack; chat collapses to a "Talk with a [title]" CTA that expands inline.

### Chat component contract

`<CareerRolePlayChat />` receives fully-assembled props from the server:

```ts
<CareerRolePlayChat
  careerContext={careerContext}           // full O*NET subset (see system-prompt section)
  recommendationContext={recommendationContext}  // or null
/>
```

Internally:

- Uses `useChat({ api: '/api/careers/chat', body: { careerContext, recommendationContext }, initialMessages: [] })`.
- No system message is rendered in the UI. The model's first streamed assistant message IS the introduction — name, years of experience, workplace context.
- Chat header: avatar placeholder + generic label "Talk with a **{title}**". Persona name surfaces in the message stream itself.
- "Start over" button clears `messages` and implicitly re-requests a fresh first message → model rolls a new persona.

---

## Page: `/careers/explore`

### Routing & filter state

- Filters live in the URL (source of truth):
  - `?q=` — keyword
  - `?riasec=R,I,S` — comma-separated interest letters
  - `?zone=3,4` — comma-separated job zone numbers
  - `?bright=1` — presence is truthy
  - `?page=2` — pagination
- Server component reads `searchParams`, runs `searchOccupations(filters)`, renders results.
- A small client component `<ExploreFilters>` owns the chip UI. Click toggles → constructs the new URL → `router.push()`. That re-triggers SSR.

### Layout — chips + grid

Picked layout B from the brainstorming mockups:

- Page title: "Explore careers" + subtitle.
- Primary search input (pill-shaped, full-width).
- Three filter-chip rows:
  - Interest (RIASEC) — six letter chips with full-name hints.
  - Education — four chips mapped to job-zone ranges: "HS or less" → `zone=1`; "Some college" → `zone=2,3`; "Bachelor's" → `zone=4`; "Advanced" → `zone=5`. Multi-select allowed.
  - Outlook — single "Bright outlook" chip.
- Results metadata row: "{N} careers match" + "Clear filters" link.
- Results grid: 3 columns on desktop, 1 on mobile. Each tile shows title + "Zone X · Bright · S·I·R" meta line. Click → `/careers/[slug]`.
- Pagination: simple "Load more" button that appends `?page=n` results via SSR.

### Empty states

- No filters, no query: show a default sampled set (e.g., first 30 Bright Outlook occupations).
- Filters produce zero matches: "No careers match these filters" + "Clear filters" CTA.
- Mirror empty (seed hasn't run): "Career catalog is still being prepared — check back in a few minutes."

---

## Chat API: `/api/careers/chat`

Existing route; extended request schema.

### Request (Zod-validated)

```ts
const CareerChatRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user','assistant','system']), content: z.string() })),
  careerContext: z.object({
    title: z.string(),
    onetCode: z.string(),
    shortDescription: z.string(),
    tasks: z.array(z.string()).max(5),
    skills: z.array(z.string()).max(10),
    knowledge: z.array(z.string()).max(5),
    workActivities: z.array(z.string()).max(5),
    technology: z.array(z.string()).max(8),
    jobZone: z.object({ number: z.number(), name: z.string(), description: z.string() }),
    riasecTop: z.array(z.string()).max(3),
    salaryMedian: z.string(),
    outlook: z.string(),
  }),
  recommendationContext: z.object({ whyItMatches: z.string() }).nullable(),
})
```

Invalid bodies → 400. The route also calls `getSession()` and returns 401 if no session exists; beyond that, the route does not verify that the user has access to the specific `onetCode` — pages themselves are gated and any logged-in user may chat about any career.

### System prompt assembly

`src/lib/chat/build-system-prompt.ts` exports `buildCareerRolePlaySystemPrompt(careerContext, recommendationContext)`. Produces a deterministic string (snapshot-testable) with sections:

- Role-play directive.
- Career identity (title, short description, O*NET code).
- Day-to-day (tasks, work activities, technology).
- Expertise (skills, knowledge).
- Background (education from job zone, RIASEC interests, typical comp, outlook).
- Behavior rules:
  - First message self-introduction: first name + 3–15 years of experience + one-line workplace context, consistent thereafter.
  - First person, warm, student-friendly, avoid jargon without explanation.
  - Ground factual claims in the provided data; admit uncertainty otherwise.
  - Offer honest view — rewarding and hard parts.
  - Concise (2–4 short paragraphs), end with an inviting prompt.
  - Optional: incorporate `recommendationContext.whyItMatches` into the framing, not verbatim.
- Constraints: never break character, never claim to be AI, never fabricate specific companies/salaries/stats.

### Model

Keep `gpt-4o` for now (matches the existing `/api/careers/chat` route). Streaming remains the same. No temperature override for v1.

---

## Recommendation → slug wiring

In `src/app/careers/actions.ts`, after the AI returns recommendations:

1. For each recommended `onetId`, look up its slug in `onet_occupations`.
2. Store both `onet_id` and `slug` on insert into `career_recommendations`.
3. If `onet_id` has no mirror row (brand-new O*NET occupation), insert with `slug = null` and log a warning. Reader-side resolution fills it in on display.

`CareersClient` card links: `/careers/${career.slug ?? career.onetId}` (fallback to code keeps old rows working until backfill).

---

## Error handling & edge cases

| Case | Behavior |
|---|---|
| Slug not in `onet_occupations` | 404 with "Career not found — try exploring" CTA back to `/careers/explore`. |
| O*NET WS detail API down/slow | Detail page falls back to static mirror fields (title, description, job zone, bright outlook, RIASEC). Rich blocks replaced with "More details are refreshing — check back soon." Chat stays enabled with reduced context. |
| Chat POST missing `careerContext` | 400 Bad Request from Zod. |
| Seed hasn't run (empty mirror) | Explore page shows prep notice. Detail routes 404. CI seed prevents this in prod. |
| Old O*NET-code URL `/careers/29-1141.00` | Detect with regex in the slug param; `resolveSlug`-fallback to `getOccupationByCode` → 301 redirect to canonical slug. |
| Recommendation row with null `slug` | Resolve-on-render via mirror join. Card link uses code fallback. |
| Seed hits 429 | Catch, sleep 30s, resume. Upserts make partial runs safe. |
| Unauthenticated hit on `/careers/[slug]` or `/careers/explore` | Redirect to `/login?redirect=...`. |
| Chat stream error | Existing retry UI in `CareerChat` component (reused by the new role-play component). |

---

## Testing strategy

| Layer | What | Location |
|---|---|---|
| O*NET adapter | `getCareerDetail`, `searchOccupations`, `resolveSlug` against fixture JSON (recorded O*NET responses) | `src/lib/onet/*.test.ts` |
| Seed script | Slugification, collision handling, dry-run idempotency | `scripts/seed-onet.test.ts` |
| System prompt assembly | Snapshot test — with and without `recommendationContext` | `src/lib/chat/build-system-prompt.test.ts` |
| `/careers/explore` | Filter combinations via query params; pagination; empty state | `e2e/specs/careers-explore.spec.ts` |
| `/careers/[slug]` | Renders O*NET details; recommendation-context variant; 404 on bad slug; 301 from O*NET code | `e2e/specs/career-detail.spec.ts` |
| Role-play chat | First turn introduces a name + years + workplace; persona consistency across turns; refuses claims outside injected payload | Extend `e2e/specs/career-chat.spec.ts` |

---

## Rollout

1. Add `ONET_API_KEY` to `.env.example` with setup instructions.
2. Ship the migration (`onet_occupations` + `career_recommendations.slug` nullable).
3. Run `pnpm seed:onet` locally to verify and populate dev DB.
4. Merge code. CI seed step runs against the production DB before enabling new routes.
5. Old `/careers/[onetId]` URL path becomes the slug path; redirect rule handles in-flight links from emails, bookmarks, the recommendations list until those rows are backfilled.

## Open questions (none blocking)

All design-level decisions are settled. Implementation-level choices left for the plan:
- Exact Drizzle typing for `char(1)[]` array columns (validated approach with `text[]`).
- Whether the seed step fits in the existing CI flow or needs a separate workflow with its own quota budget.
- Whether "Load more" vs. numbered pagination reads better — visual at implementation time.
