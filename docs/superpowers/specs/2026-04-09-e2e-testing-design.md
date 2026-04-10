# E2E Testing Design — Career Quest

## Overview

End-to-end testing infrastructure for Career Quest using Playwright with local Supabase (real database and auth) and mocked LLM calls. Designed to run both locally and in GitHub Actions CI.

## Key Decisions

- **Test framework**: Playwright (fast, reliable, first-party Next.js support, handles streaming)
- **Database/Auth**: Real local Supabase via CLI — no mocks. PostgreSQL with RLS, GoTrue auth.
- **LLM mocking**: Hybrid approach — Playwright route interception for browser-side fetches, MSW for server-side OpenAI calls. Zero production code changes (MSW loaded via Next.js `instrumentation.ts` hook).
- **Test users**: Pre-seeded user for most tests, programmatic creation for auth-specific scenarios.
- **Fixtures**: Realistic, static — pre-recorded responses matching real schemas. 10 career recommendations, streaming chat messages with markdown.

## Architecture

Three components:

1. **Playwright test runner** — orchestrates tests, intercepts `/api/careers/chat` browser fetches with streaming fixtures, manages global setup/teardown.
2. **Next.js app in test mode** (`NODE_ENV=test`) — real app with `instrumentation.ts` conditionally loading MSW handlers to intercept server-side `api.openai.com` calls.
3. **Local Supabase** — real PostgreSQL + GoTrue. Started in global setup, tables truncated between test suites.

### LLM Mocking Points

| Call Site | Mechanism | What's Intercepted |
|---|---|---|
| `/api/careers/chat` (browser fetch) | `page.route()` in Playwright | Streaming SSE response from `streamText()` |
| `generateCareerRecommendationsAction` (server action) | MSW `setupServer()` in `instrumentation.ts` | `POST api.openai.com/v1/chat/completions` returning `generateObject()` fixture |

### Why Two Mechanisms

- `page.route()` can only intercept requests originating from the browser page context.
- Server actions call OpenAI from the Next.js server process, invisible to Playwright.
- MSW intercepts Node.js `fetch()` calls at the process level, covering server-side calls.
- The hybrid covers both with no application code changes.

## Local Supabase Setup

### Configuration

- `supabase/config.toml` — configure auto-confirm emails (no email verification in tests).
- Existing Drizzle migration (`supabase/migrations/0000_yellow_liz_osborn.sql`) applies automatically on `supabase start`.

### Seed Data

`supabase/seed.sql` creates the pre-known test user:
- Email: `test@example.com`, password: `testpassword123`
- Inserted directly into `auth.users` via Supabase's auth schema.

### Environment Override

`.env.test` with local Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
OPENAI_API_KEY=sk-fake-not-used
```

In CI, `.env.test` is generated dynamically from `supabase status --output json` to avoid hardcoding ports.

### Database Reset Between Suites

Instead of `supabase db reset` (~5s), truncate the three app tables directly via a Playwright fixture using a direct Postgres connection, then re-insert the seed user. Fast and sufficient.

## Test Suites

### A. `auth.spec.ts` — Authentication
- Sign up with new email/password (programmatic user creation)
- Verify redirect to intake after signup
- Log in with pre-seeded test user
- Verify protected routes redirect to login when unauthenticated
- Log out and verify session cleared

### B. `assessment.spec.ts` — Intake Flow
- Log in → navigate to interests page
- Select interests → verify saved to DB
- Navigate to would-you-rather quiz
- Answer questions, verify progress persisted across page refresh
- Skip a question, verify recorded
- Navigate backwards, verify previous answers intact

### C. `career-results.spec.ts` — Career Generation
- Complete assessment (interests + quiz answers)
- Navigate to summary → triggers `generateCareerRecommendationsAction`
- MSW returns 10-career fixture
- Verify careers list page renders all 10 careers with correct data
- Click into career detail → verify content renders

### D. `career-chat.spec.ts` — AI Chat
- Navigate to career detail (career recommendations pre-seeded in DB)
- Send chat message
- Playwright intercepts streaming response
- Verify assistant message renders with markdown formatting
- Verify chat context includes career information

## Project Structure

```
e2e/
├── playwright.config.ts          # baseURL, webServer, projects
├── global-setup.ts               # Start Supabase, migrations, seed user
├── global-teardown.ts            # Stop Supabase (optional)
├── fixtures/
│   ├── auth.ts                   # Login helper, fresh user creator
│   ├── db.ts                     # Truncate tables, re-seed
│   ├── chat-response.ts          # SSE streaming fixture
│   └── career-recommendations.ts # 10 realistic careers
├── msw/
│   └── handlers.ts               # MSW handler for api.openai.com
├── specs/
│   ├── auth.spec.ts
│   ├── assessment.spec.ts
│   ├── career-results.spec.ts
│   └── career-chat.spec.ts
└── .env.test                     # Local Supabase env vars (gitignored in CI)
```

### Key Files Outside `e2e/`

- **`src/instrumentation.ts`** — Next.js instrumentation hook. When `NODE_ENV=test`, imports and starts MSW server with OpenAI handlers. This is a standard Next.js feature, not test-specific plumbing.

### Playwright Configuration

- `webServer` starts `next dev` loading `.env.test`.
- Single Chromium project initially (Firefox/WebKit addable later).
- Custom fixtures extend base `test` with `authenticatedPage` (pre-logged-in page) and `dbUtils` (truncate/seed helpers).

### Package.json

**New scripts:**
```json
"test:e2e": "NODE_ENV=test playwright test",
"test:e2e:ui": "NODE_ENV=test playwright test --ui"
```

**New dev dependencies:**
- `@playwright/test`
- `msw`

## CI Integration (GitHub Actions)

### Workflow: `.github/workflows/e2e.yml`

**Trigger:** Push to `main`, pull requests.

**Steps:**
1. Checkout code
2. Install pnpm + Node.js (with dependency cache)
3. `pnpm install`
4. Install Supabase CLI (`npx supabase@latest`)
5. `supabase start` — local Supabase containers (~30-60s first run, cached after)
6. Extract credentials from `supabase status --output json` → generate `.env.test`
7. `pnpm exec playwright install --with-deps chromium`
8. `pnpm test:e2e`
9. Upload Playwright HTML report as artifact on failure
10. `supabase stop` in cleanup step (always runs)

### CI Notes

- GitHub Actions runners have Docker available — Supabase CLI works out of the box.
- Docker layer caching can speed up `supabase start` on repeat runs.
- Playwright's `webServer` config handles Next.js startup identically to local.
- `.env.test` generated dynamically, not committed.
