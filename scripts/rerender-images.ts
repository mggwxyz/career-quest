/**
 * Re-render persona portraits and career scenes with a new image model
 * (default gpt-image-2), REUSING each manifest entry's stored imagePrompt so the
 * ONLY thing that changes is the image model. Text, demographics, names, scene
 * descriptions are untouched — no GPT-5 spend.
 *
 * OVERWRITES production art in place:
 *   public/careers/personas/{onet}.{png,webp}   (png tracked)
 *   public/careers/scenes/{onet}.webp           (png gitignored → temp, deleted)
 * and updates each manifest entry's `imageModel`.
 *
 * Resumable & idempotent: entries already at the target model are skipped unless
 * --force, so an interrupted run resumes where it left off and failures can be
 * back-filled by re-running. All current art is committed, so a full run is
 * revertable with: git checkout -- public/careers data/personas data/careers
 *
 * Usage:
 *   pnpm tsx scripts/rerender-images.ts --dry-run                 # show plan, no spend
 *   pnpm tsx scripts/rerender-images.ts --kind persona --limit 1 # smoke (1 real image)
 *   pnpm tsx scripts/rerender-images.ts --rpm 15                  # full run (both kinds)
 *
 * Requires: OPENAI_API_KEY (dotenv-flow). `cwebp` on PATH.
 */
import 'dotenv-flow/config'
import OpenAI from 'openai'
import { readFileSync, writeFileSync, renameSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import pThrottle from 'p-throttle'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type Quality = 'low' | 'medium' | 'high'
type Kind = 'persona' | 'scene'

type Args = {
  model: string
  quality: Quality
  rpm: number
  kind: Kind | 'both'
  limit?: number
  force: boolean
  dryRun: boolean
}

function parseArgs(): Args {
  const a: Args = { model: 'gpt-image-2', quality: 'medium', rpm: 15, kind: 'both', force: false, dryRun: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i]
    if (f === '--model') a.model = argv[++i]
    else if (f === '--rpm') {
      a.rpm = Number(argv[++i])
      if (!Number.isFinite(a.rpm) || a.rpm < 1) throw new Error(`bad --rpm`)
    }
    else if (f === '--limit') a.limit = Number(argv[++i])
    else if (f === '--force') a.force = true
    else if (f === '--dry-run') a.dryRun = true
    else if (f === '--kind') {
      const k = argv[++i]
      if (k !== 'persona' && k !== 'scene' && k !== 'both') throw new Error(`bad --kind: ${k}`)
      a.kind = k
    }
    else if (f === '--quality') {
      const q = argv[++i]
      if (q !== 'low' && q !== 'medium' && q !== 'high') throw new Error(`bad --quality: ${q}`)
      a.quality = q
    }
    else throw new Error(`Unknown flag: ${f}`)
  }
  return a
}

type KindCfg = {
  kind: Kind
  manifestPath: string
  outDir: string
  size: '1024x1024' | '1536x1024'
  resize: string[]
  webpQ: number
  keepPng: boolean
}

const CONFIGS: Record<Kind, KindCfg> = {
  persona: {
    kind: 'persona',
    manifestPath: resolve(process.cwd(), 'data/personas/personas.json'),
    outDir: resolve(process.cwd(), 'public/careers/personas'),
    size: '1024x1024',
    resize: ['-resize', '512', '512'],
    webpQ: 85,
    keepPng: true, // persona pngs are tracked in git
  },
  scene: {
    kind: 'scene',
    manifestPath: resolve(process.cwd(), 'data/careers/scenes.json'),
    outDir: resolve(process.cwd(), 'public/careers/scenes'),
    size: '1536x1024',
    resize: ['-resize', '1024', '0'],
    webpQ: 82,
    keepPng: false, // scene pngs are gitignored
  },
}

function cwebp(input: string, output: string, resize: string[], quality: number): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn('cwebp', ['-quiet', '-q', String(quality), ...resize, input, '-o', output])
    p.on('error', rej)
    p.on('exit', code => (code === 0 ? res() : rej(new Error(`cwebp exited ${code}`))))
  })
}

let tmpSeq = 0
function writeJsonAtomic(path: string, data: unknown) {
  const tmp = `${path}.tmp-${process.pid}-${tmpSeq++}`
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
  renameSync(tmp, path)
}

let _pngTmp: string | null = null
function pngTmpDir(): string {
  if (_pngTmp === null) _pngTmp = mkdtempSync(join(tmpdir(), 'rerender-'))
  return _pngTmp
}

async function renderOne(cfg: KindCfg, onetId: string, prompt: string, model: string, quality: Quality) {
  const result = await client.images.generate({ model, prompt, size: cfg.size, quality, n: 1 })
  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error('no image returned')

  const pngPath = cfg.keepPng ? resolve(cfg.outDir, `${onetId}.png`) : join(pngTmpDir(), `${onetId}.png`)
  const webpPath = resolve(cfg.outDir, `${onetId}.webp`)
  writeFileSync(pngPath, Buffer.from(b64, 'base64'))
  await cwebp(pngPath, webpPath, cfg.resize, cfg.webpQ)
  if (!cfg.keepPng) {
    try {
      unlinkSync(pngPath)
    }
    catch {
      // best-effort cleanup of the temp png
    }
  }
}

async function processKind(cfg: KindCfg, args: Args): Promise<{ ok: number, failed: number, skipped: number, failures: string[] }> {
  const manifest = JSON.parse(readFileSync(cfg.manifestPath, 'utf8')) as Record<string, { imagePrompt: string, imageModel: string }>
  const keys = Object.keys(manifest)
  let targets = args.force ? keys : keys.filter(k => manifest[k].imageModel !== args.model)
  const skipped = keys.length - targets.length
  if (typeof args.limit === 'number') targets = targets.slice(0, args.limit)

  console.log(`[${cfg.kind}] ${keys.length} total | ${targets.length} to render | ${skipped} already at ${args.model}${args.dryRun ? ' (dry-run)' : ''}`)
  if (args.dryRun || targets.length === 0) return { ok: 0, failed: 0, skipped, failures: [] }

  // Synchronous commit: no await between mutate and atomic write, so the
  // single-threaded event loop can't interleave concurrent commits.
  function commit(onetId: string) {
    manifest[onetId].imageModel = args.model
    writeJsonAtomic(cfg.manifestPath, manifest)
  }

  const throttle = pThrottle({ limit: args.rpm, interval: 60_000 })
  const run = throttle((onetId: string) => renderOne(cfg, onetId, manifest[onetId].imagePrompt, args.model, args.quality))

  const total = targets.length
  let done = 0
  let ok = 0
  let failed = 0
  const failures: string[] = []

  await Promise.allSettled(targets.map(onetId =>
    run(onetId)
      .then(() => {
        done++
        ok++
        commit(onetId)
        console.log(`[${cfg.kind} ${done}/${total}] ${onetId} ✓`)
      })
      .catch((err) => {
        done++
        failed++
        failures.push(onetId)
        console.error(`[${cfg.kind} ${done}/${total}] ${onetId} ✗ ${err instanceof Error ? err.message : String(err)}`)
      }),
  ))
  return { ok, failed, skipped, failures }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
  const args = parseArgs()
  const kinds: Kind[] = args.kind === 'both' ? ['persona', 'scene'] : [args.kind]

  console.log(`Re-render → model=${args.model} quality=${args.quality} rpm=${args.rpm} kinds=${kinds.join('+')}\n`)

  let totalOk = 0
  let totalFailed = 0
  const allFailures: Record<string, string[]> = {}
  try {
    for (const k of kinds) {
      const r = await processKind(CONFIGS[k], args)
      totalOk += r.ok
      totalFailed += r.failed
      if (r.failures.length) allFailures[k] = r.failures
    }
  }
  finally {
    if (_pngTmp) rmSync(_pngTmp, { recursive: true, force: true })
  }

  console.log(`\n=== done: ${totalOk} rendered, ${totalFailed} failed ===`)
  if (totalFailed > 0) {
    console.log('Failures (re-run the same command to back-fill — done entries are skipped):')
    for (const [k, ids] of Object.entries(allFailures)) console.log(`  ${k}: ${ids.join(' ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
