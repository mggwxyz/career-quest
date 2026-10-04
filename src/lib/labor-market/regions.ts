import 'server-only'

import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { laborMarketRegions, userProfiles } from '@/db/schema'
import {
  DEFAULT_LABOR_MARKET_REGION_ID,
  type LaborMarketRegion,
  type LaborMarketRegionType,
} from './types'
import { NATIONAL_LABOR_MARKET_REGION } from './resolve'

function toRegion(row: typeof laborMarketRegions.$inferSelect): LaborMarketRegion {
  return {
    id: row.id,
    type: row.type as LaborMarketRegionType,
    name: row.name,
    stateCode: row.stateCode,
    parentRegionId: row.parentRegionId,
    blsAreaCode: row.blsAreaCode,
  }
}

export async function getLaborMarketRegions(): Promise<LaborMarketRegion[]> {
  const rows = await db.select().from(laborMarketRegions)
    .orderBy(asc(laborMarketRegions.type), asc(laborMarketRegions.name))
  if (rows.length === 0) return [NATIONAL_LABOR_MARKET_REGION]
  return rows.map(toRegion)
}

export async function getUserLaborMarketRegion(userId: string): Promise<LaborMarketRegion> {
  const [profile] = await db.select({ regionId: userProfiles.laborMarketRegionId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1)

  const regionId = profile?.regionId ?? DEFAULT_LABOR_MARKET_REGION_ID
  const [region] = await db.select().from(laborMarketRegions)
    .where(eq(laborMarketRegions.id, regionId))
    .limit(1)

  return region ? toRegion(region) : NATIONAL_LABOR_MARKET_REGION
}

export async function setUserLaborMarketRegion(userId: string, regionId: string): Promise<LaborMarketRegion | null> {
  const [region] = await db.select().from(laborMarketRegions)
    .where(eq(laborMarketRegions.id, regionId))
    .limit(1)
  if (!region) return null

  await db.insert(userProfiles)
    .values({ userId, laborMarketRegionId: region.id })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        laborMarketRegionId: region.id,
        updatedAt: sql`now()`,
      },
    })

  return toRegion(region)
}
