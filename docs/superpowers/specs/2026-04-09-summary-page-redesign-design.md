# Summary Page Redesign

**Date:** 2026-04-09
**Scope:** `/intake/summary` page visual and structural redesign
**Status:** Design — pending user review

## Problem

The current `/intake/summary` page feels flat and data-dump-ish compared to the rest of the celestial-themed app:

- RIASEC interest profile uses cramped horizontal bars with long wrapping labels squeezed next to thin tracks
- Work Values and Environment are rendered as generic pill chips with raw counts in parentheses — no visual hierarchy or personality
- The page reveals results as a table, not a story — it doesn't make the user feel seen

The page is a key milestone in the assessment flow (it's the payoff between finishing questions and exploring careers) and should feel like a moment of reveal, not a results readout.

## Goals

- Make the summary feel like a polished, personal profile reveal
- Lead with "who you are" (top traits) before showing the full picture
- Match the celestial visual language of the rest of the app (purple/indigo gradients, serif headings, rounded surfaces, subtle glows)
- Use illustrated imagery in the same style as the would-you-rather option cards to carry visual weight in the values/environment sections
- Preserve all existing data (no schema changes)

## Non-Goals

- Changing the underlying assessment logic or `tallyResults.ts`
- Modifying `getDeckResults()` or the Zustand store
- Redesigning other pages or the navigation
- Adding new RIASEC codes, work value codes, or environment codes

## Design Overview

The page is restructured into four vertically-stacked sections, each with a clear purpose:

1. **Top 3 Trait Hero Cards** — headline moment, bold and personality-forward
2. **RIASEC Radar Chart** — full 6-dimension view, visually striking and data-rich
3. **Top 3 Work Values** — illustrated cards with AI-generated cartoon artwork
4. **Top 3 Environment Preferences** — same treatment as work values

The existing page header ("Your Profile" / subtitle) and action row (Retake / Explore Careers) stay, with light polish.

## Section 1 — Top 3 Trait Hero Cards

A 3-column grid of large, color-coded cards showing the user's top 3 RIASEC codes. Each card contains:

- Rank indicator (#1, #2, #3) in the top-right corner
- Large icon (emoji) in a rounded tinted badge
- RIASEC label (e.g., "Social")
- Short descriptor line derived by splitting the `CODE_LABELS` entry on ` – ` (en-dash) and taking the second half (e.g., "prefers helping, teaching and supporting others")
- Percentage score (normalized against the max RIASEC count, matching current logic)

Each RIASEC code gets a fixed accent color from a new `riasecTheme` map:

| Code | Label | Color | Icon |
|---|---|---|---|
| R | Realistic | `#ef4444` (red) | 🔧 |
| I | Investigative | `#818cf8` (indigo) | 🔬 |
| A | Artistic | `#a855f7` (purple) | 🎨 |
| S | Social | `#06b6d4` (cyan) | 🤝 |
| E | Enterprising | `#fbbf24` (amber) | 🚀 |
| C | Conventional | `#22c55e` (green) | 📋 |

Card styling: `rounded-2xl`, gradient tinted background (`from-[color]/15 to-[color]/5`), 1px tinted border, centered content.

On mobile (`<640px`), the grid collapses to a single column so cards remain legible.

## Section 2 — RIASEC Radar Chart

A hand-rolled inline SVG radar (spider) chart showing all 6 RIASEC dimensions. No chart library needed — we render the SVG directly since the shape is fixed and simple.

Visual spec:

- 3 concentric hexagonal grid rings (33%, 67%, 100%)
- 6 axis lines radiating from center
- Data polygon filled with a radial purple gradient (`rgba(124,58,237,0.5)` → `rgba(124,58,237,0.15)`), stroked in `#7c3aed`
- Each data vertex is a small circle in that axis's theme color
- Labels around the outside: bold/highlighted color for the user's top 3, dim for the bottom 3
- Wrapped in a `rounded-2xl` card matching the existing surface treatment

Math: each axis point is at `(normalizedValue × radius × cos(θ), normalizedValue × radius × sin(θ))`, where θ is spaced by 60° starting from the top. `normalizedValue = count / maxRiasec` (same as current bar logic).

Fixed axis order (clockwise from top): Social → Investigative → Conventional → Artistic → Realistic → Enterprising. This keeps the chart stable across users.

Section title: "Interest Profile" with subtitle "Your RIASEC personality map".

## Section 3 — Top 3 Work Values (Illustrated)

A 3-column grid of illustrated cards, sorted by count descending, taking the top 3 from `results.workvalue`. Each card has:

- Square image (aspect-ratio 1) at the top, using the new AI-generated PNG for that work-value code
- Padded text block below, splitting the `CODE_LABELS` entry on ` – ` (en-dash):
  - Short label (left side, e.g., "Achievement") in bold primary-soft color
  - Descriptor (right side, e.g., "tackling tough goals and seeing results") in muted-foreground

Card styling: `rounded-2xl`, `overflow-hidden`, subtle border, `bg-surface/60`. Consistent with the existing would-you-rather option cards but without interaction states.

Section title: "What You Value" with subtitle "Top 3 work values".

On mobile, collapse to a single column.

## Section 4 — Top 3 Environment Preferences (Illustrated)

Identical treatment to Section 3, using `results.env`:

- Section title: "Your Ideal Environment" / "Top 3 workplace preferences"
- Same card layout, same AI-generated illustration style, new images per environment code

## AI-Generated Illustrations

We extend `scripts/generateImages.ts` to generate one illustration per work-value code and environment code — 12 new PNGs total. Output directory: `public/profile/images/` (new folder — keeps summary assets separate from would-you-rather).

The existing script already applies the style wrapper (`Cartoon of {prompt}. --no photorealism, minimalistic, and vector art style.`), so we inherit the consistent cartoon/vector aesthetic automatically.

### New Prompt Map (Work Values)

Added to a new data file `src/app/_data/profileImages.ts`:

| Code | Filename | Prompt |
|---|---|---|
| ACH | `workvalue-achievement.png` | "A young adult standing triumphantly at the top of a hill, arms raised after completing a challenging goal" |
| IND | `workvalue-independence.png` | "A focused young person working autonomously at their own desk in a cozy personal workspace, calm and self-directed" |
| REC | `workvalue-recognition.png` | "A young person receiving applause and a trophy on a small stage, smiling proudly" |
| REL | `workvalue-relationships.png` | "Two friends warmly helping each other with a task, showing genuine connection and teamwork" |
| SUP | `workvalue-support.png` | "A patient mentor guiding a young student with encouragement, offering clear instruction" |
| WC  | `workvalue-working-conditions.png` | "A comfortable, well-equipped modern workspace with good lighting, ergonomic chair, and a plant on the desk" |

### New Prompt Map (Environment)

| Code | Filename | Prompt |
|---|---|---|
| INO | `env-indoor-office.png` | "A bright, climate-controlled indoor office with a modern desk, computer, and a window view" |
| OUT | `env-outdoor-field.png` | "A young adult working happily outdoors in nature, surrounded by trees and fresh air" |
| RT  | `env-routine-structured.png` | "A young person calmly checking items off a predictable daily checklist at a tidy desk" |
| VR  | `env-varied-changing.png` | "A young adventurer moving between different scenes — a city, a lab, and a field — showing variety and change" |
| TM  | `env-team-based.png` | "A collaborative team of young people working together around a table, engaged and smiling" |
| SO  | `env-solo-independent.png` | "A focused young person working alone with headphones in a quiet, minimalist space, calm and undisturbed" |

### Script Changes

Rather than duplicating logic, extract the throttled generator into a shared helper and add a second function `generateProfileImages()` that iterates the new prompt map and writes to `public/profile/images/`. The default `generateAllImages()` stays as-is; add a CLI flag or second entrypoint to run only the profile set:

```
npx tsx scripts/generateImages.ts --profile
```

This way we don't regenerate the 60 existing would-you-rather images every time. Exact CLI flag parsing can be a simple `process.argv.includes('--profile')` check.

## Data Flow

No changes to state, store, or routing. The page continues to read from `useAppStore().getDeckResults()`. All derived values (top 3, percentages, sorting) are computed inline in the component:

```
const riasec = results.riasec ?? {}
const topRiasec = Object.entries(riasec).sort((a,b) => b[1]-a[1]).slice(0, 3)
const maxRiasec = Math.max(...Object.values(riasec), 1)
const topWorkValues = Object.entries(results.workvalue ?? {}).sort((a,b) => b[1]-a[1]).slice(0, 3)
const topEnv = Object.entries(results.env ?? {}).sort((a,b) => b[1]-a[1]).slice(0, 3)
```

## Component Breakdown

The current `page.tsx` is ~170 lines of inline JSX. We extract the four sections into focused presentational components to keep the page thin:

- `TraitHeroCard.tsx` — single hero card; props: `{ code, rank, count, maxCount }`
- `RiasecRadarChart.tsx` — SVG radar; props: `{ riasec: Record<string, number> }`
- `IllustratedTraitCard.tsx` — shared card for values and env; props: `{ code, imageSrc, label, description }`

New shared data files:

- `src/app/_data/riasecTheme.ts` — color, icon, and short-label lookup per RIASEC code (used by hero cards and radar labels)
- `src/app/_data/profileImages.ts` — prompt map and filename lookup for work-value and environment codes (used by both the generation script and the summary page)

Location for presentational components: `src/app/intake/summary/_components/`.

The page itself becomes orchestration only — read results, compute derived values, render the four sections.

## Empty State

The existing "No Results Yet" empty state stays as-is — it already works and matches the celestial treatment.

## Accessibility

- Hero cards use `role="img"` semantics where appropriate and include text percentages (not just color)
- The radar chart is decorative visualization; screen readers fall back to the hero cards + any future visible numeric listing. We add a visually-hidden `<ul>` with all 6 RIASEC values and percentages beneath the SVG for SR users.
- All images have descriptive alt text derived from their `CODE_LABELS` entry
- Motion-sensitive users: the existing `prefers-reduced-motion` rule in `globals.css` will short-circuit any bar/chart animations; we add no custom transitions beyond the existing pattern

## Testing

- Manual smoke check: complete the assessment and verify all four sections render with sensible data
- Manual check: mobile viewport (<640px) collapses grids correctly
- Existing empty-state redirect logic still fires when `answers` is empty
- Visual check: all 12 new PNGs exist in `public/profile/images/` and load without 404
- Verify radar chart renders correctly for edge cases: only 1 RIASEC code non-zero, all 6 equal, etc.

## Files Touched

**New:**
- `src/app/intake/summary/_components/TraitHeroCard.tsx`
- `src/app/intake/summary/_components/RiasecRadarChart.tsx`
- `src/app/intake/summary/_components/IllustratedTraitCard.tsx`
- `src/app/_data/riasecTheme.ts`
- `src/app/_data/profileImages.ts`
- `public/profile/images/*.png` (12 files, generated)

**Modified:**
- `src/app/intake/summary/page.tsx` — slimmed to orchestration
- `scripts/generateImages.ts` — extract throttled helper, add `generateProfileImages()` and `--profile` CLI flag

**Unchanged:**
- `src/store/*`
- `src/app/_data/codeLabels.ts`
- `src/app/_data/questions.ts`
- All other pages and components
