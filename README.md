# Career Quest

An interactive career-exploration tool that helps students discover careers through a game-style "would you rather" quiz, a Bayesian adaptive assessment, and AI-powered career chat.

**Live demo:** https://career-quest-app.vercel.app/

## What it does

- **Interest picker.** A quick "would you rather" round surfaces the shape of what a user is drawn to, without feeling like a survey.
- **Adaptive assessment.** A Bayesian engine over RIASEC, work values, and work context picks the next item based on the current posterior, stops when confidence is high enough, and supports skipping and resume-on-reload. Typical session is 20–30 items.
- **Career matching.** Results are scored against O\*NET occupations to generate a ranked list of careers, with growth and salary bands.
- **Career chat.** Users can drill into any career with a streaming AI chat — day-to-day, education paths, salary, what it's like to actually do the job.

## How the adaptive engine works

The core is a posterior over RIASEC scales (R, I, A, S, E, C), work values, and work-context preferences. Every item is a forced-choice pair with known psychometric loadings. After each response, the engine:

1. Updates the posterior using the item's loadings.
2. Checks stopping rules — confidence threshold, 20-item cap, or inconsistency flag.
3. Picks the next item by expected information gain, filtered to avoid repeating the same scale contrast too often.

Final output is a Holland code, ranked scales with confidence bands, top work values, and work-context leans — fed into the recommender and the chat system prompt.

See `src/lib/assessment/` for the engine and `src/app/api/assessment/` for the session API.

## Tech stack

- **Framework** — Next.js 16 (App Router) with Turbopack dev
- **Database** — Neon Postgres via `@neondatabase/serverless` + Drizzle ORM
- **Auth** — Neon Auth (Better Auth), email/password + Google OAuth
- **AI** — Vercel AI SDK + OpenAI for career chat and recommendations
- **State** — Zustand with persistence
- **Styling** — Tailwind CSS + shadcn/ui + DaisyUI
- **Testing** — Vitest (unit), Playwright (e2e)

## Getting started

Requires Node 24 and pnpm.

```bash
pnpm install
cp .env.example .env.local
# fill in DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, OPENAI_API_KEY
pnpm dk:migrate
pnpm dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `NEON_AUTH_BASE_URL` | Neon Auth base URL |
| `NEON_AUTH_COOKIE_SECRET` | Neon Auth session cookie secret |
| `OPENAI_API_KEY` | OpenAI API key for chat + career generation |
| `ONET_API_KEY` | (optional) O\*NET API key for occupation data seeding |

See `.env.example` for the full list.

## Scripts

```bash
pnpm dev           # dev server (Turbopack)
pnpm build         # production build
pnpm lint          # eslint
pnpm test          # vitest (unit)
pnpm test:e2e      # playwright (e2e)
pnpm dk:generate   # generate migration from schema.ts
pnpm dk:migrate    # apply checked-in migration SQL
pnpm seed:onet     # seed O*NET occupation data
```

## Project layout

```
src/
  app/                      # Next.js App Router routes
    api/                    # route handlers (auth, assessment, careers, chat)
    discover/               # interest picker + adaptive assessment UI
    careers/                # career browse, detail, matches, chat
  lib/assessment/           # Bayesian adaptive engine
  lib/auth/                 # Neon Auth helpers
  db/                       # Drizzle schema + client
  store/                    # Zustand slices
data/personas/              # curated persona dataset for career visualization
drizzle/migrations/         # checked-in SQL migrations
e2e/                        # Playwright tests
```

## License

MIT — see [LICENSE](./LICENSE).
