# Career Details Relayout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move career highlights (title, description, Holland codes, outlook, salary, education, and "Why it fits you") into a full-width hero header above the career detail page grid, flip the grid so chat occupies 2/3 on the left and the slimmed-down details panel sits in 1/3 on the right, and on mobile render chat before the panel.

**Architecture:** Introduce a new server component `CareerDetailsHeader` that renders the hero. Trim `CareerDetailsPanel` to the remaining supporting info and remove the `whyItMatches` prop it no longer uses. Update `page.tsx` to stack header over grid and swap the grid column order so chat comes first in the DOM.

**Tech Stack:** Next.js 16 App Router (server components), React 19, Tailwind CSS (utility classes; existing tokens like `text-foreground`, `text-muted-foreground`, `bg-surface/50`, `primary-soft`), lucide-react icons, Vitest + @testing-library/react for unit tests, Playwright for e2e.

---

## File Structure

- Create: `src/app/careers/[slug]/_components/CareerDetailsHeader.tsx` — hero server component.
- Create: `src/app/careers/[slug]/_components/__tests__/CareerDetailsHeader.test.tsx` — unit tests.
- Modify: `src/app/careers/[slug]/_components/CareerDetailsPanel.tsx` — remove title/meta/about/why-fits/salary blocks; remove `whyItMatches` prop.
- Modify: `src/app/careers/[slug]/page.tsx` — stack `<CareerDetailsHeader>` above a grid whose DOM order is chat then panel.
- Modify: `e2e/specs/career-detail.spec.ts` — update selectors where needed for the new header location.

---

## Task 1: Scaffold `CareerDetailsHeader` with a failing unit test

**Files:**
- Create: `src/app/careers/[slug]/_components/__tests__/CareerDetailsHeader.test.tsx`
- Create: `src/app/careers/[slug]/_components/CareerDetailsHeader.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/careers/[slug]/_components/__tests__/CareerDetailsHeader.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CareerDetailsHeader } from '../CareerDetailsHeader'
import type { OccupationRow } from '@/lib/onet/occupations'
import type { CareerDetail } from '@/lib/onet/schemas'

const occupation: OccupationRow = {
  code: '29-1141.00',
  slug: 'registered-nurses',
  title: 'Registered Nurses',
  shortTitle: null,
  description: 'Assess patient health problems and needs.',
  shortDescription: null,
  jobZone: 4,
  brightOutlook: true,
  riasecPrimary: 'S',
  riasecAll: ['S', 'I', 'R'],
  salaryAnnualMedian: 85000,
  salaryHourlyMedian: null,
  outlookCategory: null,
}

const detail: CareerDetail = {
  code: '29-1141.00',
  title: 'Registered Nurses',
  description: 'Assess patient health problems and needs.',
  tasks: [],
  skills: [],
  knowledge: [],
  workActivities: [],
  technology: [],
  relatedCareers: [],
  jobZone: 4,
  salaryAnnualMedian: 85000,
  salaryHourlyMedian: null,
  outlookDescription: 'Faster than average growth',
} as CareerDetail

describe('CareerDetailsHeader', () => {
  it('renders the title as a heading', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches={null} />)
    expect(screen.getByRole('heading', { name: 'Registered Nurses' })).toBeInTheDocument()
  })

  it('renders the short description', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches={null} />)
    expect(screen.getByText('Assess patient health problems and needs.')).toBeInTheDocument()
  })

  it('renders Holland codes, outlook, salary, and education pills', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches={null} />)
    expect(screen.getByText('S · I · R')).toBeInTheDocument()
    expect(screen.getByText(/Bright Outlook/i)).toBeInTheDocument()
    expect(screen.getByText(/Faster than average growth/)).toBeInTheDocument()
    expect(screen.getByText(/\$85,000/)).toBeInTheDocument()
    expect(screen.getByText(/Job Zone 4/)).toBeInTheDocument()
  })

  it('renders the "Why it fits you" callout when whyItMatches is present', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches="You care about helping people." />)
    expect(screen.getByText('Why it fits you')).toBeInTheDocument()
    expect(screen.getByText('You care about helping people.')).toBeInTheDocument()
  })

  it('omits the "Why it fits you" callout when whyItMatches is null', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches={null} />)
    expect(screen.queryByText('Why it fits you')).not.toBeInTheDocument()
  })

  it('falls back to "varies" salary when detail is null and occupation has no salary', () => {
    const occupationNoSalary = { ...occupation, salaryAnnualMedian: null, salaryHourlyMedian: null }
    render(<CareerDetailsHeader occupation={occupationNoSalary} detail={null} whyItMatches={null} />)
    expect(screen.getByText(/Median varies/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test src/app/careers/[slug]/_components/__tests__/CareerDetailsHeader.test.tsx`
Expected: FAIL — module `../CareerDetailsHeader` not found.

- [ ] **Step 3: Create the component implementation**

Create `src/app/careers/[slug]/_components/CareerDetailsHeader.tsx`:

```tsx
import { Target, TrendingUp } from 'lucide-react'
import type { CareerDetail } from '@/lib/onet/schemas'
import type { OccupationRow } from '@/lib/onet/occupations'
import { JOB_ZONE_NAMES } from '@/lib/onet/projectors'

interface Props {
  occupation: OccupationRow
  detail: CareerDetail | null
  whyItMatches: string | null
}

function formatSalary(occupation: OccupationRow, detail: CareerDetail | null): string {
  const annual = detail?.salaryAnnualMedian ?? occupation.salaryAnnualMedian
  if (typeof annual === 'number') return `$${annual.toLocaleString('en-US')}`
  const hourly = detail?.salaryHourlyMedian ?? occupation.salaryHourlyMedian
  if (typeof hourly === 'number') return `$${hourly.toLocaleString('en-US')}/hr`
  return 'varies'
}

const pillClass = 'text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground'

export function CareerDetailsHeader({ occupation, detail, whyItMatches }: Props) {
  const salary = formatSalary(occupation, detail)
  const outlookDescription = detail?.outlookDescription ?? null

  return (
    <header className="py-6 px-6 bg-surface/50 border border-border rounded-2xl">
      <h1 className="font-serif text-2xl lg:text-3xl text-foreground mb-2">{occupation.title}</h1>

      {occupation.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
          {occupation.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {occupation.riasecAll.length > 0 && (
          <span className={pillClass}>{occupation.riasecAll.join(' · ')}</span>
        )}
        {occupation.brightOutlook && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-400 text-black font-medium">
            Bright Outlook
          </span>
        )}
        {outlookDescription && (
          <span className={pillClass}>{outlookDescription}</span>
        )}
        <span className={`${pillClass} inline-flex items-center gap-1`}>
          <TrendingUp className="w-3 h-3 text-green-400" />
          {`Median ${salary}`}
        </span>
        <span className={pillClass}>{`Job Zone ${occupation.jobZone} · ${JOB_ZONE_NAMES[occupation.jobZone]}`}</span>
      </div>

      {whyItMatches && (
        <div className="mt-4 p-4 rounded-xl border border-primary-soft/30 bg-primary-soft/10">
          <h2 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-soft" />
            Why it fits you
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{whyItMatches}</p>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test src/app/careers/[slug]/_components/__tests__/CareerDetailsHeader.test.tsx`
Expected: PASS — all six tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/careers/[slug]/_components/CareerDetailsHeader.tsx src/app/careers/[slug]/_components/__tests__/CareerDetailsHeader.test.tsx
git commit -m "feat(careers): add CareerDetailsHeader hero component"
```

---

## Task 2: Strip duplicate blocks from `CareerDetailsPanel`

**Files:**
- Modify: `src/app/careers/[slug]/_components/CareerDetailsPanel.tsx`

- [ ] **Step 1: Remove the `whyItMatches` prop and duplicated blocks**

Replace the full contents of `src/app/careers/[slug]/_components/CareerDetailsPanel.tsx` with:

```tsx
import Link from 'next/link'
import { ExternalLink, GraduationCap, Wrench } from 'lucide-react'
import type { CareerDetail } from '@/lib/onet/schemas'
import type { OccupationRow } from '@/lib/onet/occupations'
import { JOB_ZONE_DESCRIPTIONS } from '@/lib/onet/projectors'

interface RelatedCareer {
  code: string
  title: string
  slug: string | null
}

interface Props {
  occupation: OccupationRow
  detail: CareerDetail | null
  relatedCareers: RelatedCareer[]
}

export function CareerDetailsPanel({ occupation, detail, relatedCareers }: Props) {
  const tasks = detail?.tasks.slice(0, 5) ?? []
  const skills = detail?.skills.slice(0, 10) ?? []
  const knowledge = detail?.knowledge.slice(0, 5) ?? []
  const tech = detail?.technology.slice(0, 8) ?? []
  const related = relatedCareers.slice(0, 6)

  return (
    <div className="p-6 bg-surface/50 border border-border rounded-2xl">
      <div className="space-y-5">
        {tasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">What they do</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              {tasks.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Skills</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{skills.join(' · ')}</p>
          </div>
        )}

        {knowledge.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Knowledge areas</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{knowledge.join(' · ')}</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-accent" />
            Education
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{JOB_ZONE_DESCRIPTIONS[occupation.jobZone]}</p>
        </div>

        {tech.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary-soft" />
              Technology used
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{tech.join(' · ')}</p>
          </div>
        )}

        {related.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Related careers</h3>
            <div className="flex flex-wrap gap-2">
              {related.map(r => (
                <Link key={r.code} href={`/careers/${r.slug ?? r.code}`} className="text-xs px-3 py-1 rounded-full border border-border hover:border-border-hover text-muted-foreground no-underline">
                  {r.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {!detail && (
          <div className="p-3 rounded-xl border border-border bg-surface/30 text-xs text-muted-foreground">
            More details are refreshing — check back soon.
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <a
            href={`https://www.onetonline.org/link/summary/${occupation.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-border text-sm text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all no-underline w-full justify-center"
          >
            <ExternalLink className="w-4 h-4" />
            View on O*NET
          </a>
        </div>
      </div>
    </div>
  )
}
```

`TrendingUp` and `Target` from `lucide-react` are no longer used in this file (both lived in the removed Salary & outlook / Why-it-fits blocks), which is why the import list above is trimmed to `ExternalLink, GraduationCap, Wrench`.

- [ ] **Step 2: Run lint to confirm no unused imports**

Run: `pnpm lint src/app/careers/[slug]/_components/CareerDetailsPanel.tsx`
Expected: no unused-import warnings.

- [ ] **Step 3: Commit**

```bash
git add src/app/careers/[slug]/_components/CareerDetailsPanel.tsx
git commit -m "refactor(careers): slim CareerDetailsPanel to supporting info"
```

---

## Task 3: Wire up header and flip grid in `page.tsx`

**Files:**
- Modify: `src/app/careers/[slug]/page.tsx`

- [ ] **Step 1: Update the render tree**

Replace the return block in `src/app/careers/[slug]/page.tsx` (lines 86–106 as currently written) with:

```tsx
return (
  <div className={containerClassName}>
    <div className="space-y-6">
      <CareerDetailsHeader
        occupation={occupation}
        detail={detail}
        whyItMatches={whyItMatches}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CareerRolePlayChat
            careerContext={careerContext}
            recommendationContext={whyItMatches ? { whyItMatches } : null}
            persona={persona}
          />
        </div>
        <div className="lg:col-span-1">
          <CareerDetailsPanel
            occupation={occupation}
            detail={detail}
            relatedCareers={relatedCareers}
          />
        </div>
      </div>
    </div>
  </div>
)
```

- [ ] **Step 2: Add the new import**

At the top of `page.tsx`, add this import next to the existing panel and chat imports:

```tsx
import { CareerDetailsHeader } from './_components/CareerDetailsHeader'
```

The existing imports of `CareerDetailsPanel` and `CareerRolePlayChat` remain.

- [ ] **Step 3: Build the page to confirm it compiles**

Run: `pnpm build`
Expected: build succeeds. If it fails, read the error — the most likely causes are a stale `whyItMatches` prop on `CareerDetailsPanel` or a missing import.

- [ ] **Step 4: Commit**

```bash
git add src/app/careers/[slug]/page.tsx
git commit -m "refactor(careers): render hero header and flip detail grid order"
```

---

## Task 4: Update the career-detail e2e spec

**Files:**
- Modify: `e2e/specs/career-detail.spec.ts`

The existing spec already asserts visibility of `Registered Nurses` as a heading, `Job Zone 4`, `Bright Outlook`, and `Why it fits you` text. All of those still render — the header carries `Registered Nurses` as an `h1`, `Job Zone 4` inside the education pill, `Bright Outlook` as the green pill, and the `whyItMatches` callout. No selector changes are required for these assertions. Add one assertion to pin the new structure so we don't lose the header in a future edit.

- [ ] **Step 1: Append an assertion that the short description renders in the hero**

In `e2e/specs/career-detail.spec.ts`, edit the test "renders O*NET details for a known slug" so it also asserts the short description text. Replace the body of that test with:

```ts
test('renders O*NET details for a known slug', async ({ authenticatedPage: page, mockChatStream }) => {
  await mockChatStream(page)
  await page.goto(`/careers/${SAMPLE_SLUG}`)
  await expect(page.getByRole('heading', { name: 'Registered Nurses', exact: true })).toBeVisible()
  await expect(page.getByText('Assess patient health.')).toBeVisible()
  await expect(page.getByText(/Job Zone 4/)).toBeVisible()
  await expect(page.getByText(/Bright Outlook/i)).toBeVisible()
})
```

The seed row (line 12 of the spec) already provides `'Assess patient health.'` as the description, so this assertion will resolve.

- [ ] **Step 2: Run the e2e spec**

Run: `pnpm test:e2e e2e/specs/career-detail.spec.ts`
Expected: all four tests pass.

If the test runner reports that you need to install Playwright browsers, run `pnpm exec playwright install chromium` first, then re-run.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/career-detail.spec.ts
git commit -m "test(e2e): assert short description renders in career detail header"
```

---

## Task 5: Full verification pass

**Files:** none modified; this task only runs checks.

- [ ] **Step 1: Run unit tests**

Run: `pnpm test`
Expected: all suites pass, including the new `CareerDetailsHeader.test.tsx`.

- [ ] **Step 2: Run the linter**

Run: `pnpm lint`
Expected: no errors. Fix any unused imports or formatting issues that surface and commit the fix as `chore(careers): lint fixes post relayout`.

- [ ] **Step 3: Run the full e2e suite**

Run: `pnpm test:e2e`
Expected: all existing e2e specs pass.

- [ ] **Step 4: Manual browser check**

Start the dev server (`pnpm dev`), sign in, and visit a career detail page.

Verify:
- Header spans the full width with the title, description, the Holland/outlook/salary/education pills on one row (wrapping on narrow widths), and (for a recommended career) the "Why it fits you" callout below the pills.
- On a desktop viewport (≥`lg`), the chat occupies the left two-thirds and the details panel occupies the right third.
- On a mobile viewport, the chat renders above the details panel.
- Details panel no longer shows the title, description, "Why it fits you", or "Salary & outlook" blocks; it still shows tasks, skills, knowledge, education description, technology, related careers, and the "View on O*NET" button.

- [ ] **Step 5: If all checks pass, no further commits are required**

If any manual issue surfaces, file a follow-up commit that fixes just that issue using the conventional prefix (`fix`, `style`, etc.) — do not amend prior commits.
