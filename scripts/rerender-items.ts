/**
 * Re-render the "would you rather" option images with a new image model
 * (default gpt-image-2), REUSING each option's stored prompt + the locked
 * STYLE_PREFIX so only the image model changes.
 *
 * Targets the 156 images referenced by src/app/_data/items.ts (ignores the
 * ~60 orphaned files no longer referenced). Overwrites both the tracked .png
 * and .webp in place (png is the source, webp is what the app serves).
 *
 * Resumable via a sidecar (data/would-you-rather/rerender-state.json): ids
 * already rendered at the target model are skipped unless --force. All current
 * art is committed, so revert with:
 *   git checkout -- public/would-you-rather/images
 *
 * Usage:
 *   pnpm tsx scripts/rerender-items.ts --dry-run
 *   pnpm tsx scripts/rerender-items.ts --limit 1     # smoke (1 real image)
 *   pnpm tsx scripts/rerender-items.ts --rpm 15      # full run
 *
 * Requires: OPENAI_API_KEY (dotenv-flow). `cwebp` on PATH.
 */
import 'dotenv-flow/config'
import OpenAI from 'openai'
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { spawn } from 'node:child_process'
import pThrottle from 'p-throttle'
import { items } from '../src/app/_data/items'

// Locked prefix — copied verbatim from scripts/generate-item-images.ts so the
// re-render uses the exact same prompt construction as the original art.
const STYLE_PREFIX = [
  'Flat-color vector illustration in a friendly modern storybook style.',
  'Thick uniform black outlines, warm cream/beige background (#f5ebdd).',
  'Muted earth-tone palette with selective blue and mustard-yellow accents.',
  'Simple geometric shapes, single centered focal subject, expressive but',
  'minimal faces. No text, no logos, no watermark. Flat 2D look, no gradients,',
  'no shading beyond simple flat color. Square 1:1 composition.',
  'Subject:',
].join(' ')

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type Quality = 'low' | 'medium' | 'high'
type Args = { model: string, quality: Quality, rpm: number, limit?: number, ids?: string[], force: boolean, dryRun: boolean }

function parseArgs(): Args {
  const a: Args = { model: 'gpt-image-2', quality: 'medium', rpm: 15, force: false, dryRun: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i]
    if (f === '--model') a.model = argv[++i]
    else if (f === '--rpm') {
      a.rpm = Number(argv[++i])
      if (!Number.isFinite(a.rpm) || a.rpm < 1) throw new Error('bad --rpm')
    }
    else if (f === '--limit') a.limit = Number(argv[++i])
    else if (f === '--ids') a.ids = argv[++i].split(',').map(s => s.trim())
      .filter(Boolean)
    else if (f === '--force') a.force = true
    else if (f === '--dry-run') a.dryRun = true
    else if (f === '--quality') {
      const q = argv[++i]
      if (q !== 'low' && q !== 'medium' && q !== 'high') throw new Error(`bad --quality: ${q}`)
      a.quality = q
    }
    else throw new Error(`Unknown flag: ${f}`)
  }
  return a
}

const STATE_PATH = resolve(process.cwd(), 'data/would-you-rather/rerender-state.json')
type State = { model: string, done: string[] }

function readState(model: string): State {
  if (!existsSync(STATE_PATH)) return { model, done: [] }
  const s = JSON.parse(readFileSync(STATE_PATH, 'utf8')) as State
  return s.model === model ? s : { model, done: [] } // switching models resets progress
}

let tmpSeq = 0
function writeJsonAtomic(path: string, data: unknown) {
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}.tmp-${process.pid}-${tmpSeq++}`
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
  renameSync(tmp, path)
}

function cwebp(input: string, output: string, quality: number): Promise<void> {
  return new Promise((res, rej) => {
    // No resize — committed item art is full 1024x1024 webp.
    const p = spawn('cwebp', ['-quiet', '-q', String(quality), input, '-o', output])
    p.on('error', rej)
    p.on('exit', code => (code === 0 ? res() : rej(new Error(`cwebp exited ${code}`))))
  })
}

type Target = { id: string, prompt: string, webpPath: string, pngPath: string }

async function renderOne(t: Target, model: string, quality: Quality) {
  const result = await client.images.generate({ model, prompt: `${STYLE_PREFIX} ${t.prompt}`, size: '1024x1024', quality, n: 1 })
  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error('no image returned')
  writeFileSync(t.pngPath, Buffer.from(b64, 'base64'))
  await cwebp(t.pngPath, t.webpPath, 80)
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
  const args = parseArgs()

  const all: Target[] = []
  for (const item of items as Array<{ option1: { id: string, prompt: string, imageUrl: string }, option2: { id: string, prompt: string, imageUrl: string } }>) {
    for (const opt of [item.option1, item.option2]) {
      const webpPath = resolve(process.cwd(), 'public', opt.imageUrl.replace(/^\//, ''))
      all.push({ id: opt.id, prompt: opt.prompt, webpPath, pngPath: webpPath.replace(/\.webp$/, '.png') })
    }
  }

  const state = readState(args.model)
  const done = new Set(args.force ? [] : state.done)
  let targets = all.filter(t => !done.has(t.id))
  if (args.ids) targets = targets.filter(t => args.ids!.includes(t.id))
  if (typeof args.limit === 'number') targets = targets.slice(0, args.limit)

  console.log(`Re-render items → model=${args.model} quality=${args.quality} rpm=${args.rpm}`)
  console.log(`${all.length} referenced | ${targets.length} to render | ${all.length - targets.length} skipped${args.dryRun ? ' (dry-run)' : ''}`)
  if (args.dryRun || targets.length === 0) return

  // Synchronous commit: mutate state + atomic write with no await between, so
  // concurrent completions can't lose each other's progress.
  function commit(id: string) {
    state.done.push(id)
    writeJsonAtomic(STATE_PATH, state)
  }

  const throttle = pThrottle({ limit: args.rpm, interval: 60_000 })
  const run = throttle((t: Target) => renderOne(t, args.model, args.quality))

  const total = targets.length
  let n = 0
  let ok = 0
  let failed = 0
  const failures: string[] = []
  await Promise.allSettled(targets.map(t =>
    run(t)
      .then(() => {
        n++
        ok++
        commit(t.id)
        console.log(`[${n}/${total}] ${t.id} ✓`)
      })
      .catch((err) => {
        n++
        failed++
        failures.push(t.id)
        console.error(`[${n}/${total}] ${t.id} ✗ ${err instanceof Error ? err.message : String(err)}`)
      }),
  ))

  console.log(`\n=== done: ${ok} rendered, ${failed} failed ===`)
  if (failed > 0) console.log(`Failures (re-run to back-fill): ${failures.join(' ')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
