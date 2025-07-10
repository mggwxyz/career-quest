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
- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
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

2. **Assessment Flow**:
   - `/intake/would-you-rather` - Main assessment interface
   - `/intake/interests` - Interest-based questions
   - `/intake/summary` - Results summary
   - `/careers` - AI-powered career recommendations

3. **State Management** (`src/store/`):
   - Zustand store with persistent slices for interests and assessment responses
   - Separated concerns: `interestsSlice.ts` and `wouldYouRatherSlice.ts`

#### Database Schema
- **instruments** table: Assessment tool metadata
- **career_recommendations** table: AI-generated career suggestions per user
- Row-level security (RLS) policies for user data isolation

#### Authentication & User Management
- Supabase Auth with multiple providers (OAuth, email/password)
- User avatars and profile management
- Protected routes and middleware

### Key File Locations

#### Configuration
- `drizzle.config.ts` - Database configuration
- `eslint.config.mjs` - ESLint with Stylistic plugin rules
- `src/middleware.ts` - Supabase auth middleware

#### Core Components
- `src/app/intake/would-you-rather/_components/OptionCard.tsx` - Assessment UI
- `src/components/navigation-bar.tsx` - Main navigation
- `src/components/ui/` - shadcn/ui components

#### Database
- `src/db/schema.ts` - Drizzle schema definitions
- `src/db/relations.ts` - Database relationships
- `supabase/migrations/` - Database migrations

#### API Routes
- `src/app/api/careers/route.ts` - Career recommendation endpoint
- `src/app/api/careers/chat.ts` - AI chat functionality

## Development Notes

### Environment Variables
The application uses `dotenv-flow` for environment management. Database credentials are required for Supabase and PostgreSQL connections.

### Code Style
- ESLint configuration enforces 2-space indentation
- Stylistic rules for consistent formatting
- TypeScript strict mode enabled

### Assessment Logic
The "would you rather" format presents psychological choices that map to career interest codes. The `tallyResults.ts` helper processes user responses to generate personality profiles for AI career matching.

### AI Integration
Career recommendations are generated using OpenAI models through the Vercel AI SDK, taking user assessment results as input for personalized career suggestions.