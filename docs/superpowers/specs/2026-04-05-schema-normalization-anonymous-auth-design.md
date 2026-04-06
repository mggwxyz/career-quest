# Schema Normalization & Anonymous Auth Design

## Overview

Normalize the single `user_info` table into three purpose-specific tables and enable Supabase anonymous sign-ins so all users (anonymous and authenticated) persist data to the database.

## Goals

- Replace loose `json` columns with properly typed, normalized tables
- Enable Supabase anonymous auth so every visitor gets a real session
- Eliminate the localStorage-only guest mode in favor of universal DB persistence
- Ensure anonymous-to-authenticated account linking works seamlessly

## Database Schema

### `users` table

Replaces the profile fields from `user_info`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `text` | PK, default `auth.uid()` | UUID from Supabase Auth |
| `email` | `text` | nullable | Anonymous users won't have one |
| `first_name` | `text` | nullable | |
| `last_name` | `text` | nullable | |
| `interests` | `text[]` | nullable | Array of selected interest strings |
| `created_at` | `timestamptz` | not null, default now | |
| `updated_at` | `timestamptz` | not null, default now | |

### `quiz_answers` table

One row per question response, replacing the `quizAnswers` JSON column.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `serial` | PK | Auto-increment |
| `user_id` | `text` | FK → `users.id` (cascade delete), not null | |
| `question_id` | `text` | not null | References static data, e.g. `"riasec-1"` |
| `selected_option` | `smallint` | nullable | `1` or `2`; null means skipped |
| `created_at` | `timestamptz` | not null, default now | |
| `updated_at` | `timestamptz` | not null, default now | |

**Unique constraint:** `(user_id, question_id)` — one answer per question per user, upserted on change.

### `career_recommendations` table

One row per recommendation, replacing the `quizResults` JSON column.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `serial` | PK | Auto-increment |
| `user_id` | `text` | FK → `users.id` (cascade delete), not null | |
| `onet_id` | `text` | not null | O*NET occupation identifier |
| `title` | `text` | not null | Career title |
| `description` | `text` | not null | Career description |
| `why_it_matches` | `text` | not null | Match reasoning from AI |
| `job_growth` | `text` | not null | Growth outlook |
| `salary_range` | `text` | not null | Salary range |
| `created_at` | `timestamptz` | not null, default now | |

### Questions

Questions remain as static TypeScript data in `src/app/_data/questions.ts`. The `quiz_answers.question_id` column references question IDs by string (e.g., `"riasec-1"`).

## RLS Policies

All three tables use the same pattern, applied to both `authenticated` and `anon` roles:

```sql
-- SELECT
auth.uid() = user_id

-- INSERT
auth.uid() = user_id

-- UPDATE
auth.uid() = user_id
```

For the `users` table, the check is `auth.uid() = id`.

No DELETE policies — deletion is an admin concern, not client-facing.

## Anonymous Auth

### Supabase Configuration

Enable "Anonymous Sign-ins" in Supabase dashboard: Authentication → Settings → Anonymous Sign-ins.

### How It Works

- Anonymous users get a real `auth.users` row with a UUID and a JWT
- `auth.uid()` works identically for anonymous and authenticated users
- RLS policies apply uniformly — no role-based branching needed

### Account Linking

When an anonymous user signs up (email, OAuth, etc.), Supabase's identity linking upgrades the anonymous `auth.users` row in place. The UUID stays the same, so all FK references in `quiz_answers` and `career_recommendations` continue to work with zero data migration.

## Application Changes

### Auth Flow

- **Before:** Middleware redirects unauthenticated users to `/auth/login`. Guest mode uses localStorage only.
- **After:** A client-side auth provider component (e.g., wrapping the app layout) checks for an existing session on mount. If none exists, it calls `supabase.auth.signInAnonymously()` and creates a `users` row. Every user always has a session. No more guest-vs-logged-in branching for data persistence. Middleware no longer redirects to login — it only refreshes sessions.

### Data Sync

- **Before:** `useIsLoggedIn()` hook conditionally syncs to DB. Guests skip API calls.
- **After:** All users sync to DB always. The logged-in check is only needed for UI concerns (e.g., "Sign up to keep your progress" prompts).

### API Routes

- **Before:** Return 401 for unauthenticated users.
- **After:** All routes work for any user with a valid session. `auth.uid()` is the only check needed.

### Store Changes

- **Quiz answer writes:** Instead of POST-ing the entire answers JSON blob, upsert individual rows to `quiz_answers` on each answer change.
- **`hydrateFromDB()`:** Fetch rows from `quiz_answers` for the current user, reconstruct the `answers` Record and `skippedQuestions` Set client-side.
- **Career generation:** Save individual rows to `career_recommendations` instead of a JSON array.

### Migration Path

Since this is pre-production with no live user data:

1. Drop `user_info` table
2. Create `users`, `quiz_answers`, and `career_recommendations` tables
3. Update Drizzle schema definitions in `src/db/schema.ts`
4. Update all API routes to use new tables
5. Update store sync logic (hydration and persistence)
6. Replace guest mode with anonymous auth sign-in
7. Update middleware to allow anonymous sessions
