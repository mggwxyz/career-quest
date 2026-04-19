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
import { eq } from 'drizzle-orm'
import { db } from '../src/db'
import { onetOccupations } from '../src/db/schema'
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
  // Inline the query — getOccupationByCode lives behind 'server-only' which
  // refuses to load from a tsx script context.
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

async function generateOne(args: {
  onetId: string
  manifest: PersonaManifest
  dist: Distribution
  rng: () => number
  dryRun: boolean
}): Promise<{ manifest: PersonaManifest, dist: Distribution, wrote: boolean }> {
  const { onetId, manifest, dist, rng, dryRun } = args

  const career = await fetchCareerForOnet(onetId)
  if (!career) {
    console.warn(`[${onetId}] no occupation row in O*NET mirror; skipping`)
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
