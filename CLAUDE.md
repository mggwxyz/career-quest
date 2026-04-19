# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build the Next.js application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint with NODE_NO_WARNINGS=1
- `pnpm lint:fix` - Run ESLint with auto-fix

### Database Commands
- `npx drizzle-kit generate` - Generate database migrations
- `npx drizzle-kit push` - Push schema changes to database (fast dev flow — cannot apply custom SQL like CREATE EXTENSION or trigram indexes)
- `npx drizzle-kit migrate` (or `pnpm dk:migrate`) - Apply checked-in migration SQL files via the drizzle migration runner. Use this for migrations that include custom SQL not expressible in schema.ts (e.g., `CREATE EXTENSION pg_trgm`, `gin_trgm_ops`, partial indexes).
- `npx drizzle-kit studio` - Open Drizzle Studio for database inspection

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Database**: Neon Postgres via `@neondatabase/serverless` HTTP driver, Drizzle ORM
- **Authentication**: Neon Auth (`@neondatabase/auth`, powered by Better Auth)
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS with DaisyUI
- **AI Integration**: Vercel AI SDK with OpenAI

### Core Application Structure

#### Career Assessment System
The application is a career exploration tool built around psychological assessment questionnaires:

1. **Question System** (`src/app/_data/questions.ts`):
   - Three assessment types: RIASEC interests, work values, and workplace environment preferences
   - Each question presents two options with psychological codes (R, I, A, S, E, C for RIASEC)
   - Images and prompts support each option

2. **Discovery Flow**:
   - `/discover/interests` - Interest selection
   - `/discover/preferences` - Adaptive Bayesian RIASEC + work-values + work-context assessment (20–30 items, skip-supported, resume-on-reload)
   - `/discover/profile` - Results profile
   - `/careers` - AI-powered career recommendations

3. **State Management** (`src/store/`):
   - Zustand store with persistent slices for interests and assessment responses
   - Separated concerns: `interestsSlice.ts` and `assessmentSlice.ts`

#### Database Schema
- **assessment_sessions** table: One row per user session; holds current posterior, stopped flag, completed result (jsonb), engine_version, created/completed timestamps.
- **assessment_responses** table: One row per answered (or skipped) item; logs the session_id, item_id, choice (1/2/null), shown_at / answered_at.
- **career_recommendations** table: AI-generated career suggestions keyed by (run_id FK, user_id), with a `rank` smallint and nullable `job_growth` / `salary_range`.
- No RLS — ownership is enforced in application code via `getSession()` filters on `user.id`
- User identity is managed by Neon Auth (`neon_auth.users_sync` view); we do NOT FK to it

#### Authentication & User Management
- Neon Auth for email/password and Google OAuth
- Catch-all auth handler at `src/app/api/auth/[...path]/route.ts`
- Server session helper: `src/lib/auth/get-session.ts` (`getSession()` returns `{ user, session } | null`)
- Client SDK: `src/lib/auth/client.ts` exports `authClient` (Better Auth API: `signUp.email`, `signIn.email`, `signIn.social`, `requestPasswordReset`, `resetPassword`, `signOut`, `useSession`)
- Auth context: `src/providers/auth-provider.tsx` exposes `useAuth()` returning `{ user, loading, isLoggedIn, isAnonymous }`

### Key File Locations

#### Configuration
- `drizzle.config.ts` - Database configuration
- `eslint.config.mjs` - ESLint with Stylistic plugin rules
- `src/proxy.ts` - Next.js middleware (project uses `proxy.ts`, not `middleware.ts`); wraps `auth.middleware()` from Neon Auth

#### Core Components
- `src/app/discover/preferences/_components/OptionCard.tsx` - Adaptive assessment option card
- `src/components/navigation-bar.tsx` - Main navigation
- `src/components/ui/` - shadcn/ui components

#### Database
- `src/db/schema.ts` - Drizzle schema definitions
- `src/db/index.ts` - Drizzle client over `@neondatabase/serverless`
- `drizzle/migrations/` - Active database migrations
- `archive/supabase-migrations/` - Archived legacy Supabase migrations (read-only history)

#### API Routes
- `src/app/api/auth/[...path]/route.ts` - Catch-all Neon Auth handler
- `src/app/api/careers/[onetId]/route.ts` - Single-career detail endpoint
- `src/app/api/careers/chat/route.ts` - AI chat functionality
- `src/app/api/user/route.ts` - Current user profile (from session)
- `src/app/api/assessment/session/route.ts` - POST creates a new session + returns first item; GET returns active session state (item, itemsAnswered) or stopped result.
- `src/app/api/assessment/response/route.ts` - POST records an answer (or skip) and returns the next item or a stop signal.
- `src/app/api/assessment/result/route.ts` - GET returns the latest completed session's AssessmentResult or `{ result: null }`.

## Development Notes

### Environment Variables
The application uses `dotenv-flow` for environment management. Required: `DATABASE_URL` (Neon Postgres), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (Neon Auth), `OPENAI_API_KEY`. Server-only auth files validate these at module load and throw with a clear message if missing.

### Code Style
- ESLint configuration enforces 2-space indentation
- Stylistic rules for consistent formatting
- TypeScript strict mode enabled

### Assessment Logic
The adaptive engine (in `src/lib/assessment/`) maintains a Bayesian posterior over RIASEC/work-values/work-context scales. After each response, `advance()` updates the posterior and picks the next item. Stopping rules: confidence threshold reached, max 20 items, or inconsistency flag. Final results include Holland code, ranked scales with confidence bands, top work values, and work-context leans.

### AI Integration
Career recommendations are generated using OpenAI models through the Vercel AI SDK, taking user assessment results as input for personalized career suggestions.