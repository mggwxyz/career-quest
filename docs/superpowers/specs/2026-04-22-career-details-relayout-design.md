# Career Details Page Relayout — Design

**Date:** 2026-04-22
**Scope:** `src/app/careers/[slug]/page.tsx` and its `_components/`.

## Goal

Give the career details page a prominent top header that surfaces the career's
highlights (title, short description, Holland codes, outlook, salary,
education, and the personalized "Why it fits you" explanation) so the most
scannable information is visible above the fold. Keep the existing details
panel and role-play chat, but move the chat to the primary reading position
(left, 2/3 width) and reduce the details panel to supporting information.

## Current layout

`src/app/careers/[slug]/page.tsx` renders a 1:2 grid inside `containerClassName`:

- **Left (1/3)** — `CareerDetailsPanel` with: title + meta row (Job Zone,
  Bright Outlook badge, Holland codes), About (description), Why it fits you,
  What they do (tasks), Skills, Knowledge areas, Education, Technology used,
  Salary & outlook, Related careers, View on O*NET link.
- **Right (2/3)** — `CareerRolePlayChat`.

## New layout

```
┌──────────────────────────────────────────────────┐
│ HERO HEADER (full width)                         │
│  Title (serif)                                   │
│  Short description (lede paragraph)              │
│  [Holland] [Outlook] [Salary] [Education]  pills │
│  ┌──────────────────────────────────────────┐    │
│  │ ◎ Why it fits you — callout (if present) │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
┌───────────────────────────────┬──────────────────┐
│ Chat (2/3)                    │ Additional info  │
│                               │ panel (1/3)      │
└───────────────────────────────┴──────────────────┘
```

### Hero header

A new component `CareerDetailsHeader.tsx` in
`src/app/careers/[slug]/_components/`. Accepts:

```ts
interface Props {
  occupation: OccupationRow
  detail: CareerDetail | null
  whyItMatches: string | null
}
```

Contents (in order):

1. **Title** — `occupation.title`, rendered in the same serif style used today
   (`font-serif text-xl text-foreground`, upgraded to a larger size, e.g.
   `text-2xl lg:text-3xl`, to read as a hero title).
2. **Short description** — `occupation.description` as a single paragraph in
   `text-muted-foreground`. Omitted if `description` is null.
3. **Stats row** — horizontal, wrapping pill chips in the same style the panel
   meta uses today (`text-xs text-muted-foreground flex flex-wrap gap-2`):
   - **Holland codes** — `occupation.riasecAll.join(' · ')`.
   - **Outlook** — `occupation.brightOutlook` renders the existing green
     "Bright Outlook" pill (`px-2 py-0.5 rounded-full bg-green-400 text-black
     font-medium`). `detail.outlookDescription`, when present, renders as a
     neutral pill next to it (e.g. "Faster than average growth"). If neither
     is available, the outlook slot is omitted.
   - **Salary** — median using existing `formatSalary(detail)` logic
     (annual `$X` else hourly `$X/hr` else `varies`). Labeled "Median $X".
   - **Education** — `Job Zone {n} · {JOB_ZONE_NAMES[n]}`.
4. **Why it fits you callout** — only when `whyItMatches` is non-null. Full
   width within the hero. `Target` icon (same as today) + heading "Why it fits
   you" + the text. Uses a subtly accented background (e.g.
   `bg-primary-soft/10 border-primary-soft/30`) so it reads as personal.

Padding: `py-6` (tight — the chat needs room below on typical laptop viewports).

### Details panel (reduced)

Edit `CareerDetailsPanel.tsx` in place. Remove the following blocks because
they now live in the header:

- Title + meta row
- About (short description)
- Why it fits you
- Salary & outlook

Keep the existing visual style (`p-6 bg-surface/50 border border-border
rounded-2xl`). New contents, in order:

- What they do (tasks, top 5)
- Skills (top 10, joined with ` · `)
- Knowledge areas (top 5, joined with ` · `)
- Education (the long `JOB_ZONE_DESCRIPTIONS[jobZone]` paragraph — the header
  only shows the job zone name, so the paragraph stays here)
- Technology used (top 8, joined with ` · `)
- Related careers (pill links, top 6)
- Fallback "More details are refreshing" block when `detail` is null
- "View on O*NET" button

Props stay the same shape as today. The `whyItMatches` prop is no longer used
by the panel — remove it from the component's props and from the call site in
`page.tsx` so the panel only takes what it needs.

### Chat

`CareerRolePlayChat` is unchanged in behavior and props.

### Grid layout

In `src/app/careers/[slug]/page.tsx`:

- Wrap everything in a vertical stack (`space-y-6`) inside `containerClassName`.
- First child: `<CareerDetailsHeader … />`.
- Second child: a `grid grid-cols-1 lg:grid-cols-3 gap-6` with:
  - `lg:col-span-2` — `<CareerRolePlayChat … />` (left on desktop, 2/3).
  - `lg:col-span-1` — `<CareerDetailsPanel … />` (right on desktop, 1/3).

On mobile (`<lg`), the grid collapses to a single column. Order the children
so chat renders first, then the details panel. That is achieved by the DOM
order: chat element comes before panel element in the grid.

## Component-level contracts

### `CareerDetailsHeader`

- Input: `occupation`, `detail` (may be null), `whyItMatches` (may be null).
- Output: one `<header>` element.
- Renders no interactive elements except what is already present elsewhere
  (no new links/buttons in this component). Related careers and O*NET link
  remain in the details panel.

### `CareerDetailsPanel` (after edit)

- Input: `occupation`, `detail`, `relatedCareers`.
- Output: one rounded card.
- `whyItMatches` is removed from props.

### `page.tsx`

- Unchanged data fetching.
- Removes `whyItMatches` from the `CareerDetailsPanel` props; passes it to
  `CareerDetailsHeader` instead.
- No changes to `CareerRolePlayChat` props.

## Out of scope

- No numeric match score. The "Why it fits you" text is the personalization
  signal.
- No change to recommendations generation, career data fetching, or chat
  behavior.
- No new loading states — the current null-`detail` fallback ("More details
  are refreshing") stays in the panel. The header renders whatever fields are
  available and silently omits missing ones.

## Testing

The existing e2e specs in `e2e/specs/career-detail.spec.ts` and
`e2e/specs/career-chat.spec.ts` cover the career detail page. Update any
selectors that target elements moving between the header and the panel
(title, description, Holland code pills, Why-it-fits block, salary). No new
test files are required for the relayout itself.

Manual check: load a recommended career (`whyItMatches` present) and an
unrecommended career (`whyItMatches` absent) to confirm the callout renders
only when data exists.
