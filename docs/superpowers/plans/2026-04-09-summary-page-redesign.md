# Summary Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `/discover/profile` with top 3 trait hero cards, a RIASEC radar chart, and illustrated work value + environment cards backed by AI-generated cartoon artwork.

**Architecture:** The current page becomes thin orchestration. Four presentational components live in `src/app/discover/profile/_components/`. Two shared data files provide the RIASEC theme lookup and the work-value/environment image prompt map. The existing `scripts/generateImages.ts` is extended with a `--profile` CLI flag that generates 12 new PNGs into `public/profile/images/`.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS v4, Zustand (read-only), inline SVG (no chart library), Vercel AI SDK + OpenAI `gpt-image-1` (existing).

---

## Reference — Full Spec

The validated design spec lives at `docs/superpowers/specs/2026-04-09-summary-page-redesign-design.md`. Read it before starting.

## Context an Engineer Needs

- **Deck IDs**: `getDeckResults()` returns `{ riasec: {R: n, I: n...}, workvalue: {ACH: n, IND: n...}, env: {INO: n, OUT: n...} }`. The keys `riasec`, `workvalue`, and `env` come from `src/app/_data/questions.ts` (lines 4, 181, 358).
- **Existing labels** are in `src/app/_data/codeLabels.ts`. Entries use the en-dash character ` – ` (U+2013 surrounded by spaces) to separate the short label from the descriptor — e.g., `"Achievement – tackling tough goals and seeing results"`. Splitting on ` – ` gives `["Achievement", "tackling tough goals and seeing results"]`.
- **Celestial theme tokens** are defined in `src/app/globals.css`: `--primary` (`#7c3aed`), `--primary-soft` (`#c4b5fd`), `--surface`, `--border`, `--muted-foreground`, etc. Use the Tailwind aliases (`text-primary-soft`, `bg-surface/60`, `border-border`) rather than hex values in JSX.
- **Store shape**: `useAppStore().getDeckResults()` is the only store access the page needs. The existing empty-state redirect (when `answers` is empty) must be preserved.
- **Image generation script**: `scripts/generateImages.ts` uses `@ai-sdk/openai` with `experimental_generateImage`, wraps every prompt with `"Cartoon of {prompt}. --no photorealism, minimalistic, and vector art style."`, and rate-limits to 4 requests/min via `p-throttle`. Run with `npx tsx scripts/generateImages.ts`.

## File Structure

**New files:**
- `src/app/_data/riasecTheme.ts` — lookup table: code → { label, icon, colorHex, tailwindAccent, description }
- `src/app/_data/profileImages.ts` — lookup table: code → { filename, prompt, shortLabel, description } for all 12 work-value + environment codes
- `src/app/discover/profile/_components/TraitHeroCard.tsx`
- `src/app/discover/profile/_components/RiasecRadarChart.tsx`
- `src/app/discover/profile/_components/IllustratedTraitCard.tsx`
- `public/profile/images/*.png` — 12 generated files

**Modified:**
- `src/app/discover/profile/page.tsx` — slimmed to orchestration
- `scripts/generateImages.ts` — extract shared throttled helper; add `generateProfileImages()` + `--profile` flag

---

## Task 1: Create the RIASEC theme data file

**Files:**
- Create: `src/app/_data/riasecTheme.ts`

- [ ] **Step 1: Write the data file**

```typescript
// src/app/_data/riasecTheme.ts
// Fixed theme per RIASEC code — used by hero cards and the radar chart.

export interface RiasecThemeEntry {
  label: string
  /** Short descriptor — the portion of CODE_LABELS after the en-dash. */
  description: string
  /** Emoji shown inside the hero card badge. */
  icon: string
  /** Hex color used directly inside the inline SVG radar chart. */
  colorHex: string
  /** Tailwind color family used for gradients, borders, and text. */
  tailwindColor: string
}

export const RIASEC_THEME: Record<string, RiasecThemeEntry> = {
  R: {
    label: 'Realistic',
    description: 'enjoys hands-on, practical activities',
    icon: '🔧',
    colorHex: '#ef4444',
    tailwindColor: 'red',
  },
  I: {
    label: 'Investigative',
    description: 'likes to explore, research and analyze',
    icon: '🔬',
    colorHex: '#818cf8',
    tailwindColor: 'indigo',
  },
  A: {
    label: 'Artistic',
    description: 'values creativity, design and self-expression',
    icon: '🎨',
    colorHex: '#a855f7',
    tailwindColor: 'purple',
  },
  S: {
    label: 'Social',
    description: 'prefers helping, teaching and supporting others',
    icon: '🤝',
    colorHex: '#06b6d4',
    tailwindColor: 'cyan',
  },
  E: {
    label: 'Enterprising',
    description: 'motivated by leading, persuading and selling',
    icon: '🚀',
    colorHex: '#fbbf24',
    tailwindColor: 'amber',
  },
  C: {
    label: 'Conventional',
    description: 'enjoys structure, order and data management',
    icon: '📋',
    colorHex: '#22c55e',
    tailwindColor: 'green',
  },
}

/**
 * Fixed clockwise axis order for the radar chart (starting from the top).
 * Keeping this stable across users ensures chart shape is comparable.
 */
export const RIASEC_AXIS_ORDER: readonly string[] = ['S', 'I', 'C', 'A', 'R', 'E']

export const getRiasecTheme = (code: string): RiasecThemeEntry | undefined =>
  RIASEC_THEME[code]
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm lint`
Expected: no new errors in `src/app/_data/riasecTheme.ts`

- [ ] **Step 3: Commit**

```bash
git add src/app/_data/riasecTheme.ts
git commit -m "feat(summary): add RIASEC theme lookup for hero cards and radar"
```

---

## Task 2: Create the profile images data file

**Files:**
- Create: `src/app/_data/profileImages.ts`

- [ ] **Step 1: Write the data file**

```typescript
// src/app/_data/profileImages.ts
// Prompt + filename map for AI-generated work-value and environment illustrations.
// Used by both the generation script and the summary page.

export interface ProfileImageEntry {
  /** Short label (left side of the en-dash in CODE_LABELS). */
  shortLabel: string
  /** Descriptor (right side of the en-dash in CODE_LABELS). */
  description: string
  /** Filename inside public/profile/images/ (no leading slash). */
  filename: string
  /** Prompt fed to OpenAI (the generateImages.ts style wrapper is applied automatically). */
  prompt: string
}

export const WORK_VALUE_IMAGES: Record<string, ProfileImageEntry> = {
  ACH: {
    shortLabel: 'Achievement',
    description: 'tackling tough goals and seeing results',
    filename: 'workvalue-achievement.png',
    prompt: 'A young adult standing triumphantly at the top of a hill, arms raised after completing a challenging goal',
  },
  IND: {
    shortLabel: 'Independence',
    description: 'autonomy in scheduling and decisions',
    filename: 'workvalue-independence.png',
    prompt: 'A focused young person working autonomously at their own desk in a cozy personal workspace, calm and self-directed',
  },
  REC: {
    shortLabel: 'Recognition',
    description: 'public praise and status for good work',
    filename: 'workvalue-recognition.png',
    prompt: 'A young person receiving applause and a trophy on a small stage, smiling proudly',
  },
  REL: {
    shortLabel: 'Relationships',
    description: 'cooperation and helping people directly',
    filename: 'workvalue-relationships.png',
    prompt: 'Two friends warmly helping each other with a task, showing genuine connection and teamwork',
  },
  SUP: {
    shortLabel: 'Support',
    description: 'clear guidance, security and good supervision',
    filename: 'workvalue-support.png',
    prompt: 'A patient mentor guiding a young student with encouragement, offering clear instruction',
  },
  WC: {
    shortLabel: 'Working Conditions',
    description: 'comfort, equipment and environment',
    filename: 'workvalue-working-conditions.png',
    prompt: 'A comfortable, well-equipped modern workspace with good lighting, ergonomic chair, and a plant on the desk',
  },
}

export const ENV_IMAGES: Record<string, ProfileImageEntry> = {
  INO: {
    shortLabel: 'Indoor Office',
    description: 'climate-controlled desk/tech setting',
    filename: 'env-indoor-office.png',
    prompt: 'A bright, climate-controlled indoor office with a modern desk, computer, and a window view',
  },
  OUT: {
    shortLabel: 'Outdoor/Field',
    description: 'work that keeps you outside or in nature',
    filename: 'env-outdoor-field.png',
    prompt: 'A young adult working happily outdoors in nature, surrounded by trees and fresh air',
  },
  RT: {
    shortLabel: 'Routine/Structured',
    description: 'stable tasks and predictable days',
    filename: 'env-routine-structured.png',
    prompt: 'A young person calmly checking items off a predictable daily checklist at a tidy desk',
  },
  VR: {
    shortLabel: 'Varied/Changing',
    description: 'frequent change, travel or new problems',
    filename: 'env-varied-changing.png',
    prompt: 'A young adventurer moving between different scenes — a city, a lab, and a field — showing variety and change',
  },
  TM: {
    shortLabel: 'Team-Based',
    description: 'constant collaboration with others',
    filename: 'env-team-based.png',
    prompt: 'A collaborative team of young people working together around a table, engaged and smiling',
  },
  SO: {
    shortLabel: 'Solo/Independent',
    description: 'quiet focus with minimal interruption',
    filename: 'env-solo-independent.png',
    prompt: 'A focused young person working alone with headphones in a quiet, minimalist space, calm and undisturbed',
  },
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/_data/profileImages.ts
git commit -m "feat(summary): add profile image prompt map for work values and environment"
```

---

## Task 3: Extend the image generation script with a `--profile` flag

**Files:**
- Modify: `scripts/generateImages.ts`

Goal: Extract the throttled generator into a reusable helper that accepts an output directory, then add a `generateProfileImages()` function that iterates `WORK_VALUE_IMAGES` and `ENV_IMAGES` and writes to `public/profile/images/`. The script's entrypoint picks which generator to run based on `process.argv.includes('--profile')`.

- [ ] **Step 1: Rewrite the script**

Replace the entire contents of `scripts/generateImages.ts` with:

```typescript
import { experimental_generateImage as generateImage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { questions } from '../src/app/_data/questions'
import { WORK_VALUE_IMAGES, ENV_IMAGES } from '../src/app/_data/profileImages'
import fs from 'fs/promises'
import path from 'path'
import pThrottle from 'p-throttle'

import dotenvFlow from 'dotenv-flow'
dotenvFlow.config()

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

// Rate limit: 4 requests per minute.
const throttle = pThrottle({
  limit: 4,
  interval: 60 * 1000,
})

/**
 * Throttled generator — produces a single image using the shared cartoon/vector
 * style wrapper and writes it to the given directory.
 */
const throttledGenerateAndSaveImage = throttle(
  async (prompt: string, filename: string, outputDir: string) => {
    const imagePrompt = `Cartoon of ${prompt}. --no photorealism, minimalistic, and vector art style.`
    try {
      const { image } = await generateImage({
        model: openai.image('gpt-image-1'),
        prompt: imagePrompt,
        size: '1024x1024',
      })

      await fs.mkdir(outputDir, { recursive: true })
      const imagePath = path.join(outputDir, filename)
      await fs.writeFile(imagePath, image.uint8Array)
      console.log(`Generated image: ${path.relative(process.cwd(), imagePath)}`)
    }
    catch (error) {
      console.error(`Error generating image for ${filename}:`, error)
    }
  },
)

async function generateWouldYouRatherImages() {
  const outputDir = path.join(process.cwd(), 'public/would-you-rather/images')
  const tasks = questions.decks.flatMap(deck =>
    deck.questions.flatMap(question => [
      throttledGenerateAndSaveImage(question.option1.prompt, `${question.option1.id}.png`, outputDir),
      throttledGenerateAndSaveImage(question.option2.prompt, `${question.option2.id}.png`, outputDir),
    ]),
  )
  await Promise.all(tasks)
}

async function generateProfileImages() {
  const outputDir = path.join(process.cwd(), 'public/profile/images')
  const entries = [
    ...Object.values(WORK_VALUE_IMAGES),
    ...Object.values(ENV_IMAGES),
  ]
  const tasks = entries.map(entry =>
    throttledGenerateAndSaveImage(entry.prompt, entry.filename, outputDir),
  )
  await Promise.all(tasks)
}

async function main() {
  const profileOnly = process.argv.includes('--profile')
  if (profileOnly) {
    console.log('Generating profile images (work values + environments)...')
    await generateProfileImages()
  }
  else {
    console.log('Generating would-you-rather images...')
    await generateWouldYouRatherImages()
  }
}

main().catch(console.error)
```

- [ ] **Step 2: Verify the script type-checks**

Run: `pnpm lint`
Expected: no errors in `scripts/generateImages.ts`.

- [ ] **Step 3: Dry-run the script with `--profile` to generate the 12 new images**

Run: `npx tsx scripts/generateImages.ts --profile`
Expected: console lines like `Generated image: public/profile/images/workvalue-achievement.png` for all 12 files. Takes ~3 minutes due to 4-req/min throttle.

Note: requires `OPENAI_API_KEY` in `.env` or `.env.local`. Confirm the key is available before running.

- [ ] **Step 4: Verify all 12 files exist**

Run: `ls public/profile/images/`
Expected: exactly 12 PNG files matching the filenames in `profileImages.ts`.

- [ ] **Step 5: Commit**

```bash
git add scripts/generateImages.ts public/profile/images/
git commit -m "feat(summary): generate illustrated work value and environment artwork"
```

---

## Task 4: Build the `TraitHeroCard` component

**Files:**
- Create: `src/app/discover/profile/_components/TraitHeroCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/app/discover/profile/_components/TraitHeroCard.tsx
import { getRiasecTheme } from '@/app/_data/riasecTheme'

interface TraitHeroCardProps {
  code: string
  rank: 1 | 2 | 3
  count: number
  maxCount: number
}

/**
 * Headline card showing one of the user's top 3 RIASEC traits.
 * Renders nothing for unknown codes (should never happen with valid data).
 */
export function TraitHeroCard({ code, rank, count, maxCount }: TraitHeroCardProps) {
  const theme = getRiasecTheme(code)
  if (!theme) return null

  const pct = Math.round((count / Math.max(maxCount, 1)) * 100)

  return (
    <div
      role="img"
      aria-label={`Rank ${rank}: ${theme.label} — ${theme.description} (${pct}%)`}
      className="relative p-5 rounded-2xl border text-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.colorHex}26, ${theme.colorHex}0d)`,
        borderColor: `${theme.colorHex}59`,
      }}
    >
      <span
        className="absolute top-3 right-4 text-[10px] font-bold"
        style={{ color: theme.colorHex }}
      >
        #
        {rank}
      </span>
      <div
        className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: `${theme.colorHex}33` }}
      >
        {theme.icon}
      </div>
      <div
        className="text-sm font-bold mb-0.5"
        style={{ color: theme.colorHex }}
      >
        {theme.label}
      </div>
      <div className="text-[11px] text-muted-foreground leading-snug min-h-[2.2em]">
        {theme.description}
      </div>
      <div
        className="mt-3 text-xl font-bold"
        style={{ color: theme.colorHex }}
      >
        {pct}
        %
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/app/discover/profile/_components/TraitHeroCard.tsx
git commit -m "feat(summary): add TraitHeroCard component"
```

---

## Task 5: Build the `RiasecRadarChart` component

**Files:**
- Create: `src/app/discover/profile/_components/RiasecRadarChart.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/app/discover/profile/_components/RiasecRadarChart.tsx
import { RIASEC_AXIS_ORDER, RIASEC_THEME } from '@/app/_data/riasecTheme'

interface RiasecRadarChartProps {
  riasec: Record<string, number>
}

const CHART_SIZE = 320
const CENTER = CHART_SIZE / 2
const RADIUS = 110
const LABEL_RADIUS = RADIUS + 22

/**
 * Inline SVG radar chart for the full 6-dimension RIASEC profile.
 * Axis order is fixed (see RIASEC_AXIS_ORDER) so the chart shape is comparable.
 */
export function RiasecRadarChart({ riasec }: RiasecRadarChartProps) {
  const values = Object.values(riasec)
  const maxValue = Math.max(...values, 1)

  // Determine which 3 codes are "top" so we can highlight their labels.
  const topCodes = new Set(
    Object.entries(riasec)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code]) => code),
  )

  // Angle per axis (starting from -90° so the first axis is straight up).
  const angleFor = (index: number) =>
    (Math.PI * 2 * index) / RIASEC_AXIS_ORDER.length - Math.PI / 2

  // Generate concentric hex grid rings at 33%, 67%, and 100% of the radius.
  const gridRings = [0.33, 0.67, 1].map((scale) => {
    const points = RIASEC_AXIS_ORDER.map((_, i) => {
      const angle = angleFor(i)
      return `${Math.cos(angle) * RADIUS * scale},${Math.sin(angle) * RADIUS * scale}`
    }).join(' ')
    return points
  })

  // Data polygon points.
  const dataPoints = RIASEC_AXIS_ORDER.map((code, i) => {
    const value = (riasec[code] ?? 0) / maxValue
    const angle = angleFor(i)
    return {
      code,
      x: Math.cos(angle) * RADIUS * value,
      y: Math.sin(angle) * RADIUS * value,
    }
  })

  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="p-6 rounded-2xl border border-border bg-surface/60">
      <h2 className="font-serif text-lg text-foreground text-center mb-1">Interest Profile</h2>
      <p className="text-xs text-muted-foreground text-center mb-4">Your RIASEC personality map</p>

      <svg
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        className="w-full max-w-[340px] mx-auto block"
        role="img"
        aria-label="RIASEC radar chart"
      >
        <defs>
          <radialGradient id="riasec-radar-fill">
            <stop offset="0%" stopColor="rgba(124,58,237,0.5)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0.15)" />
          </radialGradient>
        </defs>
        <g transform={`translate(${CENTER},${CENTER})`}>
          {/* Grid rings */}
          {gridRings.map((points, i) => (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="rgba(139,92,246,0.15)"
              strokeWidth={1}
            />
          ))}
          {/* Axis lines */}
          {RIASEC_AXIS_ORDER.map((_, i) => {
            const angle = angleFor(i)
            return (
              <line
                key={i}
                x1={0}
                y1={0}
                x2={Math.cos(angle) * RADIUS}
                y2={Math.sin(angle) * RADIUS}
                stroke="rgba(139,92,246,0.12)"
                strokeWidth={1}
              />
            )
          })}
          {/* Data polygon */}
          <polygon
            points={dataPolygon}
            fill="url(#riasec-radar-fill)"
            stroke="#7c3aed"
            strokeWidth={2}
          />
          {/* Data vertices */}
          {dataPoints.map((p) => {
            const theme = RIASEC_THEME[p.code]
            return (
              <circle
                key={p.code}
                cx={p.x}
                cy={p.y}
                r={topCodes.has(p.code) ? 5 : 4}
                fill={theme?.colorHex ?? '#7c3aed'}
                stroke="#0a0a1a"
                strokeWidth={2}
              />
            )
          })}
          {/* Axis labels */}
          {RIASEC_AXIS_ORDER.map((code, i) => {
            const theme = RIASEC_THEME[code]
            const angle = angleFor(i)
            const x = Math.cos(angle) * LABEL_RADIUS
            const y = Math.sin(angle) * LABEL_RADIUS
            const anchor = Math.abs(x) < 1 ? 'middle' : x > 0 ? 'start' : 'end'
            const highlighted = topCodes.has(code)
            return (
              <text
                key={code}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={highlighted ? 700 : 500}
                fill={highlighted ? theme?.colorHex ?? '#c4b5fd' : '#9f99be'}
              >
                {theme?.label ?? code}
              </text>
            )
          })}
        </g>
      </svg>

      {/* Screen-reader-only numeric listing */}
      <ul className="sr-only">
        {RIASEC_AXIS_ORDER.map((code) => {
          const theme = RIASEC_THEME[code]
          const pct = Math.round(((riasec[code] ?? 0) / maxValue) * 100)
          return (
            <li key={code}>
              {theme?.label ?? code}
              {': '}
              {pct}
              %
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/discover/profile/_components/RiasecRadarChart.tsx
git commit -m "feat(summary): add RIASEC radar chart component"
```

---

## Task 6: Build the `IllustratedTraitCard` component

**Files:**
- Create: `src/app/discover/profile/_components/IllustratedTraitCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/app/discover/profile/_components/IllustratedTraitCard.tsx
import Image from 'next/image'
import type { ProfileImageEntry } from '@/app/_data/profileImages'

interface IllustratedTraitCardProps {
  entry: ProfileImageEntry
  rank: 1 | 2 | 3
}

/**
 * Shared card for both Work Values and Environment sections.
 * Shows a square illustrated image on top and a short label + descriptor below.
 */
export function IllustratedTraitCard({ entry, rank }: IllustratedTraitCardProps) {
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-surface/60">
      <div className="relative aspect-square">
        <Image
          src={`/profile/images/${entry.filename}`}
          alt={`${entry.shortLabel} — ${entry.description}`}
          fill
          sizes="(max-width: 640px) 100vw, 300px"
          className="object-cover"
        />
        <span className="absolute top-2 right-3 text-[10px] font-bold text-primary-soft bg-background/70 rounded-full px-2 py-0.5 backdrop-blur-sm">
          #
          {rank}
        </span>
      </div>
      <div className="p-4">
        <div className="text-sm font-bold text-primary-soft mb-0.5">
          {entry.shortLabel}
        </div>
        <div className="text-xs text-muted-foreground leading-snug">
          {entry.description}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/discover/profile/_components/IllustratedTraitCard.tsx
git commit -m "feat(summary): add IllustratedTraitCard component"
```

---

## Task 7: Rewrite the summary page to use the new components

**Files:**
- Modify: `src/app/discover/profile/page.tsx`

Goal: Replace the existing bar chart and pill sections with the four new sections (trait hero cards, radar chart, illustrated work values, illustrated environment). Preserve the existing empty-state redirect, the page header, and the action row at the bottom.

- [ ] **Step 1: Replace the file contents**

```tsx
'use client'

import { useAppStore } from '@/store/appStore'
import { useShallow } from 'zustand/react/shallow'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { TraitHeroCard } from './_components/TraitHeroCard'
import { RiasecRadarChart } from './_components/RiasecRadarChart'
import { IllustratedTraitCard } from './_components/IllustratedTraitCard'
import { WORK_VALUE_IMAGES, ENV_IMAGES, type ProfileImageEntry } from '@/app/_data/profileImages'

type Rank = 1 | 2 | 3

function topThree(counts: Record<string, number> | undefined): [string, number][] {
  if (!counts) return []
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
}

function pickImageEntries(
  top: [string, number][],
  source: Record<string, ProfileImageEntry>,
): { entry: ProfileImageEntry, rank: Rank }[] {
  return top
    .map(([code], i) => {
      const entry = source[code]
      if (!entry) return null
      return { entry, rank: (i + 1) as Rank }
    })
    .filter((v): v is { entry: ProfileImageEntry, rank: Rank } => v !== null)
}

export default function IntakeSummary() {
  const { getDeckResults, answers } = useAppStore(
    useShallow(s => ({
      getDeckResults: s.getDeckResults,
      answers: s.answers,
    })),
  )
  const router = useRouter()
  const results = getDeckResults()

  useEffect(() => {
    if (Object.keys(answers).length === 0) {
      toast.error('No assessment data found. Please complete the assessment first.')
      router.push('/discover/preferences')
    }
  }, [answers, router])

  const riasec = results.riasec ?? {}
  const hasResults = Object.keys(riasec).length > 0
  const maxRiasec = Math.max(...Object.values(riasec), 1)
  const topRiasec = topThree(riasec)
  const topWorkValues = pickImageEntries(topThree(results.workvalue), WORK_VALUE_IMAGES)
  const topEnv = pickImageEntries(topThree(results.env), ENV_IMAGES)

  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      <div className="text-center mb-10 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Your Profile</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what your answers reveal about your career personality
        </p>
      </div>

      {!hasResults
        ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="font-serif text-2xl text-foreground mb-3">No Results Yet</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Complete the assessment to discover your career interests and get personalized recommendations.
            </p>
            <Link
              href="/discover/preferences"
              className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline"
            >
              Start the Assessment
            </Link>
          </div>
        )
        : (
          <>
            {/* Section 1 — Top 3 Trait Hero Cards */}
            <section className="mb-10">
              <div className="text-[10px] text-muted-foreground uppercase tracking-[2px] text-center mb-4">
                Your Top Traits
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topRiasec.map(([code, count], i) => (
                  <TraitHeroCard
                    key={code}
                    code={code}
                    rank={(i + 1) as Rank}
                    count={count}
                    maxCount={maxRiasec}
                  />
                ))}
              </div>
            </section>

            {/* Section 2 — RIASEC Radar Chart */}
            <section className="mb-10">
              <RiasecRadarChart riasec={riasec} />
            </section>

            {/* Section 3 — Top 3 Work Values */}
            {topWorkValues.length > 0 && (
              <section className="mb-10">
                <h2 className="font-serif text-lg text-foreground mb-1">What You Value</h2>
                <p className="text-xs text-muted-foreground mb-4">Top 3 work values</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {topWorkValues.map(({ entry, rank }) => (
                    <IllustratedTraitCard key={entry.filename} entry={entry} rank={rank} />
                  ))}
                </div>
              </section>
            )}

            {/* Section 4 — Top 3 Environment Preferences */}
            {topEnv.length > 0 && (
              <section className="mb-10">
                <h2 className="font-serif text-lg text-foreground mb-1">Your Ideal Environment</h2>
                <p className="text-xs text-muted-foreground mb-4">Top 3 workplace preferences</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {topEnv.map(({ entry, rank }) => (
                    <IllustratedTraitCard key={entry.filename} entry={entry} rank={rank} />
                  ))}
                </div>
              </section>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Link
                href="/discover/preferences"
                className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm"
              >
                Retake Assessment
              </Link>
              <Link
                href="/careers"
                className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] no-underline"
              >
                Explore Careers →
              </Link>
            </div>
          </>
        )}
    </div>
  )
}
```

- [ ] **Step 2: Verify lint passes**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Verify the build succeeds**

Run: `pnpm build`
Expected: build completes without errors. The `/discover/profile` route should be listed in the output.

- [ ] **Step 4: Commit**

```bash
git add src/app/discover/profile/page.tsx
git commit -m "feat(summary): wire up redesigned sections into summary page"
```

---

## Task 8: Manual smoke tests

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: Next.js dev server starts, ready on `http://localhost:3000`.

- [ ] **Step 2: Complete the assessment and land on the summary page**

Navigate to `http://localhost:3000/discover/preferences`, answer through to the end, then click through to `/discover/profile`.

**Verify:**
- Top 3 trait hero cards appear with correct color/icon per code
- Radar chart renders with all 6 axes labeled and a purple gradient fill
- Work Values section shows 3 illustrated cards with real images (no 404s in console)
- Environment section shows 3 illustrated cards with real images
- Both action buttons at the bottom still work

- [ ] **Step 3: Check mobile layout**

Resize browser to ~375px width (or use device emulation).

**Verify:**
- Hero cards collapse to a single column
- Work value + environment grids also collapse to a single column
- Radar chart stays centered and fits inside the viewport
- No horizontal scrolling

- [ ] **Step 4: Check empty state**

Open DevTools → Application → Local Storage → clear the `app-store` entry. Refresh `/discover/profile`.

**Verify:**
- Toast error appears
- Redirect to `/discover/preferences` fires
- If the summary briefly renders before redirect, the "No Results Yet" empty state shows cleanly

- [ ] **Step 5: Check edge cases in the radar chart**

In the browser DevTools Console:
```js
// Manually override the store to test edge cases
const store = JSON.parse(localStorage.getItem('app-store'))
// ... then manually refresh and observe
```

Or simply answer the assessment in different ways:
- Answer only questions that give a single RIASEC code (e.g., all Social) → verify chart still renders (one point at full radius, others at zero)
- Answer with roughly even distribution → verify the chart shape is a regular hexagon-ish shape

Expected: no rendering crashes, no NaN coordinates, no missing labels.

- [ ] **Step 6: Screenshot the result and confirm the visual polish matches the spec**

Compare against the mockup in `.superpowers/brainstorm/2928-1775789344/content/combined-layout.html` — note that the placeholder emoji tiles in the mockup are now real AI-generated images.

---

## Task 9: Final cleanup and verification

- [ ] **Step 1: Run lint across the whole project**

Run: `pnpm lint`
Expected: no new errors beyond any pre-existing ones on unrelated files.

- [ ] **Step 2: Run the production build one more time**

Run: `pnpm build`
Expected: clean build, no warnings about missing images or bad types.

- [ ] **Step 3: Review `git status` and ensure nothing stray is uncommitted**

Run: `git status`
Expected: clean working tree (all changes committed in the previous tasks).

- [ ] **Step 4 (optional): Push the branch and open a PR**

Only if the user requests it.

---

## Notes for the Implementing Engineer

- **Do not** regenerate the 60 existing would-you-rather images. Always pass `--profile` when running the script during this work.
- **Do not** modify `src/app/_data/codeLabels.ts`, `src/app/_data/questions.ts`, or anything in `src/store/`. The redesign is purely presentational.
- If `pnpm build` surfaces an `Image` component error about missing `remotePatterns`, the images are served locally from `/public` so no config changes should be needed. If there is still an issue, use a plain `<img>` tag with `className="w-full h-full object-cover"` instead of `next/image`.
- The `primary-soft` and `muted-foreground` Tailwind classes depend on the tokens in `src/app/globals.css`. They should already resolve correctly — no need to touch the CSS.
- Commit after each task. If a task fails midway, fix the issue and re-run the failing step; do not skip or merge tasks.
