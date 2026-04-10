# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Next.js dev server | `pnpm dev` | 3000 | Uses Turbopack; hot-reloads on file changes |

### Environment variables

A `.env.local` file is required with `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENAI_API_KEY`. See `.env.example` for the template. In the cloud VM these are injected as environment variables; generate `.env.local` from them before starting the server.

### Lint / Build / Dev

- **Lint:** `pnpm lint` (runs ESLint with `NODE_NO_WARNINGS=1`)
- **Build:** `pnpm build` (production build with type-checking and lint)
- **Dev:** `pnpm dev` (Turbopack dev server on port 3000)

### Gotchas

- `pnpm install` warns about ignored build scripts for native deps (`@tailwindcss/oxide`, `esbuild`, `sharp`, `unrs-resolver`). The `pnpm.onlyBuiltDependencies` allowlist in `package.json` resolves this.
- There is no automated test framework (Jest, Vitest, Playwright) configured in this repo. Testing is done via linting and manual verification.
- Supabase is deeply integrated: the database uses `auth.uid()` in RLS policies, so a plain PostgreSQL won't work—cloud Supabase or local `supabase start` is required.
- The `eslint-plugin-react-hooks` package is a transitive dep of `eslint-config-next`; do not install it explicitly as a top-level devDependency (v7 introduces stricter rules that break the build).
- The `dotenv-flow` package auto-loads `.env.local` during build and runtime; no manual sourcing needed.
