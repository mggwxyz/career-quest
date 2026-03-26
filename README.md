# 🎯 Career Quest

**Career Quest** is an interactive career exploration tool designed to help students discover potential career paths through fun, game-style questions.

## How It Works

### 1. 🎮 Take the Quiz
Students answer a series of engaging "Would You Rather" style questions — no boring surveys here. Each choice is designed to feel like a game while quietly mapping to real psychological frameworks.

### 2. 🧠 RIASEC Personality Matching
Behind the scenes, answers are scored against the **RIASEC model** (Holland's career interest codes):

- **R**ealistic — hands-on, practical
- **I**nvestigative — analytical, curious
- **A**rtistic — creative, expressive
- **S**ocial — helping, teaching
- **E**nterprising — leading, persuading
- **C**onventional — organizing, detail-oriented

Your unique combination of traits generates a personalized career profile.

### 3. 💼 Career Recommendations
Based on your RIASEC profile, Career Quest recommends real-world careers that match your interests, values, and work style preferences.

### 4. 💬 Chat About Careers
Found a career that catches your eye? Jump into an AI-powered chat to learn more about it — what the day-to-day looks like, education requirements, salary ranges, growth potential, and anything else you're curious about.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Supabase
- **AI:** Vercel AI SDK with OpenAI
- **Styling:** Tailwind CSS + DaisyUI
- **State:** Zustand with persistence

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to start exploring.

## Environment Variables

This project uses `dotenv-flow` for environment management. You'll need:

- Supabase credentials (auth + database)
- OpenAI API key (for career chat)
- PostgreSQL connection string

## Deploy

The easiest way to deploy is on [Vercel](https://vercel.com). See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
