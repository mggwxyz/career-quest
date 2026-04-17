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
- `npx drizzle-kit push` - Push schema changes to database
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
   - `/discover/preferences` - Would-you-rather assessment interface
   - `/discover/profile` - Results profile
   - `/careers` - AI-powered career recommendations

3. **State Management** (`src/store/`):
   - Zustand store with persistent slices for interests and assessment responses
   - Separated concerns: `interestsSlice.ts` and `wouldYouRatherSlice.ts`

#### Database Schema
- **quiz_answers** table: Per-user assessment responses, keyed by `user_id` (text)
- **career_recommendations** table: AI-generated career suggestions per user, keyed by `user_id` (text)
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
- `src/app/intake/would-you-rather/_components/OptionCard.tsx` - Assessment UI
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
- `src/app/api/user/progress/route.ts` - Quiz answer read/write

## Development Notes

### Environment Variables
The application uses `dotenv-flow` for environment management. Required: `DATABASE_URL` (Neon Postgres), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (Neon Auth), `OPENAI_API_KEY`. Server-only auth files validate these at module load and throw with a clear message if missing.

### Code Style
- ESLint configuration enforces 2-space indentation
- Stylistic rules for consistent formatting
- TypeScript strict mode enabled

### Assessment Logic
The "would you rather" format presents psychological choices that map to career interest codes. The `getDeckResults()` selector on the Zustand store (`src/store/slices/wouldYouRatherSlice.ts`) processes user responses into RIASEC/work-value/environment tallies for AI career matching.

### AI Integration
Career recommendations are generated using OpenAI models through the Vercel AI SDK, taking user assessment results as input for personalized career suggestions.