import 'dotenv-flow/config'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { eq, sql as dsql } from 'drizzle-orm'
import { slugifyTitle, resolveSlugCollisions } from '@/lib/onet/slugify'

async function main() {
  const rows = await db.select({
    code: onetOccupations.code,
    slug: onetOccupations.slug,
    title: onetOccupations.title,
  }).from(onetOccupations)

  const taken = new Set<string>()
  const updates: Array<{ code: string, oldSlug: string, newSlug: string }> = []
  for (const row of rows) {
    const base = slugifyTitle(row.title)
    const next = resolveSlugCollisions(base, taken)
    taken.add(next)
    if (next !== row.slug) {
      updates.push({ code: row.code, oldSlug: row.slug, newSlug: next })
    }
  }

  console.log(`[backfill] ${updates.length} of ${rows.length} rows need a new slug`)
  if (updates.length === 0) return

  // Two-phase update to avoid unique-constraint collisions when old/new slugs overlap.
  for (const u of updates) {
    await db.update(onetOccupations)
      .set({ slug: dsql`'__tmp_' || ${onetOccupations.code}` })
      .where(eq(onetOccupations.code, u.code))
  }
  for (const u of updates) {
    await db.update(onetOccupations)
      .set({ slug: u.newSlug })
      .where(eq(onetOccupations.code, u.code))
    console.log(`  ${u.code}: ${u.oldSlug} → ${u.newSlug}`)
  }

  console.log('[backfill] done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
