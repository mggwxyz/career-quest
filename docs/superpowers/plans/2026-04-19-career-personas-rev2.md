# Career Personas Implementation Plan — Revision 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Why a rev2:** Plan rev1 (`2026-04-18-career-personas.md`) was drafted against a stale snapshot of the careers code. The actual current code has slug-routed Server Components, a richer `CareerContext` (O*NET-derived), and an existing `buildCareerRolePlaySystemPrompt` helper that already does first-person practitioner role-play. This plan integrates the persona feature with the existing architecture instead of fighting it.

**Goal:** Every O*NET career gets a fictional persona (name, age, backstory, portrait). A hero card introduces the persona on the career detail page. The existing role-play chat (which already invents a name + experience per session) gains a *persistent* identity per career when a persona exists. A seed script generates the full set offline and commits it as static assets.

**Architecture:** Static-asset persona pack: `data/personas/personas.json` (manifest keyed by O*NET code) + `public/careers/personas/{onetCode}.webp` portraits, all committed. The `[slug]/page.tsx` Server Component looks up the persona by `occupation.code` and passes it server-side into a new `<PersonaHero>` plus the existing `<CareerRolePlayChat>`. The existing `buildCareerRolePlaySystemPrompt` helper is *extended* (not replaced) with an optional `persona` parameter that overrides the "pick a name and years" instruction with the actual persona fields and switches the disclosure rule from "never mention you are an AI" to "if asked, say you're a character created to help...". The seed pipeline is unchanged.

**Tech Stack:** TypeScript, Next.js 16 App Router (Server Components for the detail page), Vitest, `@ai-sdk/openai` (GPT-5 for persona text), `openai` SDK (gpt-image-1 for portraits), `cwebp` CLI.

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-04-18-career-personas-design.md` (product behavior is still correct; only the integration points have shifted)
- Superseded plan: `docs/superpowers/plans/2026-04-18-career-personas.md`

---

## Already done (kept)

| Commit | What |
|---|---|
| `f8cc223` | Persona types, empty manifest, loader (`src/lib/personas/types.ts`, `src/lib/personas/index.ts`, `data/personas/personas.json`, test) |

The `Persona` type and `getPersona(onetId)` loader are unaffected by the architectural correction and remain intact.

## File Structure

| Path | Status | Purpose |
|---|---|---|
| `data/personas/personas.json` | exists (empty `{}`) | Manifest keyed by O*NET code. |
| `data/personas/distribution.json` | create | Running demographic counters. |
| `data/personas/phase1-fallback.json` | create | Curated O*NET codes to pad phase-1 ranking. |
| `public/careers/personas/{onetCode}.webp` | create (many) | Portraits, 512×512. |
| `src/lib/personas/types.ts` | exists | Persona/PersonaManifest types + enums. |
| `src/lib/personas/index.ts` | exists | `getPersona(onetId)` loader. |
| `src/lib/chat/build-system-prompt.ts` | modify | Add optional `persona` parameter; rewrite the persona-aware branch of the prompt. |
| `src/lib/chat/__tests__/build-system-prompt.test.ts` | modify | Add tests for persona branch + new disclosure rule. |
| `src/app/api/careers/chat/route.ts` | modify | Extend Zod `BodySchema` with optional `persona`; pass to helper. |
| `tests/api/careers-chat.test.ts` | modify | Add a test exercising the persona path. |
| `src/app/careers/[slug]/_components/CareerRolePlayChat.tsx` | modify | Accept `persona` prop; pass through to chat body; persona-aware header. |
| `src/app/careers/[slug]/_components/PersonaHero.tsx` | create | Hero card: portrait, name, age, years-in-field, location, hobby, disclaimer. |
| `src/app/careers/[slug]/_components/__tests__/PersonaHero.test.tsx` | create | Render test. |
| `src/app/careers/[slug]/page.tsx` | modify | Server-side `getPersona(occupation.code)`; render `<PersonaHero>` above the 2-col grid; pass persona to chat. |
| `scripts/seed-personas.ts` | create | CLI orchestrator. |
| `scripts/seed-personas/sample.ts` | create | Distribution-aware demographic sampler (pure, seeded). |
| `scripts/seed-personas/__tests__/sample.test.ts` | create | Sampler tests. |
| `scripts/seed-personas/ranking.ts` | create | Phase-1 top-200 ranking (DB + fallback merge). |
| `scripts/seed-personas/generate-text.ts` | create | GPT-5 + Zod persona-text generator. |
| `scripts/seed-personas/generate-image.ts` | create | gpt-image-1 + cwebp portrait generator. |
| `scripts/seed-personas/prompts.ts` | create | Locked style prefix + prompt templates. |

**Removed from rev1:**
- `src/app/api/careers/[onetId]/route.ts` modification — that route is orphaned in the new architecture (the slug page does its own DB queries). No persona endpoint needed.
- `src/lib/careers/chat-prompt.ts` (`composeSystemPrompt`) — superseded by extending the existing `buildCareerRolePlaySystemPrompt`.

---

## Task 2: Extend the role-play prompt builder with optional persona

**Files:**
- Modify: `src/lib/chat/build-system-prompt.ts`
- Modify: `src/lib/chat/__tests__/build-system-prompt.test.ts`

The existing helper already does first-person practitioner role-play. We add an optional `persona` parameter; when provided, the prompt:

1. Replaces the "pick a name + years" instruction with the actual persona name, age, pronouns, years, and location.
2. Adds an "About you" subsection with educationPath, pathToCurrentPosition, dayInTheLife, hobby.
3. Replaces "Never break character; never mention that you are an AI" with the honest-character rule from the spec.

When `persona` is null/undefined, the existing prompt is unchanged (existing tests must keep passing).

- [ ] **Step 1: Read the current helper to confirm its shape**

Run: `cat src/lib/chat/build-system-prompt.ts`

- [ ] **Step 2: Add the failing tests for persona behavior**

Append to `src/lib/chat/__tests__/build-system-prompt.test.ts` (do NOT touch the existing tests):

```ts
import type { Persona } from '@/lib/personas/types'

const persona: Persona = {
  onetId: '29-1141.00',
  name: 'Maria Alvarez',
  age: 34,
  gender: 'female',
  pronouns: 'she/her',
  ethnicityCue: 'hispanic',
  ageBand: '30s',
  yearsInField: 12,
  location: 'Denver, CO',
  educationPath: 'Associate of Nursing at Front Range CC.',
  pathToCurrentPosition: 'Started in med-surg; moved to ER after 3 years.',
  dayInTheLife: 'Triage, charting, family conversations.',
  hobby: 'Trail running on weekends.',
  imagePrompt: 'prompt',
  generatedAt: '2026-04-19T00:00:00.000Z',
  textModel: 'gpt-5',
  imageModel: 'gpt-image-1',
}

describe('buildCareerRolePlaySystemPrompt with persona', () => {
  it('uses the persona name, age, pronouns, and location verbatim', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, persona)
    expect(out).toMatch(/Maria Alvarez/)
    expect(out).toMatch(/34/)
    expect(out).toMatch(/she\/her/)
    expect(out).toMatch(/Denver, CO/)
    expect(out).toMatch(/12 years/)
  })

  it('injects educationPath, pathToCurrentPosition, dayInTheLife, hobby', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, persona)
    expect(out).toMatch(/Front Range CC/)
    expect(out).toMatch(/med-surg/)
    expect(out).toMatch(/Triage, charting/)
    expect(out).toMatch(/Trail running/)
  })

  it('replaces the pick-a-name self-introduction instruction with persona-driven intro', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, persona)
    expect(out).not.toMatch(/pick one value from 3 to 15/)
    expect(out).toMatch(/introduce yourself/i)
  })

  it('switches the disclosure rule from "never mention AI" to honest-character', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, persona)
    expect(out).not.toMatch(/never.*mention.*AI/i)
    expect(out).toMatch(/character created to help/i)
  })

  it('persona=null preserves the original behavior (regression check)', () => {
    const out = buildCareerRolePlaySystemPrompt(careerContext, null, null)
    expect(out).toMatch(/first name/i)
    expect(out).toMatch(/never.*AI/i)
  })
})
```

- [ ] **Step 3: Run tests — expect 5 new failures**

Run: `pnpm test src/lib/chat/__tests__/build-system-prompt.test.ts`
Expected: existing 6 pass; the 5 new ones fail (3 args don't match signature yet).

- [ ] **Step 4: Modify the helper to accept and apply persona**

Replace `src/lib/chat/build-system-prompt.ts`:

```ts
import type { Persona } from '@/lib/personas/types'

export interface CareerContext {
  title: string
  onetCode: string
  shortDescription: string
  tasks: string[]
  skills: string[]
  knowledge: string[]
  workActivities: string[]
  technology: string[]
  jobZone: { number: number, name: string, description: string }
  riasecTop: string[]
  salaryMedian: string
  outlook: string
}

export interface RecommendationContext {
  whyItMatches: string
}

const bullets = (items: string[]) => items.map(x => `- ${x}`).join('\n')

export function buildCareerRolePlaySystemPrompt(
  career: CareerContext,
  rec: RecommendationContext | null,
  persona: Persona | null = null,
): string {
  const recBlock = rec
    ? `\n# Personalization\nThe student was recommended this career because: "${rec.whyItMatches}"\nWeave this into your framing naturally — don't repeat it verbatim.\n`
    : ''

  // The persona-driven and pick-your-own-name intro lines diverge in two places:
  // the self-introduction instruction and the AI-disclosure rule. Everything
  // else is shared so the role-play stays grounded in the same O*NET facts.
  const introLine = persona
    ? `- On your FIRST message, introduce yourself ONCE as ${persona.name} (${persona.pronouns}), ${persona.age}, ${persona.yearsInField} years working in this field, based in ${persona.location}. Keep these details consistent for every later message.`
    : `- On your FIRST message, introduce yourself ONCE with: a first name, your years of experience in this career (pick one value from 3 to 15), and a brief workplace context (e.g., "at a community hospital in Ohio"). Keep those details consistent for every later message.`

  const personaBlock = persona
    ? `\n# About you (use these consistently)
Education path: ${persona.educationPath}
How you got here: ${persona.pathToCurrentPosition}
A typical day for you: ${persona.dayInTheLife}
Outside of work: ${persona.hobby}
`
    : ''

  const disclosureRule = persona
    ? '- If the user asks whether you are real or an AI, say you are a character created to help them explore this career, and that the career facts you share are grounded in real data. Then offer to keep going.'
    : '- Never break character; never mention that you are an AI.'

  return `You are role-playing as a working practitioner in the following career. Stay in character for the entire conversation.

# Your career
Title: ${career.title}
O*NET code: ${career.onetCode}
Short description: ${career.shortDescription}

# What you do day-to-day (from O*NET)
Top tasks:
${bullets(career.tasks)}

Work activities:
${bullets(career.workActivities)}

Technologies you use:
${bullets(career.technology)}

# Your expertise (from O*NET)
Skills:
${bullets(career.skills)}

Knowledge areas:
${bullets(career.knowledge)}

# Your background
Education / training: typical of Job Zone ${career.jobZone.number} — ${career.jobZone.name}. ${career.jobZone.description}
Interests typical of this role: ${career.riasecTop.join(', ')}
Typical compensation: ${career.salaryMedian}. Outlook: ${career.outlook}.
${personaBlock}
# How to behave
${introLine}
- Speak in first person. Be warm and student-friendly. Explain any jargon you use.
- Ground every factual claim in the data above. If you don't know something specific (a salary in a specific city, niche specialties), say so and suggest how the student could find out.
- Share a realistic, honest picture — rewarding parts AND hard parts.
- Keep each response to 2–4 short paragraphs. End most responses with a lightweight prompt that invites the next question.
${recBlock}
# What NOT to do
${disclosureRule}
- Never invent specific company names, salaries, or statistics beyond the data above.
- Never give generic career-counselor advice. Speak as a practitioner, not a coach.`
}
```

- [ ] **Step 5: Run tests — expect all 11 pass**

Run: `pnpm test src/lib/chat/__tests__/build-system-prompt.test.ts`
Expected: 11/11 pass (6 existing + 5 new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/chat/build-system-prompt.ts src/lib/chat/__tests__/build-system-prompt.test.ts
git commit -m "feat(personas): extend role-play prompt with optional persona"
```

---

## Task 3: Accept persona in chat-route Zod schema and pass to helper

**Files:**
- Modify: `src/app/api/careers/chat/route.ts`
- Modify: `tests/api/careers-chat.test.ts`

- [ ] **Step 1: Add a failing test that exercises the persona path**

Append to `tests/api/careers-chat.test.ts`:

```ts
const validPersona = {
  onetId: '29-1141.00',
  name: 'Maria Alvarez',
  age: 34,
  gender: 'female',
  pronouns: 'she/her',
  ethnicityCue: 'hispanic',
  ageBand: '30s',
  yearsInField: 12,
  location: 'Denver, CO',
  educationPath: 'edu',
  pathToCurrentPosition: 'path',
  dayInTheLife: 'day',
  hobby: 'hobby',
  imagePrompt: 'prompt',
  generatedAt: '2026-04-19T00:00:00.000Z',
  textModel: 'gpt-5',
  imageModel: 'gpt-image-1',
}

it('accepts an optional persona field in the body', async () => {
  const req = new Request('http://test/api/careers/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi' }],
      careerContext: validCtx(),
      recommendationContext: null,
      persona: validPersona,
    }),
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
})

it('still accepts a body without persona (backward compat)', async () => {
  const req = new Request('http://test/api/careers/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi' }],
      careerContext: validCtx(),
      recommendationContext: null,
    }),
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
})
```

- [ ] **Step 2: Run tests — expect the persona case to fail**

Run: `pnpm test tests/api/careers-chat.test.ts`
Expected: persona case → 400 (Zod rejects unknown field), backward-compat passes.

- [ ] **Step 3: Add persona to BodySchema and pass through**

Replace `src/app/api/careers/chat/route.ts`:

```ts
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { buildCareerRolePlaySystemPrompt } from '@/lib/chat/build-system-prompt'

export const maxDuration = 30

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const CareerContextSchema = z.object({
  title: z.string(),
  onetCode: z.string(),
  shortDescription: z.string(),
  tasks: z.array(z.string()).max(10),
  skills: z.array(z.string()).max(15),
  knowledge: z.array(z.string()).max(10),
  workActivities: z.array(z.string()).max(10),
  technology: z.array(z.string()).max(15),
  jobZone: z.object({ number: z.number(), name: z.string(), description: z.string() }),
  riasecTop: z.array(z.string()).max(6),
  salaryMedian: z.string(),
  outlook: z.string(),
})

const PersonaSchema = z.object({
  onetId: z.string(),
  name: z.string(),
  age: z.number(),
  gender: z.enum(['female', 'male', 'nonbinary']),
  pronouns: z.string(),
  ethnicityCue: z.enum([
    'white', 'black', 'hispanic', 'asian',
    'middle_eastern', 'pacific_islander', 'indigenous', 'multiracial',
  ]),
  ageBand: z.enum(['20s', '30s', '40s', '50s_plus']),
  yearsInField: z.number(),
  location: z.string(),
  educationPath: z.string(),
  pathToCurrentPosition: z.string(),
  dayInTheLife: z.string(),
  hobby: z.string(),
  imagePrompt: z.string(),
  generatedAt: z.string(),
  textModel: z.string(),
  imageModel: z.string(),
})

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  careerContext: CareerContextSchema,
  recommendationContext: z.object({ whyItMatches: z.string() }).nullable(),
  persona: PersonaSchema.nullable().optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    })
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    })
  }

  const system = buildCareerRolePlaySystemPrompt(
    body.careerContext,
    body.recommendationContext,
    body.persona ?? null,
  )

  const result = streamText({
    model: openai('gpt-4o'),
    system,
    messages: body.messages,
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `pnpm test tests/api/careers-chat.test.ts`
Expected: all pass (4 original + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/careers/chat/route.ts tests/api/careers-chat.test.ts
git commit -m "feat(personas): accept optional persona in chat route body"
```

---

## Task 4: Persona-aware chat client

**Files:**
- Modify: `src/app/careers/[slug]/_components/CareerRolePlayChat.tsx`

- [ ] **Step 1: Add persona prop and thread it through**

Replace `src/app/careers/[slug]/_components/CareerRolePlayChat.tsx`:

```tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { Chat } from '@/components/ui/chat'
import type { CareerContext } from '@/lib/chat/build-system-prompt'
import type { Persona } from '@/lib/personas/types'

interface Props {
  careerContext: CareerContext
  recommendationContext: { whyItMatches: string } | null
  persona: Persona | null
}

export function CareerRolePlayChat({ careerContext, recommendationContext, persona }: Props) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    reload,
    setMessages,
  } = useChat({
    api: '/api/careers/chat',
    body: { careerContext, recommendationContext, persona },
    initialMessages: [],
  })

  const onStartOver = () => setMessages([])

  const headerLabel = persona
    ? (
        <>
          Talk with
          {' '}
          <span>{persona.name}</span>
          <span className="text-muted-foreground font-normal">{`, ${careerContext.title}`}</span>
        </>
      )
    : (
        <>
          Talk with a
          {' '}
          <span>{careerContext.title}</span>
        </>
      )

  const headerSubtitle = persona
    ? `${persona.yearsInField} years in the field — based in ${persona.location}.`
    : 'Speaking from experience — ask about the day-to-day, getting started, what surprises people, or anything else.'

  return (
    <div className="bg-surface/50 border border-border rounded-2xl h-[600px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span aria-hidden className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary" />
            {headerLabel}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{headerSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="text-xs text-muted-foreground hover:text-primary-soft underline disabled:opacity-40"
          disabled={messages.length === 0 || status === 'streaming'}
        >
          Start over
        </button>
      </div>

      {error && (
        <div className="p-4 border-b border-border" role="alert">
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <p className="text-sm font-semibold text-destructive mb-1">Chat Error</p>
            <p className="text-xs text-muted-foreground mb-2">Failed to send message. Please try again.</p>
            <button
              type="button"
              onClick={() => reload()}
              disabled={status === 'streaming'}
              className="text-xs text-primary-soft hover:underline disabled:opacity-50"
            >
              Retry Last Message
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Chat
          messages={messages}
          handleSubmit={handleSubmit}
          input={input}
          handleInputChange={handleInputChange}
          isGenerating={status === 'streaming'}
          className="flex-1 p-4"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: a single error in `src/app/careers/[slug]/page.tsx` complaining about a missing `persona` prop on `CareerRolePlayChat`. That gets fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/app/careers/[slug]/_components/CareerRolePlayChat.tsx
git commit -m "feat(personas): persona-aware chat client header + body"
```

---

## Task 5: PersonaHero component

**Files:**
- Create: `src/app/careers/[slug]/_components/PersonaHero.tsx`
- Create: `src/app/careers/[slug]/_components/__tests__/PersonaHero.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/careers/[slug]/_components/__tests__/PersonaHero.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonaHero } from '../PersonaHero'
import type { Persona } from '@/lib/personas/types'

const persona: Persona = {
  onetId: '29-1141.00',
  name: 'Maria Alvarez',
  age: 34,
  gender: 'female',
  pronouns: 'she/her',
  ethnicityCue: 'hispanic',
  ageBand: '30s',
  yearsInField: 12,
  location: 'Denver, CO',
  educationPath: 'edu',
  pathToCurrentPosition: 'path',
  dayInTheLife: 'day',
  hobby: 'Trail running on weekends.',
  imagePrompt: '',
  generatedAt: '',
  textModel: 'gpt-5',
  imageModel: 'gpt-image-1',
}

describe('PersonaHero', () => {
  it('renders name, role, years, location, hobby, and the disclaimer', () => {
    render(<PersonaHero persona={persona} careerTitle="Registered Nurses" />)
    expect(screen.getByText(/Maria Alvarez/)).toBeInTheDocument()
    expect(screen.getByText(/Registered Nurses/)).toBeInTheDocument()
    expect(screen.getByText(/12 years/)).toBeInTheDocument()
    expect(screen.getByText(/Denver, CO/)).toBeInTheDocument()
    expect(screen.getByText(/Trail running/)).toBeInTheDocument()
    expect(screen.getByText(/Fictional character/i)).toBeInTheDocument()
  })

  it('uses the onetId to build the portrait src', () => {
    render(<PersonaHero persona={persona} careerTitle="Registered Nurses" />)
    const img = screen.getByAltText(/Maria Alvarez/) as HTMLImageElement
    expect(img.src).toMatch(/\/careers\/personas\/29-1141\.00\.webp/)
  })
})
```

- [ ] **Step 2: Run the test — expect it to fail**

Run: `pnpm test src/app/careers/[slug]/_components/__tests__/PersonaHero.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/app/careers/[slug]/_components/PersonaHero.tsx`:

```tsx
import Image from 'next/image'
import type { Persona } from '@/lib/personas/types'

interface PersonaHeroProps {
  persona: Persona
  careerTitle: string
}

export function PersonaHero({ persona, careerTitle }: PersonaHeroProps) {
  const portraitSrc = `/careers/personas/${persona.onetId}.webp`

  return (
    <div className="p-6 bg-surface/50 border border-border rounded-2xl mb-6">
      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <div className="shrink-0">
          <Image
            src={portraitSrc}
            alt={persona.name}
            width={160}
            height={160}
            className="rounded-2xl object-cover"
            priority
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Meet</p>
          <h2 className="font-serif text-2xl text-foreground">{persona.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {careerTitle}
            {' • '}
            {persona.yearsInField}
            {' years in'}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-0.5 italic">
            Meet a fictional character. Real career facts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-4 text-sm">
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Location:</span>
              {' '}
              {persona.location}
            </p>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Hobby:</span>
              {' '}
              {persona.hobby}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test — expect both pass**

Run: `pnpm test src/app/careers/[slug]/_components/__tests__/PersonaHero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/careers/[slug]/_components/PersonaHero.tsx src/app/careers/[slug]/_components/__tests__/PersonaHero.test.tsx
git commit -m "feat(personas): PersonaHero component"
```

---

## Task 6: Wire persona into the slug detail page

**Files:**
- Modify: `src/app/careers/[slug]/page.tsx`

- [ ] **Step 1: Server-load persona and render hero + pass to chat**

Modify `src/app/careers/[slug]/page.tsx`. Change three things only:

1. Add an import: `import { getPersona } from '@/lib/personas'` (and `import { PersonaHero } from './_components/PersonaHero'`).
2. Right after the existing `const careerContext = ...` block, add:
   ```ts
   const persona = getPersona(occupation.code)
   ```
3. Replace the JSX `return` with:
   ```tsx
   return (
     <div className={containerClassName}>
       {persona && <PersonaHero persona={persona} careerTitle={occupation.title} />}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-1">
           <CareerDetailsPanel
             occupation={occupation}
             detail={detail}
             whyItMatches={whyItMatches}
           />
         </div>
         <div className="lg:col-span-2">
           <CareerRolePlayChat
             careerContext={careerContext}
             recommendationContext={whyItMatches ? { whyItMatches } : null}
             persona={persona}
           />
         </div>
       </div>
     </div>
   )
   ```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors. (Resolves the missing-prop error from Task 4.)

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all previously-passing tests still pass; no new failures from the persona changes. (The 2 pre-existing `src/lib/onet/__tests__/` failures are unrelated and remain.)

- [ ] **Step 4: Commit**

```bash
git add src/app/careers/[slug]/page.tsx
git commit -m "feat(personas): render PersonaHero and pass persona to chat"
```

---

## Task 7: Distribution data + demographic sampler

**Files:**
- Create: `data/personas/distribution.json`
- Create: `scripts/seed-personas/sample.ts`
- Create: `scripts/seed-personas/__tests__/sample.test.ts`

(Identical to rev1 Task 8 — no changes needed.)

- [ ] **Step 1: Create the initial distribution counters**

Create `data/personas/distribution.json`:

```json
{
  "gender":    { "female": 0, "male": 0, "nonbinary": 0 },
  "ethnicity": { "white": 0, "black": 0, "hispanic": 0, "asian": 0, "middle_eastern": 0, "pacific_islander": 0, "indigenous": 0, "multiracial": 0 },
  "ageBand":   { "20s": 0, "30s": 0, "40s": 0, "50s_plus": 0 },
  "total":     0
}
```

- [ ] **Step 2: Write the failing sampler test**

Create `scripts/seed-personas/__tests__/sample.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sampleDemographics, type Distribution } from '../sample'

const emptyDist: Distribution = {
  gender: { female: 0, male: 0, nonbinary: 0 },
  ethnicity: {
    white: 0, black: 0, hispanic: 0, asian: 0,
    middle_eastern: 0, pacific_islander: 0, indigenous: 0, multiracial: 0,
  },
  ageBand: { '20s': 0, '30s': 0, '40s': 0, '50s_plus': 0 },
  total: 0,
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

describe('sampleDemographics', () => {
  it('is deterministic given the same rng', () => {
    const a = sampleDemographics(emptyDist, mulberry32(42))
    const b = sampleDemographics(emptyDist, mulberry32(42))
    expect(a).toEqual(b)
  })

  it('produces years in field that never exceeds age - 18', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const s = sampleDemographics(emptyDist, rng)
      expect(s.yearsInField).toBeLessThanOrEqual(s.age - 18)
      expect(s.yearsInField).toBeGreaterThanOrEqual(0)
    }
  })

  it('across 1000 samples, distribution tracks the targets within tolerance', () => {
    const rng = mulberry32(123)
    const gender = { female: 0, male: 0, nonbinary: 0 } as Record<string, number>
    const ethnicity: Record<string, number> = {}
    const N = 1000
    for (let i = 0; i < N; i++) {
      const s = sampleDemographics(emptyDist, rng)
      gender[s.gender] += 1
      ethnicity[s.ethnicityCue] = (ethnicity[s.ethnicityCue] ?? 0) + 1
    }
    expect(gender.female / N).toBeGreaterThan(0.40)
    expect(gender.female / N).toBeLessThan(0.54)
    expect(gender.male / N).toBeGreaterThan(0.40)
    expect(gender.male / N).toBeLessThan(0.54)
    expect(gender.nonbinary / N).toBeGreaterThan(0.03)
    expect(gender.nonbinary / N).toBeLessThan(0.10)
    for (const key of ['white', 'black', 'hispanic', 'asian']) {
      const frac = (ethnicity[key] ?? 0) / N
      expect(frac).toBeGreaterThan(0.12)
    }
  })

  it('biases away from over-filled cells', () => {
    const skewed: Distribution = {
      ...emptyDist,
      gender: { female: 100, male: 0, nonbinary: 0 },
      total: 100,
    }
    const rng = mulberry32(9)
    let male = 0
    for (let i = 0; i < 200; i++) {
      const s = sampleDemographics(skewed, rng)
      if (s.gender === 'male') male++
    }
    expect(male).toBeGreaterThan(120)
  })
})
```

- [ ] **Step 3: Run the test — expect it to fail (module not found)**

Run: `pnpm test scripts/seed-personas/__tests__/sample.test.ts`

- [ ] **Step 4: Implement the sampler**

Create `scripts/seed-personas/sample.ts`:

```ts
import type { Gender, EthnicityCue, AgeBand } from '../../src/lib/personas/types'

export type Distribution = {
  gender: Record<Gender, number>
  ethnicity: Record<EthnicityCue, number>
  ageBand: Record<AgeBand, number>
  total: number
}

export type Sample = {
  gender: Gender
  ethnicityCue: EthnicityCue
  ageBand: AgeBand
  age: number
  yearsInField: number
}

type Rng = () => number

const GENDER_TARGETS: Record<Gender, number> = {
  female: 0.47, male: 0.47, nonbinary: 0.06,
}
const ETHNICITY_TARGETS: Record<EthnicityCue, number> = {
  white: 0.25, black: 0.22, hispanic: 0.22, asian: 0.18,
  middle_eastern: 0.04, pacific_islander: 0.03, indigenous: 0.03, multiracial: 0.03,
}
const AGE_TARGETS: Record<AgeBand, number> = {
  '20s': 0.25, '30s': 0.35, '40s': 0.25, '50s_plus': 0.15,
}

function biasedWeights<K extends string>(
  targets: Record<K, number>,
  counts: Record<K, number>,
  total: number,
): Record<K, number> {
  const result = {} as Record<K, number>
  for (const k of Object.keys(targets) as K[]) {
    const target = targets[k]
    const observed = total === 0 ? 0 : counts[k] / total
    const bias = Math.exp(2 * (target - observed))
    result[k] = target * bias
  }
  return result
}

function weightedPick<K extends string>(weights: Record<K, number>, rng: Rng): K {
  const entries = Object.entries(weights) as Array<[K, number]>
  const sum = entries.reduce((acc, [, w]) => acc + w, 0)
  let r = rng() * sum
  for (const [k, w] of entries) {
    r -= w
    if (r <= 0) return k
  }
  return entries[entries.length - 1][0]
}

function ageFromBand(band: AgeBand, rng: Rng): number {
  if (band === '20s') return 22 + Math.floor(rng() * 8)
  if (band === '30s') return 30 + Math.floor(rng() * 10)
  if (band === '40s') return 40 + Math.floor(rng() * 10)
  return 50 + Math.floor(rng() * 15)
}

export function sampleDemographics(dist: Distribution, rng: Rng): Sample {
  const gender = weightedPick(biasedWeights(GENDER_TARGETS, dist.gender, dist.total), rng)
  const ethnicityCue = weightedPick(biasedWeights(ETHNICITY_TARGETS, dist.ethnicity, dist.total), rng)
  const ageBand = weightedPick(biasedWeights(AGE_TARGETS, dist.ageBand, dist.total), rng)
  const age = ageFromBand(ageBand, rng)
  const maxYears = Math.max(0, age - 18)
  const yearsInField = Math.floor(rng() * (maxYears + 1))
  return { gender, ethnicityCue, ageBand, age, yearsInField }
}

export function applySample(dist: Distribution, s: Sample): Distribution {
  return {
    gender: { ...dist.gender, [s.gender]: dist.gender[s.gender] + 1 },
    ethnicity: { ...dist.ethnicity, [s.ethnicityCue]: dist.ethnicity[s.ethnicityCue] + 1 },
    ageBand: { ...dist.ageBand, [s.ageBand]: dist.ageBand[s.ageBand] + 1 },
    total: dist.total + 1,
  }
}
```

- [ ] **Step 5: Run the test — expect all pass**

Run: `pnpm test scripts/seed-personas/__tests__/sample.test.ts`

- [ ] **Step 6: Commit**

```bash
git add data/personas/distribution.json scripts/seed-personas/sample.ts scripts/seed-personas/__tests__/sample.test.ts
git commit -m "feat(personas): demographic sampler with distribution bias"
```

---

## Task 8: Phase-1 ranking + curated fallback

(Identical to rev1 Task 9. Carry forward verbatim.)

**Files:**
- Create: `data/personas/phase1-fallback.json`
- Create: `scripts/seed-personas/ranking.ts`

See rev1 plan §Task 9 for the full step-by-step + the curated 200-entry list.

---

## Task 9: Persona text generator (GPT-5)

**Files:**
- Create: `scripts/seed-personas/prompts.ts`
- Create: `scripts/seed-personas/generate-text.ts`

(Identical to rev1 Task 10. Carry forward verbatim.)

---

## Task 10: Portrait generator

**Files:**
- Create: `scripts/seed-personas/generate-image.ts`

(Identical to rev1 Task 11. Carry forward verbatim.)

---

## Task 11: Main seed orchestrator

**Files:**
- Create: `scripts/seed-personas.ts`

(Identical to rev1 Task 12, with one substitution: when fetching the career title for prompt building, use the local O*NET mirror via `getOccupationByCode(onetCode)` from `@/lib/onet/occupations` instead of `careerRecommendations`. The recommendations table is per-user; the O*NET mirror has the canonical title for any code.)

The fetch helper inside the orchestrator becomes:

```ts
import { getOccupationByCode } from '../src/lib/onet/occupations'

async function fetchCareerForOnet(onetCode: string) {
  const row = await getOccupationByCode(onetCode)
  if (!row) return null
  return { title: row.title, description: row.description ?? '' }
}
```

Otherwise identical to rev1 Task 12.

---

## Task 12: Smoke-test pipeline on a single code

**Files:**
- Generates: `public/careers/personas/29-1141.00.{png,webp}`
- Updates: `data/personas/personas.json`, `data/personas/distribution.json`

(Identical to rev1 Task 13, with the manual UI step targeting the slug URL: navigate to `/careers/registered-nurses` instead of `/careers/29-1141.00`. The slug page accepts the O*NET code as a fallback that 301s to the canonical slug, so either URL works for verification.)

---

## Task 13: Phase-1 seed (top 200)

(Identical to rev1 Task 14.)

---

## Task 14: Phase-2 overnight seed

(Identical to rev1 Task 15.)

---

## Verification checklist

Same as rev1, but the manual UI URLs use slugs (`/careers/registered-nurses`) rather than O*NET codes.
