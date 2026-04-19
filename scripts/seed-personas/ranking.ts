import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { db } from '../../src/db'
import { careerRecommendations } from '../../src/db/schema'

function readFallback(): string[] {
  const path = resolve(process.cwd(), 'data/personas/phase1-fallback.json')
  return JSON.parse(readFileSync(path, 'utf8')) as string[]
}

/**
 * Phase-1 target: return up to N O*NET codes that aren't yet in the manifest.
 * Priority: descending count of occurrences in career_recommendations;
 * top up from a curated fallback list if the DB has < N distinct codes.
 */
export async function rankPhase1(
  existingOnetIds: Set<string>,
  limit: number,
): Promise<string[]> {
  const rows = await db
    .select({
      onetId: careerRecommendations.onetId,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(careerRecommendations)
    .groupBy(careerRecommendations.onetId)
    .orderBy(sql`COUNT(*) DESC`)

  const ordered: string[] = []
  const seen = new Set<string>()
  for (const id of [...rows.map(r => r.onetId), ...readFallback()]) {
    if (seen.has(id) || existingOnetIds.has(id)) continue
    ordered.push(id)
    seen.add(id)
    if (ordered.length >= limit) break
  }
  return ordered
}

/** Phase-2: every code in the fallback list plus any DB-appearing code,
 *  minus anything already in the manifest. */
export async function rankAll(existingOnetIds: Set<string>): Promise<string[]> {
  const rows = await db
    .selectDistinct({ onetId: careerRecommendations.onetId })
    .from(careerRecommendations)

  const out: string[] = []
  const seen = new Set<string>()
  for (const id of [...rows.map(r => r.onetId), ...readFallback()]) {
    if (seen.has(id) || existingOnetIds.has(id)) continue
    out.push(id)
    seen.add(id)
  }
  return out
}
