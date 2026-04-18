import 'server-only'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { onetFetch } from './client'
import { MnmCareerSchema, type MnmCareer } from './schemas'

export interface OccupationRow {
  code: string
  slug: string
  title: string
  description: string | null
  jobZone: number
  brightOutlook: boolean
  riasecPrimary: string | null
  riasecAll: string[]
}

export async function resolveSlug(slug: string): Promise<OccupationRow | null> {
  const rows = await db.select().from(onetOccupations)
    .where(eq(onetOccupations.slug, slug))
    .limit(1)
  return rows[0] ?? null
}

export async function getOccupationByCode(code: string): Promise<OccupationRow | null> {
  const rows = await db.select().from(onetOccupations)
    .where(eq(onetOccupations.code, code))
    .limit(1)
  return rows[0] ?? null
}

export async function getCareerDetail(code: string): Promise<MnmCareer> {
  const data = await onetFetch<unknown>(`/ws/mnm/careers/${code}/`)
  return MnmCareerSchema.parse(data)
}
