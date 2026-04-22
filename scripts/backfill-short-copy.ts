#!/usr/bin/env tsx
/**
 * Backfill onet_occupations.short_title + short_description from the existing
 * MNM title/description via gpt-4o-mini. Idempotent: rerun to fill gaps.
 *
 *   pnpm tsx scripts/backfill-short-copy.ts
 *   pnpm tsx scripts/backfill-short-copy.ts --limit=10   # smoke test
 *   pnpm tsx scripts/backfill-short-copy.ts --force      # regenerate all rows
 */
import 'dotenv-flow/config'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { eq, isNull, or, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'

const MODEL_ID = 'gpt-4o-mini'
const LONG_TITLE_THRESHOLD = 40
const MAX_SHORT_DESC_CHARS = 160
const CONCURRENCY = 5
const MAX_RETRIES = 4

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const OutputSchema = z.object({
  shortTitle: z.string().min(1)
    .max(60)
    .nullable()
    .describe('Shorter display title for cards, preserving meaning. Null when the input title is already short enough (<= 40 chars).'),
  shortDescription: z.string().min(20)
    .max(MAX_SHORT_DESC_CHARS + 20) // allow tiny slack; we hard-trim below
    .describe('1–2 sentences, concrete, active voice, plain English. Describes what someone in this role actually does. Do not start with "Individuals who..." or "This career..."; start with a concrete verb or noun phrase.'),
})

interface Row {
  code: string
  title: string
  description: string | null
  shortTitle: string | null
  shortDescription: string | null
}

function parseArgs(argv: string[]) {
  let limit: number | null = null
  let force = false
  for (const a of argv.slice(2)) {
    const m = /^--limit=(\d+)$/.exec(a)
    if (m) limit = Number(m[1])
    if (a === '--force') force = true
  }
  return { limit, force }
}

async function selectRows(force: boolean, limit: number | null): Promise<Row[]> {
  const base = db.select({
    code: onetOccupations.code,
    title: onetOccupations.title,
    description: onetOccupations.description,
    shortTitle: onetOccupations.shortTitle,
    shortDescription: onetOccupations.shortDescription,
  }).from(onetOccupations)

  const q = force
    ? base
    : base.where(
      or(
        isNull(onetOccupations.shortDescription),
        and(
          sql`length(${onetOccupations.title}) > ${LONG_TITLE_THRESHOLD}`,
          isNull(onetOccupations.shortTitle),
        ),
      ),
    )
  const rows = limit ? await q.limit(limit) : await q
  return rows
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function generateForRow(row: Row): Promise<{ shortTitle: string | null, shortDescription: string }> {
  const needsShortTitle = row.title.length > LONG_TITLE_THRESHOLD
  const system = [
    'You rewrite O*NET career titles and descriptions for display on small career cards.',
    'Output must be neutral, concrete, and accurate — never invent new duties or audiences.',
  ].join(' ')

  const prompt = [
    `O*NET title: ${row.title}`,
    `O*NET description: ${row.description ?? '(none)'}`,
    '',
    'Produce:',
    needsShortTitle
      ? `- shortTitle: a shorter version of the title, <= ${LONG_TITLE_THRESHOLD} characters, preserving the core role. Drop trailing qualifiers like "& Related Workers" when safe. Keep common pluralization.`
      : '- shortTitle: null (the original title is already short enough).',
    `- shortDescription: 1–2 sentences, <= ${MAX_SHORT_DESC_CHARS} characters total, describing what the person actually does. Active voice, concrete verbs. Do not restate the title verbatim.`,
  ].join('\n')

  let attempt = 0
  while (true) {
    attempt++
    try {
      const result = await generateObject({
        model: openai.chat(MODEL_ID),
        system,
        prompt,
        schema: OutputSchema,
      })
      let shortTitle = result.object.shortTitle?.trim() || null
      if (!needsShortTitle) shortTitle = null
      let shortDescription = result.object.shortDescription.trim()
      if (shortDescription.length > MAX_SHORT_DESC_CHARS) {
        shortDescription = shortDescription.slice(0, MAX_SHORT_DESC_CHARS).replace(/\s+\S*$/, '') + '…'
      }
      return { shortTitle, shortDescription }
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const is429 = /\b429\b|rate_?limit/i.test(msg)
      if (attempt >= MAX_RETRIES) throw err
      const backoffMs = is429 ? 5_000 * attempt : 1_000 * attempt
      console.warn(`[backfill] ${row.code} attempt ${attempt} failed (${is429 ? '429' : 'error'}): ${msg}. sleeping ${backoffMs}ms`)
      await sleep(backoffMs)
    }
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function next() {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()))
  return results
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is required')
    process.exit(1)
  }

  const { limit, force } = parseArgs(process.argv)
  const rows = await selectRows(force, limit)
  console.log(`[backfill] ${rows.length} rows to process (force=${force}, limit=${limit ?? 'none'})`)
  if (rows.length === 0) return

  let ok = 0
  let fail = 0
  const startedAt = Date.now()

  await runWithConcurrency(rows, CONCURRENCY, async (row, idx) => {
    try {
      const gen = await generateForRow(row)
      await db.update(onetOccupations)
        .set({
          shortTitle: gen.shortTitle,
          shortDescription: gen.shortDescription,
        })
        .where(eq(onetOccupations.code, row.code))
      ok++
      if (ok % 25 === 0 || idx < 5) {
        console.log(`[backfill] ${ok}/${rows.length} ${row.code} ${row.title} -> shortTitle=${gen.shortTitle ? JSON.stringify(gen.shortTitle) : 'null'} shortDescription=${JSON.stringify(gen.shortDescription)}`)
      }
    }
    catch (err) {
      fail++
      console.error(`[backfill] FAILED ${row.code}:`, err instanceof Error ? err.message : err)
    }
  })

  const sec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`[backfill] done: ok=${ok} fail=${fail} in ${sec}s`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
