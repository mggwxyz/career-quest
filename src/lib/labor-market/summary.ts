import 'server-only'

import { and, inArray } from 'drizzle-orm'
import { db } from '@/db'
import {
  laborMarketJobAvailability,
  laborMarketOccupationEstimates,
  laborMarketTrainingOptions,
  onetOccupations,
} from '@/db/schema'
import type { OccupationRow } from '@/lib/onet/occupations'
import { getLaborMarketRegions, getUserLaborMarketRegion } from './regions'
import { buildLaborMarketSummary, buildRegionFallbackChain, onetCodeToSocCode } from './resolve'
import type {
  LaborMarketEstimate,
  LaborMarketJobAvailability,
  LaborMarketRegion,
  LaborMarketSummary,
  LaborMarketTrainingOption,
} from './types'

function estimateFromRow(row: typeof laborMarketOccupationEstimates.$inferSelect): LaborMarketEstimate {
  return {
    regionId: row.regionId,
    socCode: row.socCode,
    occupationTitle: row.occupationTitle,
    dataYear: row.dataYear,
    employment: row.employment,
    employmentRseTenths: row.employmentRseTenths,
    hourlyMedianWageCents: row.hourlyMedianWageCents,
    annualMedianWage: row.annualMedianWage,
    hourlyMeanWageCents: row.hourlyMeanWageCents,
    annualMeanWage: row.annualMeanWage,
    source: row.source,
    sourceUrl: row.sourceUrl,
  }
}

function trainingFromRow(row: typeof laborMarketTrainingOptions.$inferSelect): LaborMarketTrainingOption {
  return {
    regionId: row.regionId,
    onetCode: row.onetCode,
    providerName: row.providerName,
    programName: row.programName,
    credentialType: row.credentialType,
    city: row.city,
    stateCode: row.stateCode,
    url: row.url,
    source: row.source,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }
}

function jobAvailabilityFromRow(row: typeof laborMarketJobAvailability.$inferSelect): LaborMarketJobAvailability {
  return {
    regionId: row.regionId,
    onetCode: row.onetCode,
    activePostings: row.activePostings,
    annualOpenings: row.annualOpenings,
    source: row.source,
    sourceUrl: row.sourceUrl,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }
}

async function getOccupationFallbacks(
  onetCodes: string[],
  provided?: Map<string, OccupationRow>,
): Promise<Map<string, OccupationRow>> {
  if (provided) return provided
  if (onetCodes.length === 0) return new Map()
  const rows = await db.select().from(onetOccupations)
    .where(inArray(onetOccupations.code, onetCodes))
  return new Map(rows.map(row => [row.code, row as OccupationRow]))
}

function byOnetCode<T extends { onetCode: string }>(rows: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const row of rows) {
    const list = out.get(row.onetCode) ?? []
    list.push(row)
    out.set(row.onetCode, list)
  }
  return out
}

export async function getLaborMarketContextForUser(userId: string): Promise<{
  selectedRegion: LaborMarketRegion
  regions: LaborMarketRegion[]
}> {
  const [selectedRegion, regions] = await Promise.all([
    getUserLaborMarketRegion(userId),
    getLaborMarketRegions(),
  ])
  return { selectedRegion, regions }
}

export async function getLaborMarketSummariesForOnetCodes(
  onetCodes: string[],
  userId: string,
  occupationFallbacks?: Map<string, OccupationRow>,
): Promise<Map<string, LaborMarketSummary>> {
  const uniqueOnetCodes = [...new Set(onetCodes.filter(Boolean))]
  const { selectedRegion, regions } = await getLaborMarketContextForUser(userId)
  const regionsById = new Map(regions.map(region => [region.id, region]))
  regionsById.set(selectedRegion.id, selectedRegion)

  if (uniqueOnetCodes.length === 0) return new Map()

  const regionChain = buildRegionFallbackChain(selectedRegion)
  const socCodes = [...new Set(
    uniqueOnetCodes
      .map(onetCodeToSocCode)
      .filter((socCode): socCode is string => Boolean(socCode)),
  )]
  const [estimateRows, trainingRows, jobRows, fallbacks] = await Promise.all([
    socCodes.length > 0
      ? db.select().from(laborMarketOccupationEstimates)
        .where(and(
          inArray(laborMarketOccupationEstimates.socCode, socCodes),
          inArray(laborMarketOccupationEstimates.regionId, regionChain),
        ))
      : Promise.resolve([]),
    db.select().from(laborMarketTrainingOptions)
      .where(and(
        inArray(laborMarketTrainingOptions.onetCode, uniqueOnetCodes),
        inArray(laborMarketTrainingOptions.regionId, regionChain),
      )),
    db.select().from(laborMarketJobAvailability)
      .where(and(
        inArray(laborMarketJobAvailability.onetCode, uniqueOnetCodes),
        inArray(laborMarketJobAvailability.regionId, regionChain),
      )),
    getOccupationFallbacks(uniqueOnetCodes, occupationFallbacks),
  ])

  const estimates = estimateRows.map(estimateFromRow)
  const trainingByCode = byOnetCode(trainingRows.map(trainingFromRow))
  const jobsByCode = byOnetCode(jobRows.map(jobAvailabilityFromRow))
  const summaries = new Map<string, LaborMarketSummary>()

  for (const onetCode of uniqueOnetCodes) {
    summaries.set(onetCode, buildLaborMarketSummary({
      onetCode,
      selectedRegion,
      regionsById,
      estimates,
      trainingOptions: trainingByCode.get(onetCode) ?? [],
      jobAvailability: jobsByCode.get(onetCode) ?? [],
      occupationFallback: fallbacks.get(onetCode) ?? null,
    }))
  }

  return summaries
}

export async function getLaborMarketSummaryForOccupation(
  occupation: OccupationRow,
  userId: string,
): Promise<LaborMarketSummary> {
  const summaries = await getLaborMarketSummariesForOnetCodes(
    [occupation.code],
    userId,
    new Map([[occupation.code, occupation]]),
  )
  return summaries.get(occupation.code)!
}
