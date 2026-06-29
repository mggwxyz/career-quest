# AGENTS.md

Career Quest — Next.js 16 (App Router, Turbopack) career-exploration app. Neon Postgres + Drizzle ORM, Neon Auth, Vercel AI SDK + OpenAI, O*NET data. See `README.md` for product/architecture and the canonical command list (`pnpm dev`, `build`, `lint`, `test`, `test:e2e`, `dk:migrate`, `seed:onet`).

## Cursor Cloud specific instructions

Dependencies are installed by the startup update script (`pnpm install`). Toolchain: pnpm `10.27.0`; `.nvmrc` pins Node 24 and CI reads `.nvmrc` via `node-version-file`, so the repo and CI are aligned on Node 24. The only remaining variant is the Cursor Cloud executor, whose `node` is v22 (always first on `PATH`); the app/tests/build run fine on it.

### Secrets / env (the most important gotcha)
Required secrets are injected as real environment variables: `DATABASE_URL` (must be the **Neon** URL), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_NEON_PROJECT_ID`, `OPENAI_API_KEY`, `ONET_API_KEY`. Because they live in `process.env`, the app runs without a `.env.local`.

- **Real env vars take precedence over `.env.local`.** Both Next.js and the app's `dotenv` calls (`src/db/index.ts`, `drizzle.config.ts`) do *not* override variables already present in `process.env`. So a stale/wrong `DATABASE_URL` in the shell wins over `.env.local`.
- **Runtime DB driver is Neon-only.** `src/db/index.ts` uses `@neondatabase/serverless` (HTTP `/sql`). It only works against a real Neon endpoint (`*.neon.tech`); a plain Postgres/Supabase URL fails at request time with `NeonDbError: fetch failed` even though `select 1` may appear to work from a quick script. `drizzle-kit` (`dk:*`) connects over normal TCP and works with any Postgres, so migrations can succeed while the running app's queries fail — check the actual `DATABASE_URL` host if authed pages 500 with `fetch failed`.
- **If you change a secret mid-session, restart the dev server and its tmux session.** A long-lived tmux server caches the env it was started with; new panes inherit the old value. Start the dev server from a context where `DATABASE_URL` is the Neon URL (e.g. `tmux new-session -e DATABASE_URL="$DATABASE_URL" ...`, or just run it from a fresh shell).

### Database
`pnpm dk:migrate` is idempotent (safe to re-run). The shared Neon DB is already migrated and `onet_occupations` is seeded (~900 rows), so career browse/matches work out of the box; `pnpm seed:onet` (needs `ONET_API_KEY`) only refreshes O*NET data.

### Tests
`pnpm test` (Vitest) is mostly isolated, but a few suites (`src/lib/onet/__tests__/occupations.test.ts`, `browse.test.ts`) hit the real Neon DB, so `DATABASE_URL` must point at a reachable Neon endpoint. E2E (`pnpm test:e2e`) needs Chromium (`pnpm exec playwright install --with-deps chromium`) plus DB + Neon Auth; it spawns its own dev server and mocks OpenAI/O*NET.
