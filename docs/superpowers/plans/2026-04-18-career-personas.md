# Career Personas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every O*NET career gets a fictional persona (name, age, backstory, portrait). A new hero card introduces the persona on the career detail page; the existing chat switches to first-person roleplay as that persona. A seed script generates the full persona set offline and commits it as static assets.

**Architecture:** Static-asset "persona pack": one `personas.json` manifest + one `.webp` portrait per O*NET code, both committed to the repo. The detail-page API route reads the manifest server-side and returns `{ career, persona }`. The client renders `<PersonaHero>` when `persona` is non-null; the chat route branches its system prompt based on persona presence. A seed script in `scripts/` generates the set in two batches (top 200 first, ~800 overnight). No new DB tables. No runtime generation.

**Tech Stack:** TypeScript, Next.js App Router, Vitest, `@ai-sdk/openai` (GPT-5 for persona text), `openai` SDK (gpt-image-1 for portraits), `cwebp` CLI (PNG → WEBP conversion, already used in repo).

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-04-18-career-personas-design.md`

---

## File Structure

| Path | Status | Purpose |
|---|---|---|
| `data/personas/personas.json` | create | Manifest keyed by onetId. Starts as `{}`. |
| `data/personas/distribution.json` | create | Running demographic counters for sampling. |
| `data/personas/phase1-fallback.json` | create | Curated O*NET codes to pad phase-1 ranking if DB has < 200 distinct. |
| `public/careers/personas/{onetId}.webp` | create (many) | Portraits, 512×512. |
| `src/lib/personas/types.ts` | create | `Persona`, `PersonaManifest`, `Gender`, `EthnicityCue`, `AgeBand` types. |
| `src/lib/personas/index.ts` | create | `getPersona(onetId)` loader. |
| `src/lib/personas/__tests__/index.test.ts` | create | Loader tests. |
| `src/lib/careers/chat-prompt.ts` | create | `composeSystemPrompt({ career, persona })` — pure, testable. |
| `src/lib/careers/__tests__/chat-prompt.test.ts` | create | Prompt composition tests. |
| `src/components/persona-hero.tsx` | create | Hero card component. |
| `src/components/__tests__/persona-hero.test.tsx` | create | Hero render tests. |
| `src/app/api/careers/[onetId]/route.ts` | modify | Include `persona` in response. |
| `src/app/api/careers/[onetId]/__tests__/route.test.ts` | create | Returns `persona: null` for unseeded, populated for seeded. |
| `src/app/careers/[onetId]/page.tsx` | modify | Store + pass persona; render `<PersonaHero>`. |
| `src/components/career-chat.tsx` | modify | Accept persona; persona-aware greeting + body. |
| `src/app/api/careers/chat/route.ts` | modify | Use `composeSystemPrompt`; accept persona in body. |
| `scripts/seed-personas.ts` | create | CLI orchestrator. |
| `scripts/seed-personas/sample.ts` | create | Distribution-aware demographic sampler (pure, seeded). |
| `scripts/seed-personas/__tests__/sample.test.ts` | create | Sampler tests. |
| `scripts/seed-personas/ranking.ts` | create | Phase-1 top-200 ranking (DB + fallback merge). |
| `scripts/seed-personas/generate-text.ts` | create | GPT-5 + Zod persona-text generator. |
| `scripts/seed-personas/generate-image.ts` | create | gpt-image-1 + cwebp portrait generator. |
| `scripts/seed-personas/prompts.ts` | create | Locked style prefix + prompt templates. |

Nothing in `src/db/schema.ts` changes. No migrations.

---

## Task 1: Persona types, empty manifest, loader

**Files:**
- Create: `data/personas/personas.json`
- Create: `src/lib/personas/types.ts`
- Create: `src/lib/personas/index.ts`
- Create: `src/lib/personas/__tests__/index.test.ts`

- [ ] **Step 1: Create the empty manifest**

Write `data/personas/personas.json` with `{}` as its only content (object, not array — it's a map keyed by onetId).

- [ ] **Step 2: Write the types module**

Create `src/lib/personas/types.ts`:

```ts
export type Gender = 'female' | 'male' | 'nonbinary'

export type EthnicityCue =
  | 'white'
  | 'black'
  | 'hispanic'
  | 'asian'
  | 'middle_eastern'
  | 'pacific_islander'
  | 'indigenous'
  | 'multiracial'

export type AgeBand = '20s' | '30s' | '40s' | '50s_plus'

export type Persona = {
  onetId: string
  name: string
  age: number
  gender: Gender
  pronouns: string
  ethnicityCue: EthnicityCue
  ageBand: AgeBand
  yearsInField: number
  location: string
  educationPath: string
  pathToCurrentPosition: string
  dayInTheLife: string
  hobby: string
  imagePrompt: string
  generatedAt: string
  textModel: string
  imageModel: string
}

export type PersonaManifest = Record<string, Persona>
```

- [ ] **Step 3: Write the failing loader test**

Create `src/lib/personas/__tests__/index.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../../data/personas/personas.json', () => ({
  default: {
    '29-1141.00': {
      onetId: '29-1141.00',
      name: 'Test Nurse',
      age: 34,
      gender: 'female',
      pronouns: 'she/her',
      ethnicityCue: 'hispanic',
      ageBand: '30s',
      yearsInField: 12,
      location: 'Denver, CO',
      educationPath: 'Test path.',
      pathToCurrentPosition: 'Test path.',
      dayInTheLife: 'Test day.',
      hobby: 'Test hobby.',
      imagePrompt: 'test prompt',
      generatedAt: '2026-04-18T00:00:00.000Z',
      textModel: 'gpt-5',
      imageModel: 'gpt-image-1',
    },
  },
}))

import { getPersona } from '../index'

describe('getPersona', () => {
  it('returns a persona for a seeded onetId', () => {
    const persona = getPersona('29-1141.00')
    expect(persona?.name).toBe('Test Nurse')
    expect(persona?.age).toBe(34)
  })

  it('returns null for an unseeded onetId', () => {
    expect(getPersona('99-9999.99')).toBeNull()
  })
})
```

- [ ] **Step 4: Run the test to confirm it fails**

Run: `pnpm test src/lib/personas/__tests__/index.test.ts`
Expected: FAIL — "getPersona is not a function" or similar.

- [ ] **Step 5: Implement the loader**

Create `src/lib/personas/index.ts`:

```ts
import manifest from '../../../data/personas/personas.json'
import type { Persona, PersonaManifest } from './types'

export type { Persona, PersonaManifest, Gender, EthnicityCue, AgeBand } from './types'

export function getPersona(onetId: string): Persona | null {
  const m = manifest as PersonaManifest
  return m[onetId] ?? null
}
```

- [ ] **Step 6: Run the test to confirm it passes**

Run: `pnpm test src/lib/personas/__tests__/index.test.ts`
Expected: PASS (both cases).

- [ ] **Step 7: Commit**

```bash
git add data/personas/personas.json src/lib/personas/
git commit -m "feat(personas): add persona types, empty manifest, loader"
```

---

## Task 2: Include persona in careers API response

**Files:**
- Modify: `src/app/api/careers/[onetId]/route.ts`
- Create: `src/app/api/careers/[onetId]/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing API test**

Create `src/app/api/careers/[onetId]/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/get-session', () => ({
  getSession: vi.fn(async () => ({ user: { id: 'user-1' }, session: {} })),
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{
            title: 'Registered Nurse',
            description: 'desc',
            onetId: '29-1141.00',
            whyItMatches: 'why',
            jobGrowth: 'growth',
            salaryRange: 'salary',
          }]),
        })),
      })),
    })),
  },
}))

vi.mock('@/lib/personas', () => ({
  getPersona: vi.fn((onetId: string) =>
    onetId === '29-1141.00'
      ? { onetId, name: 'Maria', age: 34 /* abbrev */ } as any
      : null,
  ),
}))

import { GET } from '../route'

function makeParams(onetId: string) {
  return { params: Promise.resolve({ onetId }) }
}

describe('GET /api/careers/[onetId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns career + persona when persona exists', async () => {
    const res = await GET(new Request('http://test'), makeParams('29-1141.00'))
    const body = await res.json()
    expect(body.career.title).toBe('Registered Nurse')
    expect(body.persona?.name).toBe('Maria')
  })

  it('returns career + persona: null when persona missing', async () => {
    const res = await GET(new Request('http://test'), makeParams('11-9999.99'))
    const body = await res.json()
    expect(body.career.title).toBe('Registered Nurse')
    expect(body.persona).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm test src/app/api/careers/[onetId]/__tests__/route.test.ts`
Expected: FAIL — `body.persona` is undefined.

- [ ] **Step 3: Modify the route to return persona**

Replace the contents of `src/app/api/careers/[onetId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerRecommendations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getPersona } from '@/lib/personas'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ onetId: string }> },
) {
  try {
    const { onetId } = await params

    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = session.user

    const rows = await db.select().from(careerRecommendations)
      .where(and(
        eq(careerRecommendations.userId, user.id),
        eq(careerRecommendations.onetId, onetId),
      ))
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Career not found' }, { status: 404 })
    }

    const row = rows[0]
    const persona = getPersona(onetId)

    return NextResponse.json({
      career: {
        title: row.title,
        description: row.description,
        onetId: row.onetId,
        whyItMatches: row.whyItMatches,
        jobGrowth: row.jobGrowth,
        salaryRange: row.salaryRange,
      },
      persona,
    })
  }
  catch (error) {
    console.error('[api/careers/[onetId]] GET failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test src/app/api/careers/[onetId]/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/careers/[onetId]/
git commit -m "feat(personas): include persona in careers API response"
```

---

## Task 3: Chat prompt composition helper

**Files:**
- Create: `src/lib/careers/chat-prompt.ts`
- Create: `src/lib/careers/__tests__/chat-prompt.test.ts`

- [ ] **Step 1: Write the failing prompt-composition test**

Create `src/lib/careers/__tests__/chat-prompt.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { composeSystemPrompt } from '../chat-prompt'
import type { Persona } from '@/lib/personas/types'

const career = {
  title: 'Registered Nurse',
  description: 'Care for patients.',
  onetId: '29-1141.00',
  whyItMatches: 'Matches interest in helping.',
  jobGrowth: '+6% over 10 years',
  salaryRange: '$70k–$105k',
}

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
  educationPath: 'Associate of Nursing.',
  pathToCurrentPosition: 'Grew up wanting to help.',
  dayInTheLife: 'Triage and charting.',
  hobby: 'Hiking on weekends.',
  imagePrompt: 'prompt',
  generatedAt: '2026-04-18T00:00:00.000Z',
  textModel: 'gpt-5',
  imageModel: 'gpt-image-1',
}

describe('composeSystemPrompt', () => {
  it('without persona, returns a generic career-counselor prompt', () => {
    const prompt = composeSystemPrompt({ career, persona: null })
    expect(prompt).toContain('career counselor')
    expect(prompt).toContain('Registered Nurse')
    expect(prompt).not.toMatch(/first person/i)
  })

  it('with persona, switches to first-person roleplay and injects persona + facts', () => {
    const prompt = composeSystemPrompt({ career, persona })
    expect(prompt).toContain('Maria Alvarez')
    expect(prompt).toContain('34')
    expect(prompt).toContain('first person')
    expect(prompt).toContain('Denver, CO')
    expect(prompt).toContain('$70k–$105k')
    expect(prompt).toContain('+6% over 10 years')
  })

  it('with persona, instructs not to invent numbers', () => {
    const prompt = composeSystemPrompt({ career, persona })
    expect(prompt).toMatch(/do NOT invent numbers/i)
  })

  it('with persona, handles the are-you-AI question with the honest-character rule', () => {
    const prompt = composeSystemPrompt({ career, persona })
    expect(prompt).toMatch(/character created to help/i)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm test src/lib/careers/__tests__/chat-prompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `src/lib/careers/chat-prompt.ts`:

```ts
import type { Persona } from '@/lib/personas/types'

export type CareerForPrompt = {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

export function composeSystemPrompt(input: {
  career: CareerForPrompt
  persona: Persona | null
}): string {
  const { career, persona } = input

  if (!persona) {
    return [
      `You are a helpful career counselor helping a student learn about the career: ${career.title}.`,
      '',
      'Career Details:',
      `- Title: ${career.title}`,
      `- Description: ${career.description}`,
      `- O*NET ID: ${career.onetId}`,
      `- Why it matches the student: ${career.whyItMatches}`,
      `- Job Growth: ${career.jobGrowth}`,
      `- Salary Range: ${career.salaryRange}`,
      '',
      'You should provide helpful, accurate information about this specific career including:',
      '- Day-to-day responsibilities and tasks',
      '- Required skills and qualifications',
      '- Education and training requirements',
      '- Career advancement opportunities',
      '- Work environment and conditions',
      '- Industry trends and outlook',
      '- How to get started in this field',
      '',
      'Keep your responses conversational, encouraging, and tailored to a student audience.',
    ].join('\n')
  }

  return [
    `You are ${persona.name}, a ${persona.age}-year-old ${persona.gender} working as a ${career.title}.`,
    'Speak in first person. Your character details are below — you may riff on them but stay consistent.',
    '',
    'PERSONA',
    `  Pronouns: ${persona.pronouns}`,
    `  Location: ${persona.location}`,
    `  Years in field: ${persona.yearsInField}`,
    `  Education path: ${persona.educationPath}`,
    `  How you got here: ${persona.pathToCurrentPosition}`,
    `  A typical day: ${persona.dayInTheLife}`,
    `  Hobby: ${persona.hobby}`,
    '',
    'FACTS ABOUT THE CAREER (cite verbatim when asked; do NOT invent numbers)',
    `  Description: ${career.description}`,
    `  Salary range: ${career.salaryRange}`,
    `  Job growth: ${career.jobGrowth}`,
    `  O*NET: ${career.onetId}`,
    '',
    'RULES',
    '- Tell stories and anecdotes plausibly grounded in your backstory.',
    '- For salary, growth, or formal-requirements questions, use the FACTS above.',
    '- If the user asks whether you are real or an AI, say you are a character created to help them explore this career, and that the career facts you share are grounded in real data. Then offer to keep going.',
    '- Stay in first person otherwise.',
    '- Audience is a student. Be warm, concrete, specific.',
  ].join('\n')
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test src/lib/careers/__tests__/chat-prompt.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/careers/
git commit -m "feat(personas): chat system-prompt composer with persona branch"
```

---

## Task 4: Wire chat route to use the composer

**Files:**
- Modify: `src/app/api/careers/chat/route.ts`

- [ ] **Step 1: Replace the route to use the composer and accept a persona field**

Replace contents of `src/app/api/careers/chat/route.ts`:

```ts
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { composeSystemPrompt } from '@/lib/careers/chat-prompt'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, careerContext, persona } = await req.json()

  const systemMessage = careerContext
    ? composeSystemPrompt({ career: careerContext, persona: persona ?? null })
    : 'You are a helpful career counselor assistant. Answer questions about careers and provide guidance to students.'

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemMessage,
    messages,
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm tsc --noEmit && pnpm lint src/app/api/careers/chat/`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/careers/chat/route.ts
git commit -m "feat(personas): chat route delegates system-prompt composition"
```

---

## Task 5: Persona-aware chat client

**Files:**
- Modify: `src/components/career-chat.tsx`

- [ ] **Step 1: Update the component to accept persona and customize greeting + body**

Replace `src/components/career-chat.tsx`:

```tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { Chat } from '@/components/ui/chat'
import type { CareerRecommendation } from '@/lib/schemas/career'
import type { Persona } from '@/lib/personas/types'

interface CareerChatProps {
  career: CareerRecommendation
  persona: Persona | null
}

function buildGreeting(career: CareerRecommendation, persona: Persona | null) {
  if (persona) {
    return `Hi, I'm ${persona.name} — I've been a ${career.title.toLowerCase()} for ${persona.yearsInField} years. Ask me anything about what the job is really like.`
  }
  return `Hi! I'm here to help you learn about **${career.title}**. I can answer questions about the day-to-day responsibilities, required skills, career path, education requirements, and anything else you'd like to know about this career. What would you like to know?`
}

export function CareerChat({ career, persona }: CareerChatProps) {
  const { messages, input, handleInputChange, handleSubmit, status, error, reload } = useChat({
    api: '/api/careers/chat',
    initialMessages: [
      {
        id: 'system',
        role: 'assistant',
        content: buildGreeting(career, persona),
      },
    ],
    body: {
      careerContext: {
        title: career.title,
        description: career.description,
        onetId: career.onetId,
        whyItMatches: career.whyItMatches,
        jobGrowth: career.jobGrowth,
        salaryRange: career.salaryRange,
      },
      persona,
    },
  })

  const headerTitle = persona
    ? `Chat with ${persona.name}`
    : `Chat about ${career.title}`

  return (
    <div className="bg-surface/50 border border-border rounded-2xl h-[600px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">{headerTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {persona ? `${career.title}, ${persona.yearsInField} years in` : 'Ask me anything about this career!'}
        </p>
      </div>

      {error && (
        <div className="p-4 border-b border-border" role="alert">
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <p className="text-sm font-semibold text-destructive mb-1">Chat Error</p>
            <p className="text-xs text-muted-foreground mb-2">Failed to send message. Please try again.</p>
            <button
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
Expected: no errors. (The page will now fail to compile because it doesn't pass `persona`; fixed in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src/components/career-chat.tsx
git commit -m "feat(personas): persona-aware chat greeting and body"
```

---

## Task 6: PersonaHero component

**Files:**
- Create: `src/components/persona-hero.tsx`
- Create: `src/components/__tests__/persona-hero.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/components/__tests__/persona-hero.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonaHero } from '../persona-hero'
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
  educationPath: 'Associate of Nursing.',
  pathToCurrentPosition: 'How she got here.',
  dayInTheLife: 'Typical day.',
  hobby: 'Hiking.',
  imagePrompt: '',
  generatedAt: '',
  textModel: 'gpt-5',
  imageModel: 'gpt-image-1',
}

describe('PersonaHero', () => {
  it('renders name, age, years, location, hobby, and disclaimer', () => {
    render(<PersonaHero persona={persona} careerTitle="Registered Nurse" />)
    expect(screen.getByText(/Maria Alvarez/)).toBeInTheDocument()
    expect(screen.getByText(/Registered Nurse/)).toBeInTheDocument()
    expect(screen.getByText(/12 years/)).toBeInTheDocument()
    expect(screen.getByText(/Denver, CO/)).toBeInTheDocument()
    expect(screen.getByText(/Hiking/)).toBeInTheDocument()
    expect(screen.getByText(/Fictional character/i)).toBeInTheDocument()
  })

  it('uses the onetId to build the portrait src', () => {
    render(<PersonaHero persona={persona} careerTitle="Registered Nurse" />)
    const img = screen.getByAltText(/Maria Alvarez/) as HTMLImageElement
    expect(img.src).toMatch(/\/careers\/personas\/29-1141\.00\.webp/)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm test src/components/__tests__/persona-hero.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/persona-hero.tsx`:

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
          <h2 className="font-serif text-2xl text-foreground">
            {persona.name}
          </h2>
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

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test src/components/__tests__/persona-hero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/persona-hero.tsx src/components/__tests__/persona-hero.test.tsx
git commit -m "feat(personas): PersonaHero component"
```

---

## Task 7: Integrate hero + persona into career detail page

**Files:**
- Modify: `src/app/careers/[onetId]/page.tsx`

- [ ] **Step 1: Replace the page to store and pass persona**

Replace contents of `src/app/careers/[onetId]/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { containerClassName } from '../../_styles/classes'
import { CareerChat } from '@/components/career-chat'
import { CareerDetails } from '@/components/career-details'
import { PersonaHero } from '@/components/persona-hero'
import { CareerDetailSkeleton, CareerChatSkeleton } from '@/components/skeletons/CareerDetailSkeleton'
import type { Persona } from '@/lib/personas/types'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

export default function CareerChatPage() {
  const params = useParams()
  const onetId = params.onetId as string
  const [career, setCareer] = useState<Career | null>(null)
  const [persona, setPersona] = useState<Persona | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCareerDetails = async () => {
      try {
        const response = await fetch(`/api/careers/${onetId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch career details')
        }
        const data = await response.json()
        setCareer(data.career)
        setPersona(data.persona ?? null)
      }
      catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
      finally {
        setLoading(false)
      }
    }

    if (onetId) {
      fetchCareerDetails()
    }
  }, [onetId])

  if (loading) {
    return (
      <div className={containerClassName}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <CareerDetailSkeleton />
          </div>
          <div className="lg:col-span-2">
            <CareerChatSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (error || !career) {
    return (
      <div className={containerClassName}>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-4">Career Not Found</h1>
          <p className="text-lg text-muted-foreground mb-8">
            {error || 'We couldn\'t find the career you\'re looking for. It may have been removed or the link is incorrect.'}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/careers" className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold text-sm no-underline">
              View All Careers
            </Link>
            <Link href="/discover/preferences" className="px-6 py-2.5 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm">
              Retake Assessment
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      {persona && <PersonaHero persona={persona} careerTitle={career.title} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CareerDetails career={career} />
        </div>
        <div className="lg:col-span-2">
          <CareerChat career={career} persona={persona} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass (no regressions in existing suites).

- [ ] **Step 4: Commit**

```bash
git add src/app/careers/[onetId]/page.tsx
git commit -m "feat(personas): render PersonaHero and pass persona to chat"
```

---

## Task 8: Distribution bookkeeping + demographic sampler

**Files:**
- Create: `data/personas/distribution.json`
- Create: `scripts/seed-personas/sample.ts`
- Create: `scripts/seed-personas/__tests__/sample.test.ts`

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
    // Ethnicity: equal-ish distribution across major groups
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
    // If uniformly weighted around male target (47%), we'd expect ~94 males.
    // With strong bias toward underfilled, should exceed that.
    expect(male).toBeGreaterThan(120)
  })
})
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `pnpm test scripts/seed-personas/__tests__/sample.test.ts`
Expected: FAIL — module not found.

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

/** Convert current fill to a bias-weighted distribution.
 *  Cells below target get a boost; over-filled cells get dampened.
 *  Uses a gentle exponent so one early outlier doesn't dominate. */
function biasedWeights<K extends string>(
  targets: Record<K, number>,
  counts: Record<K, number>,
  total: number,
): Record<K, number> {
  const result = {} as Record<K, number>
  for (const k of Object.keys(targets) as K[]) {
    const target = targets[k]
    const observed = total === 0 ? 0 : counts[k] / total
    // weight ∝ target * exp(2 * (target - observed))
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

- [ ] **Step 5: Run the test to confirm it passes**

Run: `pnpm test scripts/seed-personas/__tests__/sample.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 6: Commit**

```bash
git add data/personas/distribution.json scripts/seed-personas/sample.ts scripts/seed-personas/__tests__/sample.test.ts
git commit -m "feat(personas): demographic sampler with distribution bias"
```

---

## Task 9: Phase-1 ranking and curated fallback

**Files:**
- Create: `data/personas/phase1-fallback.json`
- Create: `scripts/seed-personas/ranking.ts`

- [ ] **Step 1: Create the curated fallback list**

Create `data/personas/phase1-fallback.json` with a curated ~200-entry list of common US O*NET codes. Start with this seed list (add more as needed to ensure ≥ 200 entries when merged with the DB query; full list committed by the engineer after consulting `https://www.onetonline.org/find/family`):

```json
[
  "11-1011.00", "11-9013.00", "11-9111.00", "13-1071.00", "13-1081.00",
  "13-2011.00", "13-2051.00", "15-1211.00", "15-1212.00", "15-1251.00",
  "15-1252.00", "15-1253.00", "15-1299.00", "17-2051.00", "17-2061.00",
  "17-2071.00", "17-2072.00", "17-2112.00", "17-2141.00", "17-2199.00",
  "19-1011.00", "19-1021.00", "19-1042.00", "19-2041.00", "19-3051.00",
  "21-1012.00", "21-1013.00", "21-1014.00", "21-1021.00", "21-1023.00",
  "23-1011.00", "23-2011.00", "25-1021.00", "25-1041.00", "25-1066.00",
  "25-2021.00", "25-2022.00", "25-2031.00", "25-2032.00", "25-3011.00",
  "27-1014.00", "27-1024.00", "27-1026.00", "27-2011.00", "27-2022.00",
  "27-3023.00", "27-3031.00", "27-3042.00", "27-4014.00", "27-4021.00",
  "29-1051.00", "29-1071.00", "29-1122.00", "29-1123.00", "29-1127.00",
  "29-1141.00", "29-1171.00", "29-1211.00", "29-1215.00", "29-1216.00",
  "29-1229.00", "29-2034.00", "29-2041.00", "29-2052.00", "29-2056.00",
  "29-2061.00", "29-2099.00", "31-1131.00", "31-2021.00", "31-9091.00",
  "31-9092.00", "31-9097.00", "33-1012.00", "33-2011.00", "33-3012.00",
  "33-3021.00", "33-3051.00", "33-9032.00", "35-1011.00", "35-1012.00",
  "35-2014.00", "35-3011.00", "35-3023.00", "37-2011.00", "37-3011.00",
  "39-1022.00", "39-3091.00", "39-5012.00", "39-9011.00", "39-9031.00",
  "41-1011.00", "41-2011.00", "41-2022.00", "41-2031.00", "41-3031.00",
  "41-3091.00", "41-4011.00", "41-9022.00", "43-1011.00", "43-3031.00",
  "43-4051.00", "43-4081.00", "43-4171.00", "43-5032.00", "43-5061.00",
  "43-6011.00", "43-6013.00", "43-6014.00", "43-9021.00", "43-9061.00",
  "45-2092.00", "47-1011.00", "47-2031.00", "47-2061.00", "47-2073.00",
  "47-2111.00", "47-2141.00", "47-2152.00", "47-2211.00", "47-3012.00",
  "49-3021.00", "49-3023.00", "49-9021.00", "49-9041.00", "49-9071.00",
  "51-1011.00", "51-2028.00", "51-3011.00", "51-4041.00", "51-4121.00",
  "51-9111.00", "51-9161.00", "53-1021.00", "53-3032.00", "53-3052.00",
  "53-3058.00", "53-7062.00", "53-7065.00"
]
```

If this list has fewer than 200 after dedupe, top it up with additional codes from O*NET's high-employment occupations list so that `phase1-fallback.json` contains at least 200 distinct codes. Commit the padded list.

- [ ] **Step 2: Implement the ranking module**

Create `scripts/seed-personas/ranking.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { db } from '../../src/db'
import { careerRecommendations } from '../../src/db/schema'

function readFallback(): string[] {
  const path = resolve(process.cwd(), 'data/personas/phase1-fallback.json')
  return JSON.parse(readFileSync(path, 'utf8')) as string[]
}

/**
 * Phase-1 target: return up to N O*NET codes that aren't yet in the manifest.
 * Priority: descending count of occurrences in career_recommendations;
 * top up from a curated fallback list if the DB has < N distinct codes.
 */
export async function rankPhase1(
  existingOnetIds: Set<string>,
  limit: number,
): Promise<string[]> {
  const rows = await db
    .select({
      onetId: careerRecommendations.onetId,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(careerRecommendations)
    .groupBy(careerRecommendations.onetId)
    .orderBy(sql`COUNT(*) DESC`)

  const ordered: string[] = []
  const seen = new Set<string>()
  for (const id of [...rows.map(r => r.onetId), ...readFallback()]) {
    if (seen.has(id) || existingOnetIds.has(id)) continue
    ordered.push(id)
    seen.add(id)
    if (ordered.length >= limit) break
  }
  return ordered
}

/** Phase-2: every code in the fallback list plus any DB-appearing code,
 *  minus anything already in the manifest. */
export async function rankAll(existingOnetIds: Set<string>): Promise<string[]> {
  const rows = await db
    .selectDistinct({ onetId: careerRecommendations.onetId })
    .from(careerRecommendations)

  const out: string[] = []
  const seen = new Set<string>()
  for (const id of [...rows.map(r => r.onetId), ...readFallback()]) {
    if (seen.has(id) || existingOnetIds.has(id)) continue
    out.push(id)
    seen.add(id)
  }
  return out
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add data/personas/phase1-fallback.json scripts/seed-personas/ranking.ts
git commit -m "feat(personas): phase-1 ranking and curated fallback list"
```

---

## Task 10: Persona text generator (GPT-5)

**Files:**
- Create: `scripts/seed-personas/prompts.ts`
- Create: `scripts/seed-personas/generate-text.ts`

- [ ] **Step 1: Create the prompt templates**

Create `scripts/seed-personas/prompts.ts`:

```ts
/** Locked cartoon-style prefix for portraits. Mirrors scripts/generate-item-images.ts
 *  so persona portraits visually match existing would-you-rather illustrations. */
export const IMAGE_STYLE_PREFIX = [
  'Flat-color vector illustration in a friendly modern storybook style.',
  'Thick uniform black outlines, warm cream/beige background (#f5ebdd).',
  'Muted earth-tone palette with selective blue and mustard-yellow accents.',
  'Simple geometric shapes, single centered focal subject, expressive but',
  'minimal faces. No text, no labels, no signage, no written words anywhere.',
  'Flat 2D look, no gradients, no shading beyond simple flat color.',
  'Square 1:1 composition. Portrait from chest up, centered.',
  'Subject:',
].join(' ')

/** Avoid-these-tropes list for persona text. Injected as a constraint into the
 *  GPT-5 prompt so 200+ backstories don't all sound the same. */
export const AVOID_TROPES = [
  '"always knew she/he/they wanted to"',
  '"grew up in a small town"',
  '"discovered a passion for"',
  '"helping people" as the only motivation',
  'inspirational quotes',
  'cliché mentor figures (unless specific and concrete)',
  'identical structural openers across different personas',
]

export function buildPersonaTextPrompt(args: {
  careerTitle: string
  onetId: string
  careerDescription?: string
  demographics: {
    gender: string
    ageBand: string
    age: number
    ethnicityCue: string
    yearsInField: number
  }
}): string {
  const { careerTitle, onetId, careerDescription, demographics: d } = args
  return [
    `Invent a fictional but realistic person working as a ${careerTitle} (O*NET ${onetId}).`,
    careerDescription ? `Career description: ${careerDescription}` : '',
    '',
    'Demographic constraints (hard — use exactly):',
    `- gender: ${d.gender}`,
    `- approximate age: ${d.age} (${d.ageBand})`,
    `- ethnicity cue: ${d.ethnicityCue} (for name + visual prompt; do not mention ethnicity in the bio text)`,
    `- years in field: ${d.yearsInField}`,
    '',
    'Generate these fields. Be specific and concrete — avoid generic statements.',
    '',
    '- name: first + last name consistent with the ethnicity cue.',
    '- pronouns: "she/her", "he/him", "they/them" or similar.',
    '- location: a real US city, chosen to fit the role plausibly.',
    '- educationPath: one sentence, specific schools/credentials.',
    '- pathToCurrentPosition: 2–3 sentences. How they got from education to now.',
    '- dayInTheLife: 2–3 sentences. Concrete tasks, not abstractions.',
    '- hobby: one sentence, specific. Not a category ("reading") — a specific one ("reading Brandon Sanderson novels on weekends").',
    '',
    'AVOID these tropes (do not use any of them):',
    ...AVOID_TROPES.map(t => `- ${t}`),
    '',
    'Be varied across personas. If many personas are being generated in a batch, each must read distinctly.',
  ].filter(Boolean).join('\n')
}

export function buildImagePrompt(args: {
  name: string
  age: number
  gender: string
  ethnicityCue: string
  careerTitle: string
}): string {
  const { name, age, gender, ethnicityCue, careerTitle } = args
  return `${IMAGE_STYLE_PREFIX} A ${age}-year-old ${ethnicityCue} ${gender} who works as a ${careerTitle}. Show wardrobe and one small prop appropriate to the job. Friendly neutral expression. No text, no captions, no labels anywhere.`
}
```

- [ ] **Step 2: Implement the text generator**

Create `scripts/seed-personas/generate-text.ts`:

```ts
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { Sample } from './sample'
import { buildPersonaTextPrompt } from './prompts'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const PersonaTextSchema = z.object({
  name: z.string().min(2).max(60),
  pronouns: z.string().min(2).max(40),
  location: z.string().min(3).max(60),
  educationPath: z.string().min(10).max(400),
  pathToCurrentPosition: z.string().min(20).max(800),
  dayInTheLife: z.string().min(20).max(600),
  hobby: z.string().min(5).max(200),
})

export type PersonaText = z.infer<typeof PersonaTextSchema>

export async function generatePersonaText(args: {
  onetId: string
  careerTitle: string
  careerDescription?: string
  sample: Sample
  model?: string
}): Promise<PersonaText> {
  const model = args.model ?? 'gpt-5'
  const prompt = buildPersonaTextPrompt({
    careerTitle: args.careerTitle,
    onetId: args.onetId,
    careerDescription: args.careerDescription,
    demographics: {
      gender: args.sample.gender,
      ageBand: args.sample.ageBand,
      age: args.sample.age,
      ethnicityCue: args.sample.ethnicityCue,
      yearsInField: args.sample.yearsInField,
    },
  })

  const result = await generateObject({
    model: openai.chat(model),
    system: 'You are a careful character-design assistant. Invent realistic, specific, non-formulaic working professionals. Do not use the forbidden tropes the user lists.',
    prompt,
    schema: PersonaTextSchema,
  })

  return result.object
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-personas/prompts.ts scripts/seed-personas/generate-text.ts
git commit -m "feat(personas): GPT-5 persona text generator with trope-avoidance prompt"
```

---

## Task 11: Portrait generator

**Files:**
- Create: `scripts/seed-personas/generate-image.ts`

- [ ] **Step 1: Implement the image generator**

Create `scripts/seed-personas/generate-image.ts`:

```ts
import OpenAI from 'openai'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { buildImagePrompt } from './prompts'
import type { Sample } from './sample'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function runCwebp(inputPath: string, outputPath: string, quality = 85): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn('cwebp', ['-quiet', '-q', String(quality), '-resize', '512', '512', inputPath, '-o', outputPath])
    p.on('error', rej)
    p.on('exit', code => (code === 0 ? res() : rej(new Error(`cwebp exited ${code}`))))
  })
}

/** Generate a portrait for a persona and write it to public/careers/personas/{onetId}.webp.
 *  Also writes the intermediate .png alongside for debugging; commit is up to the operator. */
export async function generatePortrait(args: {
  onetId: string
  careerTitle: string
  sample: Sample
  name: string
  model?: string
}): Promise<{ imagePrompt: string, imagePath: string }> {
  const model = args.model ?? 'gpt-image-1'
  const imagePrompt = buildImagePrompt({
    name: args.name,
    age: args.sample.age,
    gender: args.sample.gender,
    ethnicityCue: args.sample.ethnicityCue,
    careerTitle: args.careerTitle,
  })

  const result = await client.images.generate({
    model,
    prompt: imagePrompt,
    size: '1024x1024',
    quality: 'medium',
    n: 1,
  })

  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error(`No image returned for ${args.onetId}`)

  const personasDir = resolve(process.cwd(), 'public/careers/personas')
  const pngPath = resolve(personasDir, `${args.onetId}.png`)
  const webpPath = resolve(personasDir, `${args.onetId}.webp`)

  await writeFile(pngPath, Buffer.from(b64, 'base64'))
  await runCwebp(pngPath, webpPath, 85)

  return {
    imagePrompt,
    imagePath: `/careers/personas/${args.onetId}.webp`,
  }
}
```

- [ ] **Step 2: Create the output directory**

Run: `mkdir -p public/careers/personas`
No output expected.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-personas/generate-image.ts
git commit -m "feat(personas): portrait generator with gpt-image-1 + cwebp resize"
```

---

## Task 12: Main seed orchestrator

**Files:**
- Create: `scripts/seed-personas.ts`

- [ ] **Step 1: Implement the orchestrator**

Create `scripts/seed-personas.ts`:

```ts
/**
 * Generate personas (text + portrait) for O*NET career codes.
 *
 * Usage:
 *   pnpm tsx scripts/seed-personas.ts --limit 200   # phase 1
 *   pnpm tsx scripts/seed-personas.ts --all         # phase 2 (remaining codes)
 *   pnpm tsx scripts/seed-personas.ts --onet 29-1141.00 [--force]
 *   pnpm tsx scripts/seed-personas.ts --dry-run --limit 5
 *
 * Requires: OPENAI_API_KEY. `cwebp` must be on PATH (brew install webp).
 */

import 'dotenv-flow/config'
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { and, eq } from 'drizzle-orm'
import { db } from '../src/db'
import { careerRecommendations } from '../src/db/schema'
import type { Persona, PersonaManifest } from '../src/lib/personas/types'
import { sampleDemographics, applySample, type Distribution } from './seed-personas/sample'
import { rankPhase1, rankAll } from './seed-personas/ranking'
import { generatePersonaText } from './seed-personas/generate-text'
import { generatePortrait } from './seed-personas/generate-image'

type Args = {
  limit?: number
  all: boolean
  onet?: string
  force: boolean
  dryRun: boolean
}

function parseArgs(): Args {
  const a: Args = { all: false, force: false, dryRun: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--limit') a.limit = Number(argv[++i])
    else if (flag === '--all') a.all = true
    else if (flag === '--onet') a.onet = argv[++i]
    else if (flag === '--force') a.force = true
    else if (flag === '--dry-run') a.dryRun = true
    else throw new Error(`Unknown flag: ${flag}`)
  }
  return a
}

const MANIFEST_PATH = resolve(process.cwd(), 'data/personas/personas.json')
const DIST_PATH = resolve(process.cwd(), 'data/personas/distribution.json')

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function writeJsonAtomic(path: string, data: unknown) {
  const tmp = `${path}.tmp-${process.pid}`
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
  renameSync(tmp, path)
}

function ageBandFor(age: number): Persona['ageBand'] {
  if (age < 30) return '20s'
  if (age < 40) return '30s'
  if (age < 50) return '40s'
  return '50s_plus'
}

/** Seeded RNG (mulberry32) for reproducible runs. */
function makeRng(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

async function fetchCareerForOnet(onetId: string) {
  // One row per onet_id suffices — descriptions are effectively identical across users.
  const rows = await db.select({
    title: careerRecommendations.title,
    description: careerRecommendations.description,
  })
    .from(careerRecommendations)
    .where(eq(careerRecommendations.onetId, onetId))
    .limit(1)
  return rows[0] ?? null
}

async function generateOne(args: {
  onetId: string
  manifest: PersonaManifest
  dist: Distribution
  rng: () => number
  dryRun: boolean
}): Promise<{ manifest: PersonaManifest, dist: Distribution, wrote: boolean }> {
  const { onetId, manifest, dist, rng, dryRun } = args

  const career = await fetchCareerForOnet(onetId)
  // Title is needed. If there's no DB row, look up a static fallback title?
  // For v1 we skip personas for codes with no DB career row — top-200 always has DB rows.
  if (!career) {
    console.warn(`[${onetId}] no career row in DB; skipping`)
    return { manifest, dist, wrote: false }
  }

  const sample = sampleDemographics(dist, rng)

  if (dryRun) {
    console.log(`[${onetId}] DRY-RUN would sample`, sample)
    return { manifest, dist: applySample(dist, sample), wrote: false }
  }

  const text = await generatePersonaText({
    onetId,
    careerTitle: career.title,
    careerDescription: career.description,
    sample,
  })

  const portrait = await generatePortrait({
    onetId,
    careerTitle: career.title,
    sample,
    name: text.name,
  })

  const persona: Persona = {
    onetId,
    name: text.name,
    age: sample.age,
    gender: sample.gender,
    pronouns: text.pronouns,
    ethnicityCue: sample.ethnicityCue,
    ageBand: ageBandFor(sample.age),
    yearsInField: sample.yearsInField,
    location: text.location,
    educationPath: text.educationPath,
    pathToCurrentPosition: text.pathToCurrentPosition,
    dayInTheLife: text.dayInTheLife,
    hobby: text.hobby,
    imagePrompt: portrait.imagePrompt,
    generatedAt: new Date().toISOString(),
    textModel: 'gpt-5',
    imageModel: 'gpt-image-1',
  }

  const nextManifest = { ...manifest, [onetId]: persona }
  const nextDist = applySample(dist, sample)

  writeJsonAtomic(MANIFEST_PATH, nextManifest)
  writeJsonAtomic(DIST_PATH, nextDist)

  console.log(`[${onetId}] ✓ ${persona.name} (${persona.age}, ${persona.gender}, ${persona.ethnicityCue})`)
  return { manifest: nextManifest, dist: nextDist, wrote: true }
}

async function main() {
  const args = parseArgs()
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')

  const personasDir = resolve(process.cwd(), 'public/careers/personas')
  if (!existsSync(personasDir)) mkdirSync(personasDir, { recursive: true })

  let manifest = readJson<PersonaManifest>(MANIFEST_PATH)
  let dist = readJson<Distribution>(DIST_PATH)
  const existing = new Set(Object.keys(manifest))

  let targets: string[]
  if (args.onet) {
    targets = [args.onet]
    if (existing.has(args.onet) && !args.force) {
      console.log(`[${args.onet}] already in manifest; use --force to regenerate`)
      return
    }
    if (args.force) existing.delete(args.onet)
  }
  else if (args.all) {
    targets = await rankAll(existing)
  }
  else if (args.limit) {
    targets = await rankPhase1(existing, args.limit)
  }
  else {
    throw new Error('Provide one of --limit N, --all, or --onet <id>')
  }

  console.log(`Processing ${targets.length} O*NET code(s)...`)

  const rng = makeRng(dist.total + 1)
  let ok = 0
  let failed = 0
  for (const [i, onetId] of targets.entries()) {
    const label = `[${i + 1}/${targets.length}]`
    try {
      const before = manifest
      const result = await generateOne({ onetId, manifest, dist, rng, dryRun: args.dryRun })
      manifest = result.manifest
      dist = result.dist
      if (result.wrote || args.dryRun) ok++
      if (result.manifest === before && !args.dryRun) {
        // skipped (no DB row); not an error but not a success
      }
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${label} [${onetId}] ✗ ${msg}`)
      failed++
    }
  }

  console.log(`done: ${ok} ok, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Dry-run against a tiny slice**

Run: `pnpm tsx scripts/seed-personas.ts --dry-run --limit 3`
Expected: logs three `DRY-RUN would sample ...` lines. No files modified. No API calls made.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-personas.ts
git commit -m "feat(personas): seed-personas CLI orchestrator"
```

---

## Task 13: Smoke-test the pipeline end-to-end on a single code

**Files:**
- Generates: `public/careers/personas/29-1141.00.{png,webp}`
- Updates: `data/personas/personas.json`, `data/personas/distribution.json`

- [ ] **Step 1: Generate one real persona**

Run: `pnpm tsx scripts/seed-personas.ts --onet 29-1141.00`
Expected: logs `[29-1141.00] ✓ <name> (<age>, <gender>, <ethnicity>)`. Creates `public/careers/personas/29-1141.00.webp` + `.png`. Manifest and distribution files updated.

If the O*NET code is not present in `career_recommendations`, pick a different code from the output of:

```bash
pnpm tsx -e "import('./src/db').then(async({db})=>{const r=await db.execute(\`SELECT DISTINCT onet_id FROM career_recommendations LIMIT 5\`);console.log(r);process.exit()})"
```

- [ ] **Step 2: Eyeball the portrait**

Open `public/careers/personas/29-1141.00.webp` in Finder / Preview. Confirm:
- It renders a single illustrated figure.
- No text/labels anywhere in the image.
- Cartoon style matches the existing would-you-rather images.
- Demographics match the persona entry in `data/personas/personas.json`.

If any of these fail, regenerate with `--onet 29-1141.00 --force` and adjust prompts if the failure is systematic.

- [ ] **Step 3: Manual UI check**

Run `pnpm dev`. Navigate to `/careers/29-1141.00` (sign in if needed). Confirm:
- `<PersonaHero>` renders above the 2-col grid with the portrait and persona info.
- The disclaimer ("Meet a fictional character. Real career facts.") is visible.
- Chat greeting uses the persona name: "Hi, I'm {name} — I've been a {career} for {N} years..."
- Asking "What do you do day-to-day?" gets a first-person reply.
- Asking "What's the salary?" cites `career.salaryRange` verbatim (does not invent numbers).

Navigate to an un-seeded career (any other onetId your user has recommendations for). Confirm:
- No hero card.
- Chat greets generically ("Hi! I'm here to help you learn about X").

- [ ] **Step 4: Commit the smoke-test artifacts**

```bash
git add data/personas/personas.json data/personas/distribution.json public/careers/personas/29-1141.00.webp public/careers/personas/29-1141.00.png
git commit -m "feat(personas): smoke-test seed for 29-1141.00"
```

---

## Task 14: Run phase-1 seed (top 200)

**Files:**
- Updates: `data/personas/personas.json`, `data/personas/distribution.json`
- Generates: `public/careers/personas/*.webp` (and `.png`)

- [ ] **Step 1: Run the full phase-1 batch**

Run: `pnpm tsx scripts/seed-personas.ts --limit 200`
Expected: ~200 log lines of successful generations. Takes ~30–60 min depending on rate limits. Failures are logged with `✗`; the script continues.

If rate-limited, re-run — the script is idempotent and resumable (skips codes already in the manifest).

- [ ] **Step 2: Regenerate any obvious failures**

Spot-check 10–20 random generated personas in `data/personas/personas.json` and their portraits. For any with text baked into the image, uncanny faces, off-brand style, or formulaic bios:

```bash
pnpm tsx scripts/seed-personas.ts --onet <onetId> --force
```

- [ ] **Step 3: Confirm counts**

Run:

```bash
node -e "const m=require('./data/personas/personas.json'); console.log('total personas:', Object.keys(m).length)"
ls public/careers/personas/*.webp | wc -l
```

Both should print ≥ 200 (some codes may have been skipped for lack of DB row; net total = targets that succeeded).

- [ ] **Step 4: Commit the phase-1 artifacts**

```bash
git add data/personas/personas.json data/personas/distribution.json public/careers/personas/
git commit -m "feat(personas): phase-1 seed — top 200 O*NET codes"
```

---

## Task 15: Phase-2 overnight seed (remaining codes)

Intended to run separately — overnight, after phase 1 has shipped.

**Files:**
- Updates: `data/personas/personas.json`, `data/personas/distribution.json`
- Generates: ~800 additional portraits under `public/careers/personas/`.

- [ ] **Step 1: Verify baseline**

Run: `pnpm tsx scripts/seed-personas.ts --dry-run --all`
Expected: logs the count of remaining unseeded codes (should be ~800 after phase 1).

- [ ] **Step 2: Run the overnight batch**

Run: `pnpm tsx scripts/seed-personas.ts --all`
Expected: runs several hours. Continues past failures. Resumable on re-run.

- [ ] **Step 3: Review a sample of new personas**

Spot-check ~20 randomly selected new entries in `data/personas/personas.json` and their portraits. Regenerate obvious misses as in Task 14 Step 2.

- [ ] **Step 4: Commit the phase-2 artifacts**

```bash
git add data/personas/personas.json data/personas/distribution.json public/careers/personas/
git commit -m "feat(personas): phase-2 seed — remaining O*NET codes"
```

---

## Verification checklist

Run before merging phase 1:

- [ ] `pnpm test` — all unit + integration tests pass.
- [ ] `pnpm tsc --noEmit` — no type errors.
- [ ] `pnpm lint` — no lint errors.
- [ ] `pnpm build` — production build succeeds.
- [ ] Manual: open 3+ seeded career pages (different O*NET codes) and confirm the hero + chat behave as spec'd.
- [ ] Manual: open 1 un-seeded career page (an onetId not in the phase-1 set) and confirm the page looks identical to current production behavior.
- [ ] Manual: ask one of the personas "are you an AI?" and confirm the response follows the rule (acknowledges it's a character; doesn't lie).
- [ ] Manual: ask one of the personas about salary and confirm the answer cites the injected `salaryRange` verbatim.
