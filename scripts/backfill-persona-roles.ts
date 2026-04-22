#!/usr/bin/env tsx
/**
 * Backfill the `role` field on existing personas in data/personas/personas.json.
 *
 * Each persona gets a singular, natural first-person job label chosen by
 * gpt-4o-mini given the career title and the persona's path/day text. Writes
 * in place, idempotent: rerun to fill gaps.
 *
 *   pnpm tsx scripts/backfill-persona-roles.ts
 *   pnpm tsx scripts/backfill-persona-roles.ts --limit=5      # smoke test
 *   pnpm tsx scripts/backfill-persona-roles.ts --force        # regenerate all
 *   pnpm tsx scripts/backfill-persona-roles.ts --onet 27-1014.00
 */
import 'dotenv-flow/config'
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../src/db'
import { onetOccupations } from '../src/db/schema'
import type { Persona, PersonaManifest } from '../src/lib/personas/types'

const MODEL_ID = 'gpt-4o-mini'
const CONCURRENCY = 5
const MAX_RETRIES = 4
const MANIFEST_PATH = resolve(process.cwd(), 'data/personas/personas.json')

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const RoleSchema = z.object({
  role: z.string().min(2)
    .max(60)
    .describe('Singular, natural job label in Title Case, e.g. "Special Effects Artist". Must fit "I\'m a ___.". Never the plural career title.'),
})

function parseArgs(argv: string[]) {
  let limit: number | null = null
  let force = false
  let onet: string | null = null
  for (let i = 0; i < argv.slice(2).length; i++) {
    const a = argv.slice(2)[i]
    const m = /^--limit=(\d+)$/.exec(a)
    if (m) limit = Number(m[1])
    else if (a === '--force') force = true
    else if (a === '--onet') onet = argv.slice(2)[++i]
  }
  return { limit, force, onet }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function writeJsonAtomic(path: string, data: unknown) {
  const tmp = `${path}.tmp-${process.pid}`
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
  renameSync(tmp, path)
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function generateRole(args: {
  onetId: string
  careerTitle: string
  persona: Persona
}): Promise<string> {
  const { careerTitle, persona } = args
  const prompt = [
    `O*NET career title: ${careerTitle}`,
    `Persona name: ${persona.name}`,
    `Years in field: ${persona.yearsInField}`,
    `Education path: ${persona.educationPath}`,
    `How they got here: ${persona.pathToCurrentPosition}`,
    `A typical day: ${persona.dayInTheLife}`,
    '',
    'Pick the singular, natural job label this person would use for themselves in first person.',
    'Must fit the sentence: "I\'m a ___."',
    'Rules:',
    '- Title Case like a normal English job title (e.g., "Registered Nurse", "Software Developer").',
    '- Never return the plural career title verbatim.',
    '- If the career title lists multiple roles ("Actors and Directors", "Special Effects Artists and Animators"), choose the single one that best matches this persona\'s path/day.',
    '- Strip trailing qualifiers like "& Related Workers" or ", All Other".',
    '- Do not include years of experience, seniority, or location.',
  ].join('\n')

  let attempt = 0
  while (true) {
    attempt++
    try {
      const result = await generateObject({
        model: openai.chat(MODEL_ID),
        system: 'You normalize O*NET career titles into natural first-person job labels.',
        prompt,
        schema: RoleSchema,
      })
      return result.object.role.trim()
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const is429 = /\b429\b|rate_?limit/i.test(msg)
      if (attempt >= MAX_RETRIES) throw err
      const backoffMs = is429 ? 5_000 * attempt : 1_000 * attempt
      console.warn(`[roles] ${args.onetId} attempt ${attempt} failed: ${msg}. sleeping ${backoffMs}ms`)
      await sleep(backoffMs)
    }
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let cursor = 0
  async function next() {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()))
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
  const { limit, force, onet } = parseArgs(process.argv)

  const manifest = readJson<PersonaManifest>(MANIFEST_PATH)
  const entries = Object.values(manifest)

  let targets = entries.filter(p => force || !p.role)
  if (onet) targets = targets.filter(p => p.onetId === onet)
  if (limit != null) targets = targets.slice(0, limit)

  console.log(`[roles] ${targets.length} / ${entries.length} personas need role (force=${force})`)
  if (targets.length === 0) return

  // Fetch career titles for the codes in play (single DB round-trip).
  const codes = [...new Set(targets.map(p => p.onetId))]
  const rows = await db.select({ code: onetOccupations.code, title: onetOccupations.title })
    .from(onetOccupations)
    .where(inArray(onetOccupations.code, codes))
  const titleByCode = new Map(rows.map(r => [r.code, r.title]))

  let ok = 0
  let fail = 0
  let lastFlushAt = Date.now()
  const FLUSH_EVERY_MS = 10_000
  // Serialize manifest writes; workers only mutate the in-memory object.
  const flush = () => {
    writeJsonAtomic(MANIFEST_PATH, manifest)
  }

  await runWithConcurrency(targets, CONCURRENCY, async (persona, idx) => {
    const careerTitle = titleByCode.get(persona.onetId)
    if (!careerTitle) {
      console.warn(`[roles] ${persona.onetId}: no O*NET title in mirror; skipping`)
      fail++
      return
    }
    try {
      const role = await generateRole({ onetId: persona.onetId, careerTitle, persona })
      manifest[persona.onetId] = { ...persona, role }
      ok++
      if (ok % 25 === 0 || idx < 5) {
        console.log(`[roles] ${ok}/${targets.length} ${persona.onetId} "${careerTitle}" -> "${role}"`)
      }
      if (Date.now() - lastFlushAt > FLUSH_EVERY_MS) {
        flush()
        lastFlushAt = Date.now()
      }
    }
    catch (err) {
      fail++
      console.error(`[roles] FAILED ${persona.onetId}:`, err instanceof Error ? err.message : err)
    }
  })

  flush()
  console.log(`[roles] done: ok=${ok} fail=${fail}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
