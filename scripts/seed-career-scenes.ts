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
 *   pnpm tsx scripts/seed-career-scenes.ts --rpm 12             # parallelize at ~12 careers/min
 *   pnpm tsx scripts/seed-career-scenes.ts --onet 45-2021.00 --scene "..." --force  # hand-steer one scene
 *
 * Requires: OPENAI_API_KEY. `cwebp` must be on PATH (brew install webp).
 */

import 'dotenv-flow/config'
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import pThrottle from 'p-throttle'
import { db } from '../src/db'
import { onetOccupations } from '../src/db/schema'
import { generateSceneText } from './seed-career-scenes/generate-scene-text'
import { generateSceneImage, IMAGE_MODEL, type Quality } from './seed-career-scenes/generate-image'

type CareerScene = {
  onetId: string
  careerTitle: string
  sceneDescription: string
  imagePrompt: string
  imagePath: string
  generatedAt: string
  textModel: string
  imageModel: string
}

type SceneManifest = Record<string, CareerScene>

const DEFAULT_RPM = 8

type Args = {
  limit?: number
  onet?: string
  force: boolean
  dryRun: boolean
  quality: Quality
  rpm: number
  scene?: string
}

function parseArgs(): Args {
  const a: Args = { force: false, dryRun: false, quality: 'medium', rpm: DEFAULT_RPM }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--limit') a.limit = Number(argv[++i])
    else if (flag === '--onet') a.onet = argv[++i]
    else if (flag === '--force') a.force = true
    else if (flag === '--dry-run') a.dryRun = true
    else if (flag === '--scene') a.scene = argv[++i]
    else if (flag === '--rpm') {
      a.rpm = Number(argv[++i])
      if (!Number.isFinite(a.rpm) || a.rpm < 1) throw new Error(`Invalid --rpm: ${a.rpm} (expected a positive number)`)
    }
    else if (flag === '--quality') {
      const q = argv[++i]
      if (q !== 'low' && q !== 'medium' && q !== 'high') {
        throw new Error(`Invalid --quality: ${q} (expected low|medium|high)`)
      }
      a.quality = q
    }
    else throw new Error(`Unknown flag: ${flag}`)
  }
  if (a.scene !== undefined && !a.onet) throw new Error('--scene requires --onet')
  return a
}

const MANIFEST_PATH = resolve(process.cwd(), 'data/careers/scenes.json')

function readManifest(): SceneManifest {
  if (!existsSync(MANIFEST_PATH)) return {}
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as SceneManifest
}

let tmpSeq = 0
function writeJsonAtomic(path: string, data: unknown) {
  const tmp = `${path}.tmp-${process.pid}-${tmpSeq++}`
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

type SceneOutcome =
  | { status: 'wrote', record: CareerScene }
  | { status: 'dry' }
  | { status: 'skipped' }

async function generateScene(args: {
  onetId: string
  dryRun: boolean
  quality: Quality
  scene?: string
}): Promise<SceneOutcome> {
  const { onetId, dryRun, quality } = args

  const career = await fetchCareer(onetId)
  if (!career) {
    console.warn(`[${onetId}] no occupation row in O*NET mirror; skipping`)
    return { status: 'skipped' }
  }

  // An operator-supplied scene overrides GPT text generation — useful when the
  // auto-generated scene keeps tripping the image safety filter.
  const sceneText = args.scene ?? (await generateSceneText({
    onetId,
    careerTitle: career.title,
    careerDescription: career.description || undefined,
  })).scene

  if (dryRun) {
    console.log(`[${onetId}] DRY-RUN ${career.title}: ${sceneText}`)
    return { status: 'dry' }
  }

  const image = await generateSceneImage({ onetId, scene: sceneText, quality })

  const record: CareerScene = {
    onetId,
    careerTitle: career.title,
    sceneDescription: sceneText,
    imagePrompt: image.imagePrompt,
    imagePath: image.imagePath,
    generatedAt: new Date().toISOString(),
    textModel: args.scene ? 'operator-override' : 'gpt-5',
    imageModel: IMAGE_MODEL,
  }

  return { status: 'wrote', record }
}

async function main() {
  const args = parseArgs()
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')

  const scenesDir = resolve(process.cwd(), 'public/careers/scenes')
  if (!existsSync(scenesDir)) mkdirSync(scenesDir, { recursive: true })
  const dataDir = resolve(process.cwd(), 'data/careers')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

  const manifest = readManifest()
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

  console.log(`Processing ${targets.length} O*NET code(s) at ${args.rpm}/min${args.dryRun ? ' (dry-run)' : ''}...`)

  // Shared manifest mutated only inside this synchronous commit: with no await
  // between the mutation and the atomic write, the single-threaded event loop
  // runs each commit to completion, so concurrent tasks can't lose updates.
  function commit(record: CareerScene) {
    manifest[record.onetId] = record
    writeJsonAtomic(MANIFEST_PATH, manifest)
  }

  const throttle = pThrottle({ limit: args.rpm, interval: 60_000 })
  const run = throttle(generateScene)

  const total = targets.length
  let done = 0
  let ok = 0
  let failed = 0

  await Promise.allSettled(targets.map(onetId =>
    run({ onetId, dryRun: args.dryRun, quality: args.quality, scene: args.scene })
      .then((outcome) => {
        done++
        if (outcome.status === 'wrote') {
          commit(outcome.record)
          ok++
          console.log(`[${done}/${total}] [${onetId}] ✓ ${outcome.record.careerTitle}`)
        }
        else if (outcome.status === 'dry') {
          ok++
        }
      })
      .catch((err) => {
        done++
        failed++
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[${done}/${total}] [${onetId}] ✗ ${msg}`)
      }),
  ))

  console.log(`done: ${ok} ok, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
