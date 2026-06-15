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
    else if (flag === '--quality') {
      const q = argv[++i]
      if (q !== 'low' && q !== 'medium' && q !== 'high') {
        throw new Error(`Invalid --quality: ${q} (expected low|medium|high)`)
      }
      a.quality = q
    }
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
    console.log(`[${onetId}] DRY-RUN ${career.title}: ${scene.scene}`)
    return { manifest, wrote: false }
  }

  const image = await generateSceneImage({ onetId, scene: scene.scene, quality })

  const record: CareerScene = {
    onetId,
    careerTitle: career.title,
    sceneDescription: scene.scene,
    imagePrompt: image.imagePrompt,
    imagePath: image.imagePath,
    generatedAt: new Date().toISOString(),
    textModel: 'gpt-5',
    imageModel: 'gpt-image-1',
  }

  const nextManifest = { ...manifest, [onetId]: record }
  writeJsonAtomic(MANIFEST_PATH, nextManifest)
  console.log(`[${onetId}] ✓ ${career.title}`)
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
