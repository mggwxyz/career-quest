import 'server-only'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { and, asc, count, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm'
import type { OccupationRow } from './occupations'

export interface SearchFilters {
  q?: string
  // riasec: one or more of R,I,A,S,E,C
  riasec?: string[]
  // zone: one or more of 1..5
  zone?: number[]
  bright?: boolean
  // page: 1-based
  page?: number
}

export interface SearchResult {
  rows: OccupationRow[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 30

export async function searchOccupations(filters: SearchFilters): Promise<SearchResult> {
  const conditions: SQL[] = []

  if (filters.q && filters.q.trim().length > 0) {
    conditions.push(ilike(onetOccupations.title, `%${filters.q.trim()}%`))
  }
  if (filters.zone && filters.zone.length > 0) {
    conditions.push(inArray(onetOccupations.jobZone, filters.zone))
  }
  if (filters.bright) {
    conditions.push(eq(onetOccupations.brightOutlook, true))
  }
  if (filters.riasec && filters.riasec.length > 0) {
    // riasec_all && ARRAY['S','I']::text[] -> true if any overlap
    const arrayLiteral = sql`ARRAY[${sql.join(filters.riasec.map(c => sql`${c}`), sql`, `)}]::text[]`
    conditions.push(sql`${onetOccupations.riasecAll} && ${arrayLiteral}`)
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const page = Math.max(1, filters.page ?? 1)
  const offset = (page - 1) * PAGE_SIZE

  const [rows, [{ value: total }]] = await Promise.all([
    db.select().from(onetOccupations)
      .where(where)
      .orderBy(asc(onetOccupations.title))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(onetOccupations)
      .where(where),
  ])

  return { rows, total, page, pageSize: PAGE_SIZE }
}
