# AGENTS.md

## Cursor Cloud specific instructions

### Overview
Career Quest is a Next.js 15 career exploration app. See `CLAUDE.md` for full architecture details and command reference.

### Environment variables
A `.env.local` file must exist with: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`. These are injected as VM secrets. Copy from `.env.example` and populate with secret values.

### Key commands
Standard commands are in `package.json` scripts and documented in `CLAUDE.md`. Quick reference:
- `pnpm dev` — dev server with Turbopack on port 3000
- `pnpm build` — production build
- `pnpm lint` / `pnpm lint:fix` — ESLint

### Gotchas
- **Native build scripts**: `pnpm.onlyBuiltDependencies` in `package.json` whitelists `@tailwindcss/oxide`, `esbuild`, `sharp`, `unrs-resolver`. Without this, `pnpm install` silently skips their postinstall scripts and Tailwind/Next.js will fail.
- **eslint-plugin-react-hooks**: The project pins v5 as a devDependency. Installing v7+ introduces strict purity/effect rules that break lint and build against the existing codebase.
- **External services**: The app requires a live Supabase project (PostgreSQL + Auth) and an OpenAI API key. There is no local DB or mock setup. Anonymous auth auto-creates sessions on first visit.
- **No automated tests**: The codebase has no test suite; validation is done via lint + build + manual testing.
