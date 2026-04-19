/**
 * Generate illustrations for every option in src/app/_data/items.ts whose
 * imageUrl file does not yet exist under public/.
 *
 * Usage:
 *   pnpm tsx scripts/generate-item-images.ts            # generate all missing
 *   pnpm tsx scripts/generate-item-images.ts --limit 2  # generate up to N
 *   pnpm tsx scripts/generate-item-images.ts --ids a,b  # generate specific ids
 *   pnpm tsx scripts/generate-item-images.ts --quality high
 */

import 'dotenv-flow/config'
import { writeFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'
import OpenAI from 'openai'
import { items } from '../src/app/_data/items'

const STYLE_PREFIX = [
  'Flat-color vector illustration in a friendly modern storybook style.',
  'Thick uniform black outlines, warm cream/beige background (#f5ebdd).',
  'Muted earth-tone palette with selective blue and mustard-yellow accents.',
  'Simple geometric shapes, single centered focal subject, expressive but',
  'minimal faces. No text, no logos, no watermark. Flat 2D look, no gradients,',
  'no shading beyond simple flat color. Square 1:1 composition.',
  'Subject:',
].join(' ')

type Quality = 'low' | 'medium' | 'high'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts: { limit?: number, ids?: string[], quality: Quality } = { quality: 'medium' }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--limit') opts.limit = Number(args[++i])
    else if (a === '--ids') opts.ids = args[++i].split(',').map(s => s.trim())
      .filter(Boolean)
    else if (a === '--quality') opts.quality = args[++i] as Quality
  }
  return opts
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  }
  catch {
    return false
  }
}

async function main() {
  const { limit, ids, quality } = parseArgs()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const client = new OpenAI({ apiKey })
  const publicDir = resolve(process.cwd(), 'public')

  type Target = { id: string, prompt: string, absPath: string, relUrl: string }
  const targets: Target[] = []
  for (const item of items) {
    for (const opt of [item.option1, item.option2]) {
      const absPath = resolve(publicDir, opt.imageUrl.replace(/^\//, ''))
      if (await fileExists(absPath)) continue
      targets.push({ id: opt.id, prompt: opt.prompt, absPath, relUrl: opt.imageUrl })
    }
  }

  let work = targets
  if (ids) work = work.filter(t => ids.includes(t.id))
  if (typeof limit === 'number') work = work.slice(0, limit)

  console.log(`[gen] ${work.length} image(s) to generate (of ${targets.length} missing), quality=${quality}`)
  if (work.length === 0) return

  let ok = 0
  let failed = 0
  for (const [idx, t] of work.entries()) {
    const label = `[${idx + 1}/${work.length}] ${t.id}`
    try {
      const started = Date.now()
      const result = await client.images.generate({
        model: 'gpt-image-1',
        prompt: `${STYLE_PREFIX} ${t.prompt}`,
        size: '1024x1024',
        quality,
        n: 1,
      })
      const b64 = result.data?.[0]?.b64_json
      if (!b64) throw new Error('no b64_json in response')
      await writeFile(t.absPath, Buffer.from(b64, 'base64'))
      const secs = ((Date.now() - started) / 1000).toFixed(1)
      console.log(`${label} ✓ ${t.relUrl} (${secs}s)`)
      ok++
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${label} ✗ ${t.relUrl}: ${msg}`)
      failed++
    }
  }

  console.log(`[gen] done: ${ok} ok, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
