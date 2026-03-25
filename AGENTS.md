# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Career Quest is a Next.js 15 career assessment app using Supabase (auth + Postgres), OpenAI, and Zustand. See `CLAUDE.md` for the full architecture and command reference.

### Environment variables

A `.env.local` file is required with `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENAI_API_KEY`. These are injected as VM secrets. See `.env.example` for the template.

### Key commands

- **Dev server:** `pnpm dev` (Turbopack, port 3000)
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- See `CLAUDE.md` and `package.json` scripts for the full list.

### Gotchas

- `eslint-plugin-react-hooks` must be pinned to `5.x` (matching `eslint-config-next@15.x`). The latest v7 introduces breaking rule changes that cause false positives on existing code.
- pnpm's strict module isolation means peer dependencies of `eslint-config-next` (like `eslint-plugin-react-hooks`) must be listed as direct `devDependencies` in `package.json`.
- Native build scripts for `@tailwindcss/oxide`, `esbuild`, `sharp`, and `unrs-resolver` are approved via `pnpm.onlyBuiltDependencies` in `package.json`. If new native deps are added, they need to be added there too.
- All routes except `/auth/*` are protected by Supabase auth middleware — unauthenticated access redirects to `/auth/login`.
- No automated test framework is installed (Jest/Vitest/Playwright). Testing is manual only.
- Supabase's built-in email service has a 3 emails/hour rate limit. Avoid rapid sign-up attempts when testing auth flows.
