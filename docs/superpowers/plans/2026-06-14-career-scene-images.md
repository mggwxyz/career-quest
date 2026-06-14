# Career Scene Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a script that generates one candid, illustrated workplace scene (1–3 people doing the job's real tasks) per O*NET career, in the same flat-vector style as the persona portraits.

**Architecture:** Mirror the modular `scripts/seed-personas/` layout. A two-step pipeline per career: GPT-5 distills the career's title + DB description into a concrete candid scene (`generate-scene-text.ts`), then `gpt-image-1` renders it at 3:2 and `cwebp` writes a webp (`generate-image.ts`). An orchestrator (`seed-career-scenes.ts`) enumerates careers from the `onet_occupations` DB table, loops idempotently, and writes a resumable manifest at `data/careers/scenes.json`. Pure prompt-building logic lives in `prompts.ts` and is the only unit-tested unit — network/IO steps stay untested, matching the persona scripts.

**Tech Stack:** TypeScript run via `tsx`; `@ai-sdk/openai` + `ai` (`generateObject`) for GPT-5; `openai` SDK for `gpt-image-1`; Drizzle (`onet_occupations`); `cwebp` CLI; Vitest.

**Conventions for every commit in this plan:**
- Conventional-commit messages, scope `career-scenes`.
- **No `Co-Authored-By` / "co-created with Claude" trailer** (user's global rule). Commits are authored solely by the repo owner.
- Run `pnpm exec eslint --fix` on the new files before each commit (lint-staged also auto-fixes `eslint --fix` on staged `*.ts`).

**Reference files to imitate:**
- `scripts/seed-personas/prompts.ts` — `IMAGE_STYLE_PREFIX` and prompt-builder style.
- `scripts/seed-personas/generate-text.ts` — `createOpenAI` + `generateObject` + zod setup.
- `scripts/seed-personas/generate-image.ts` — OpenAI image call + `runCwebp` + atomic write.
- `scripts/seed-personas.ts` — CLI parsing, manifest read/write-atomic, per-item loop, exit codes.
- `scripts/seed-personas/__tests__/sample.test.ts` — test style.

**Code style (match the codebase; eslint will enforce):** no semicolons, single quotes, 2-space indent, trailing commas in multiline literals, chained method calls broken onto indented continuation lines (see the zod chains in `generate-text.ts`).

---

### Task 1: Prompt builders (`prompts.ts`)

Pure, deterministic string builders. This is the only TDD task.

**Files:**
- Create: `scripts/seed-career-scenes/prompts.ts`
- Test: `scripts/seed-career-scenes/__tests__/prompts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/seed-career-scenes/__tests__/prompts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CAREER_STYLE_PREFIX, buildSceneTextPrompt, buildSceneImagePrompt } from '../prompts'

describe('CAREER_STYLE_PREFIX', () => {
  it('keeps the shared persona/item visual tokens', () => {
    expect(CAREER_STYLE_PREFIX).toContain('Flat-color vector illustration')
    expect(CAREER_STYLE_PREFIX).toContain('#f5ebdd')
    expect(CAREER_STYLE_PREFIX).toContain('no gradients')
  })

  it('uses a candid 3:2 multi-person composition, not a centered portrait', () => {
    expect(CAREER_STYLE_PREFIX).toContain('3:2 landscape')
    expect(CAREER_STYLE_PREFIX).toContain('one to three people')
    expect(CAREER_STYLE_PREFIX).toContain('no one looking at the camera')
    expect(CAREER_STYLE_PREFIX).not.toContain('Portrait from chest up')
    expect(CAREER_STYLE_PREFIX).not.toContain('single centered focal subject')
  })
})

describe('buildSceneTextPrompt', () => {
  it('includes the career title, O*NET id, and description', () => {
    const p = buildSceneTextPrompt({
      careerTitle: 'Plumber',
      onetId: '47-2152.00',
      careerDescription: 'Assemble, install, and repair pipes.',
    })
    expect(p).toContain('Plumber')
    expect(p).toContain('47-2152.00')
    expect(p).toContain('Assemble, install, and repair pipes.')
  })

  it('asks for peopleCount, a candid scene, concrete tasks, and diversity', () => {
    const p = buildSceneTextPrompt({ careerTitle: 'Plumber', onetId: '47-2152.00' })
    expect(p).toContain('peopleCount')
    expect(p).toContain('scene')
    expect(p.toLowerCase()).toContain('candid')
    expect(p.toLowerCase()).toContain('diverse')
  })

  it('omits the description line when none is given', () => {
    const p = buildSceneTextPrompt({ careerTitle: 'Plumber', onetId: '47-2152.00' })
    expect(p).not.toContain('What they do:')
  })
})

describe('buildSceneImagePrompt', () => {
  it('prefixes the locked style and injects the scene', () => {
    const scene = 'Two electricians pull cable through a ceiling.'
    const p = buildSceneImagePrompt({ scene })
    expect(p.startsWith(CAREER_STYLE_PREFIX)).toBe(true)
    expect(p).toContain(scene)
  })

  it('reinforces candid framing and forbids text', () => {
    const p = buildSceneImagePrompt({ scene: 'A scene.' })
    expect(p).toContain('no one looking at the camera')
    expect(p).toContain('No text')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/seed-career-scenes/__tests__/prompts.test.ts`
Expected: FAIL — cannot resolve `'../prompts'` (module does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `scripts/seed-career-scenes/prompts.ts`:

```ts
/** Locked cartoon-style prefix for career scenes. Mirrors IMAGE_STYLE_PREFIX in
 *  scripts/seed-personas/prompts.ts so scenes visually match the persona
 *  portraits and would-you-rather items. The composition lines differ on
 *  purpose: a candid multi-person workplace scene, not a centered portrait. */
export const CAREER_STYLE_PREFIX = [
  'Flat-color vector illustration in a friendly modern storybook style.',
  'Thick uniform black outlines, warm cream/beige background (#f5ebdd).',
  'Muted earth-tone palette with selective blue and mustard-yellow accents.',
  'Simple geometric shapes, expressive but minimal faces.',
  'No text, no labels, no signage, no written words anywhere.',
  'Flat 2D look, no gradients, no shading beyond simple flat color.',
  'Wide 3:2 landscape composition showing one to three people in a workplace scene.',
  'Candid mid-action moment — no one looking at the camera, no posing.',
  'Scene:',
].join(' ')

/** Prompt for the GPT-5 step: distill a career into one concrete candid scene. */
export function buildSceneTextPrompt(args: {
  careerTitle: string
  onetId: string
  careerDescription?: string
}): string {
  const { careerTitle, onetId, careerDescription } = args
  return [
    `Describe a single candid illustration of people at work as ${careerTitle} (O*NET ${onetId}).`,
    careerDescription ? `What they do: ${careerDescription}` : '',
    '',
    'Return:',
    '- peopleCount: an integer from 1 to 3 — how many workers fit this moment naturally (some jobs are solitary, some collaborative).',
    '- scene: one concrete paragraph (2-4 sentences). Name the setting, what each person is physically doing right now, and the real tools/equipment of this job. Show actual tasks and responsibilities of the role, not abstractions.',
    '',
    'Hard requirements for the scene:',
    '- Candid: people are mid-action and absorbed in their work. No one looks at the viewer or poses.',
    '- Concrete over generic: "fitting a copper pipe under a sink with a wrench", not "doing plumbing work".',
    '- When more than one person is shown, include a natural, diverse mix (vary gender, age, and ethnicity).',
    '- No text, signs, logos, or readable writing in the described scene.',
    '- Keep it to what a single illustration can show.',
  ].filter(Boolean).join('\n')
}

/** Prompt for the image step: locked style prefix + the distilled scene. */
export function buildSceneImagePrompt(args: { scene: string }): string {
  return `${CAREER_STYLE_PREFIX} ${args.scene} Candid, no one looking at the camera. No text, no captions, no labels anywhere.`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/seed-career-scenes/__tests__/prompts.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Lint and commit**

```bash
pnpm exec eslint --fix scripts/seed-career-scenes/prompts.ts scripts/seed-career-scenes/__tests__/prompts.test.ts
git add scripts/seed-career-scenes/prompts.ts scripts/seed-career-scenes/__tests__/prompts.test.ts
git commit -m "feat(career-scenes): add prompt builders for career scene images"
```

---

### Task 2: GPT-5 scene-text generator (`generate-scene-text.ts`)

Network step — no unit test (matches `seed-personas/generate-text.ts`). Verified by typecheck + lint.

**Files:**
- Create: `scripts/seed-career-scenes/generate-scene-text.ts`

- [ ] **Step 1: Write the implementation**

Create `scripts/seed-career-scenes/generate-scene-text.ts`:

```ts
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { buildSceneTextPrompt } from './prompts'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const SceneTextSchema = z.object({
  peopleCount: z.number().int()
    .min(1)
    .max(3),
  scene: z.string().min(20)
    .max(900),
})

export type SceneText = z.infer<typeof SceneTextSchema>

export async function generateSceneText(args: {
  onetId: string
  careerTitle: string
  careerDescription?: string
  model?: string
}): Promise<SceneText> {
  const model = args.model ?? 'gpt-5'
  const prompt = buildSceneTextPrompt({
    careerTitle: args.careerTitle,
    onetId: args.onetId,
    careerDescription: args.careerDescription,
  })

  const result = await generateObject({
    model: openai.chat(model),
    system: 'You compose concrete, candid scene descriptions for flat illustration reference. Always describe people mid-task, never posing, using the real tools of the job. Be specific and varied.',
    prompt,
    schema: SceneTextSchema,
    temperature: 1,
  })

  return result.object
}
```

- [ ] **Step 2: Typecheck**

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: exits 0, no errors referencing `generate-scene-text.ts`.

- [ ] **Step 3: Lint and commit**

```bash
pnpm exec eslint --fix scripts/seed-career-scenes/generate-scene-text.ts
git add scripts/seed-career-scenes/generate-scene-text.ts
git commit -m "feat(career-scenes): add GPT scene-text generation"
```

---

### Task 3: Image generator (`generate-image.ts`)

Network/IO step — no unit test (matches `seed-personas/generate-image.ts`). Renders 3:2 and downsizes to 1024-wide webp.

**Files:**
- Create: `scripts/seed-career-scenes/generate-image.ts`

- [ ] **Step 1: Write the implementation**

Create `scripts/seed-career-scenes/generate-image.ts`:

```ts
import OpenAI from 'openai'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { buildSceneImagePrompt } from './prompts'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type Quality = 'low' | 'medium' | 'high'

function runCwebp(inputPath: string, outputPath: string, quality = 82): Promise<void> {
  return new Promise((res, rej) => {
    // -resize 1024 0 → width 1024, height auto, preserving the 3:2 aspect.
    const p = spawn('cwebp', ['-quiet', '-q', String(quality), '-resize', '1024', '0', inputPath, '-o', outputPath])
    p.on('error', rej)
    p.on('exit', code => (code === 0 ? res() : rej(new Error(`cwebp exited ${code}`))))
  })
}

/** Render a candid scene for a career and write it to
 *  public/careers/scenes/{onetId}.webp. Also writes the intermediate .png. */
export async function generateSceneImage(args: {
  onetId: string
  scene: string
  quality?: Quality
  model?: string
}): Promise<{ imagePrompt: string, imagePath: string }> {
  const model = args.model ?? 'gpt-image-1'
  const imagePrompt = buildSceneImagePrompt({ scene: args.scene })

  const result = await client.images.generate({
    model,
    prompt: imagePrompt,
    size: '1536x1024',
    quality: args.quality ?? 'medium',
    n: 1,
  })

  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error(`No image returned for ${args.onetId}`)

  const scenesDir = resolve(process.cwd(), 'public/careers/scenes')
  const pngPath = resolve(scenesDir, `${args.onetId}.png`)
  const webpPath = resolve(scenesDir, `${args.onetId}.webp`)

  await writeFile(pngPath, Buffer.from(b64, 'base64'))
  await runCwebp(pngPath, webpPath, 82)

  return {
    imagePrompt,
    imagePath: `/careers/scenes/${args.onetId}.webp`,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: exits 0, no errors referencing `generate-image.ts`.

- [ ] **Step 3: Lint and commit**

```bash
pnpm exec eslint --fix scripts/seed-career-scenes/generate-image.ts
git add scripts/seed-career-scenes/generate-image.ts
git commit -m "feat(career-scenes): add scene image generation (gpt-image-1, 3:2)"
```

---

### Task 4: Orchestrator + CLI (`seed-career-scenes.ts`)

Enumerates careers, loops idempotently, writes the manifest atomically. Mirrors `seed-personas.ts` minus the demographic sampling/ranking.

**Files:**
- Create: `scripts/seed-career-scenes.ts`

- [ ] **Step 1: Write the implementation**

Create `scripts/seed-career-scenes.ts`:

```ts
/**
 * Generate a candid workplace scene image (1-3 people doing the job's real
 * tasks) for O*NET careers, in the persona illustration style.
 *
 * Usage:
 *   pnpm tsx scripts/seed-career-scenes.ts --limit 5 --dry-run   # preview scenes (GPT only), no image spend
 *   pnpm tsx scripts/seed-career-scenes.ts --limit 20            # test batch
 *   pnpm tsx scripts/seed-career-scenes.ts --onet 29-1141.00 [--force]
 *   pnpm tsx scripts/seed-career-scenes.ts                       # all missing (default)
 *   pnpm tsx scripts/seed-career-scenes.ts --quality high
 *
 * Requires: OPENAI_API_KEY. `cwebp` must be on PATH (brew install webp).
 */

import 'dotenv-flow/config'
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '../src/db'
import { onetOccupations } from '../src/db/schema'
import { generateSceneText } from './seed-career-scenes/generate-scene-text'
import { generateSceneImage, type Quality } from './seed-career-scenes/generate-image'

type CareerScene = {
  onetId: string
  careerTitle: string
  peopleCount: number
  sceneDescription: string
  imagePrompt: string
  imagePath: string
  generatedAt: string
  textModel: string
  imageModel: string
}

type SceneManifest = Record<string, CareerScene>

type Args = {
  limit?: number
  onet?: string
  force: boolean
  dryRun: boolean
  quality: Quality
}

function parseArgs(): Args {
  const a: Args = { force: false, dryRun: false, quality: 'medium' }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--limit') a.limit = Number(argv[++i])
    else if (flag === '--onet') a.onet = argv[++i]
    else if (flag === '--force') a.force = true
    else if (flag === '--dry-run') a.dryRun = true
    else if (flag === '--quality') a.quality = argv[++i] as Quality
    else throw new Error(`Unknown flag: ${flag}`)
  }
  return a
}

const MANIFEST_PATH = resolve(process.cwd(), 'data/careers/scenes.json')

function readManifest(): SceneManifest {
  if (!existsSync(MANIFEST_PATH)) return {}
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as SceneManifest
}

function writeJsonAtomic(path: string, data: unknown) {
  const tmp = `${path}.tmp-${process.pid}`
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
  renameSync(tmp, path)
}

async function fetchCareer(onetId: string) {
  const rows = await db.select({
    title: onetOccupations.title,
    description: onetOccupations.description,
  })
    .from(onetOccupations)
    .where(eq(onetOccupations.code, onetId))
    .limit(1)
  if (rows.length === 0) return null
  return { title: rows[0].title, description: rows[0].description ?? '' }
}

async function listAllCodes(): Promise<string[]> {
  const rows = await db.select({ code: onetOccupations.code })
    .from(onetOccupations)
    .orderBy(onetOccupations.code)
  return rows.map(r => r.code)
}

async function generateOne(args: {
  onetId: string
  manifest: SceneManifest
  dryRun: boolean
  quality: Quality
}): Promise<{ manifest: SceneManifest, wrote: boolean }> {
  const { onetId, manifest, dryRun, quality } = args

  const career = await fetchCareer(onetId)
  if (!career) {
    console.warn(`[${onetId}] no occupation row in O*NET mirror; skipping`)
    return { manifest, wrote: false }
  }

  const scene = await generateSceneText({
    onetId,
    careerTitle: career.title,
    careerDescription: career.description || undefined,
  })

  if (dryRun) {
    console.log(`[${onetId}] DRY-RUN ${career.title} — ${scene.peopleCount} ppl: ${scene.scene}`)
    return { manifest, wrote: false }
  }

  const image = await generateSceneImage({ onetId, scene: scene.scene, quality })

  const record: CareerScene = {
    onetId,
    careerTitle: career.title,
    peopleCount: scene.peopleCount,
    sceneDescription: scene.scene,
    imagePrompt: image.imagePrompt,
    imagePath: image.imagePath,
    generatedAt: new Date().toISOString(),
    textModel: 'gpt-5',
    imageModel: 'gpt-image-1',
  }

  const nextManifest = { ...manifest, [onetId]: record }
  writeJsonAtomic(MANIFEST_PATH, nextManifest)
  console.log(`[${onetId}] ✓ ${career.title} (${scene.peopleCount} ppl)`)
  return { manifest: nextManifest, wrote: true }
}

async function main() {
  const args = parseArgs()
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')

  const scenesDir = resolve(process.cwd(), 'public/careers/scenes')
  if (!existsSync(scenesDir)) mkdirSync(scenesDir, { recursive: true })
  const dataDir = resolve(process.cwd(), 'data/careers')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

  let manifest = readManifest()
  const existing = new Set(Object.keys(manifest))

  let targets: string[]
  if (args.onet) {
    if (existing.has(args.onet) && !args.force) {
      console.log(`[${args.onet}] already in manifest; use --force to regenerate`)
      return
    }
    targets = [args.onet]
  }
  else {
    const all = await listAllCodes()
    targets = args.force ? all : all.filter(code => !existing.has(code))
    if (typeof args.limit === 'number') targets = targets.slice(0, args.limit)
  }

  console.log(`Processing ${targets.length} O*NET code(s)${args.dryRun ? ' (dry-run)' : ''}...`)

  let ok = 0
  let failed = 0
  for (const [i, onetId] of targets.entries()) {
    const label = `[${i + 1}/${targets.length}]`
    try {
      const result = await generateOne({ onetId, manifest, dryRun: args.dryRun, quality: args.quality })
      manifest = result.manifest
      if (result.wrote || args.dryRun) ok++
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

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 3: Lint**

Run: `pnpm exec eslint --fix scripts/seed-career-scenes.ts`
Expected: exits 0 (warnings ok, no errors).

- [ ] **Step 4: Re-run the unit tests (guard against regressions)**

Run: `pnpm exec vitest run scripts/seed-career-scenes`
Expected: PASS — the `prompts.test.ts` suite is still green.

- [ ] **Step 5: Smoke test (requires `OPENAI_API_KEY` + DB access)**

Run: `pnpm tsx scripts/seed-career-scenes.ts --limit 1 --dry-run`
Expected: prints one `[<code>] DRY-RUN <title> — N ppl: <scene paragraph>` line and `done: 1 ok, 0 failed`. No files written under `public/careers/scenes/` or `data/careers/`.

> If `OPENAI_API_KEY` or the DB is unavailable in the execution environment, skip Step 5 and note it — the typecheck + lint + unit tests in Steps 2–4 are the gating checks; the smoke test is operator verification.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-career-scenes.ts
git commit -m "feat(career-scenes): add seed-career-scenes orchestrator and CLI"
```

---

## Rollout (operator, not a code task)

Real spend (~1000 careers × 1 GPT-5 call + 1 image). Run incrementally:

1. `pnpm tsx scripts/seed-career-scenes.ts --limit 5 --dry-run` — eyeball the scene text.
2. `pnpm tsx scripts/seed-career-scenes.ts --limit 20` — inspect the 20 webps in `public/careers/scenes/`.
3. `pnpm tsx scripts/seed-career-scenes.ts` — generate the rest (resumable; re-run after any failures).

Each run writes both `{onetId}.png` and `{onetId}.webp`. As with the personas, committing the `.png` intermediates is the operator's choice — the app would reference only the `.webp`.

## Out of scope (future work)

- Wiring the scenes into the career detail page UI (`CareerDetailsHeader` / `[slug]/page.tsx`).
- A typed accessor in `src/lib` for reading `data/careers/scenes.json` from the app.
