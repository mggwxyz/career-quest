import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { sql as dsql } from 'drizzle-orm'
import {
  laborMarketJobAvailability,
  laborMarketOccupationEstimates,
  laborMarketRegions,
  laborMarketTrainingOptions,
  onetOccupations,
} from '@/db/schema'
import { parseLocalLaborMarketCsv, validateSocMappings } from '@/lib/labor-market/ingest'

async function getDb() {
  const mod = await import('@/db')
  return mod.db
}

interface CliOptions {
  file: string
  dryRun: boolean
  allowMissingSoc: boolean
  knownOnetCodes: string[]
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    file: 'data/fixtures/local-labor-market-oews.csv',
    dryRun: false,
    allowMissingSoc: false,
    knownOnetCodes: [],
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--file') {
      opts.file = argv[i + 1] ?? opts.file
      i += 1
    }
    else if (arg === '--dry-run') {
      opts.dryRun = true
    }
    else if (arg === '--allow-missing-soc') {
      opts.allowMissingSoc = true
    }
    else if (arg === '--fixture') {
      opts.file = 'data/fixtures/local-labor-market-oews.csv'
    }
    else if (arg === '--known-onet-codes') {
      opts.knownOnetCodes = (argv[i + 1] ?? '')
        .split(',')
        .map(code => code.trim())
        .filter(Boolean)
      i += 1
    }
  }

  return opts
}

function chunks<T>(items: T[], size = 250): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function toDate(value: string | null): Date {
  if (!value) return new Date()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

async function validateAgainstOnetMirror(estimates: Array<{ socCode: string }>, allowMissingSoc: boolean) {
  const db = await getDb()
  const rows = await db.select({ code: onetOccupations.code }).from(onetOccupations)
  const validation = validateSocMappings(estimates, rows.map(r => r.code))
  if (validation.missingSocCodes.length > 0 && !allowMissingSoc) {
    throw new Error(
      `OEWS SOC codes missing from local O*NET mirror: ${validation.missingSocCodes.join(', ')}. `
      + 'Use --allow-missing-soc to import while retaining national fallbacks.',
    )
  }
  return validation
}

function validateAgainstProvidedCodes(
  estimates: Array<{ socCode: string }>,
  knownOnetCodes: string[],
  allowMissingSoc: boolean,
) {
  const validation = validateSocMappings(estimates, knownOnetCodes)
  if (validation.missingSocCodes.length > 0 && !allowMissingSoc) {
    throw new Error(
      `OEWS SOC codes missing from provided O*NET codes: ${validation.missingSocCodes.join(', ')}. `
      + 'Use --allow-missing-soc to continue.',
    )
  }
  return validation
}

async function upsertRegions(values: typeof laborMarketRegions.$inferInsert[]) {
  const db = await getDb()
  for (const batch of chunks(values)) {
    await db.insert(laborMarketRegions).values(batch)
      .onConflictDoUpdate({
        target: laborMarketRegions.id,
        set: {
          type: dsql`excluded.type`,
          name: dsql`excluded.name`,
          stateCode: dsql`excluded.state_code`,
          parentRegionId: dsql`excluded.parent_region_id`,
          blsAreaCode: dsql`excluded.bls_area_code`,
          updatedAt: dsql`now()`,
        },
      })
  }
}

async function upsertEstimates(values: typeof laborMarketOccupationEstimates.$inferInsert[]) {
  const db = await getDb()
  for (const batch of chunks(values)) {
    await db.insert(laborMarketOccupationEstimates).values(batch)
      .onConflictDoUpdate({
        target: [
          laborMarketOccupationEstimates.regionId,
          laborMarketOccupationEstimates.socCode,
          laborMarketOccupationEstimates.dataYear,
        ],
        set: {
          occupationTitle: dsql`excluded.occupation_title`,
          employment: dsql`excluded.employment`,
          employmentRseTenths: dsql`excluded.employment_rse_tenths`,
          hourlyMedianWageCents: dsql`excluded.hourly_median_wage_cents`,
          annualMedianWage: dsql`excluded.annual_median_wage`,
          hourlyMeanWageCents: dsql`excluded.hourly_mean_wage_cents`,
          annualMeanWage: dsql`excluded.annual_mean_wage`,
          source: dsql`excluded.source`,
          sourceUrl: dsql`excluded.source_url`,
          updatedAt: dsql`now()`,
        },
      })
  }
}

async function upsertTraining(values: typeof laborMarketTrainingOptions.$inferInsert[]) {
  const db = await getDb()
  for (const batch of chunks(values)) {
    await db.insert(laborMarketTrainingOptions).values(batch)
      .onConflictDoUpdate({
        target: [
          laborMarketTrainingOptions.regionId,
          laborMarketTrainingOptions.onetCode,
          laborMarketTrainingOptions.providerName,
          laborMarketTrainingOptions.programName,
        ],
        set: {
          credentialType: dsql`excluded.credential_type`,
          city: dsql`excluded.city`,
          stateCode: dsql`excluded.state_code`,
          url: dsql`excluded.url`,
          source: dsql`excluded.source`,
          updatedAt: dsql`excluded.updated_at`,
        },
      })
  }
}

async function upsertJobAvailability(values: typeof laborMarketJobAvailability.$inferInsert[]) {
  const db = await getDb()
  for (const batch of chunks(values)) {
    await db.insert(laborMarketJobAvailability).values(batch)
      .onConflictDoUpdate({
        target: [
          laborMarketJobAvailability.regionId,
          laborMarketJobAvailability.onetCode,
          laborMarketJobAvailability.source,
        ],
        set: {
          activePostings: dsql`excluded.active_postings`,
          annualOpenings: dsql`excluded.annual_openings`,
          sourceUrl: dsql`excluded.source_url`,
          updatedAt: dsql`excluded.updated_at`,
        },
      })
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const filePath = resolve(process.cwd(), opts.file)
  const input = await readFile(filePath, 'utf8')
  const parsed = parseLocalLaborMarketCsv(input)
  const validation = opts.knownOnetCodes.length > 0
    ? validateAgainstProvidedCodes(parsed.estimates, opts.knownOnetCodes, opts.allowMissingSoc)
    : await validateAgainstOnetMirror(parsed.estimates, opts.allowMissingSoc)

  console.log(`[labor-market] file=${opts.file}`)
  console.log(`[labor-market] regions=${parsed.regions.length} estimates=${parsed.estimates.length} training=${parsed.trainingOptions.length} jobs=${parsed.jobAvailability.length}`)
  console.log(`[labor-market] mapped SOC=${validation.mappedSocCodes.length} missing SOC=${validation.missingSocCodes.length}`)

  if (opts.dryRun) {
    console.log('[labor-market] dry run complete; no rows written')
    return
  }

  await upsertRegions(parsed.regions)
  await upsertEstimates(parsed.estimates.map(row => ({
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
  })))
  await upsertTraining(parsed.trainingOptions.map(row => ({
    regionId: row.regionId,
    onetCode: row.onetCode,
    providerName: row.providerName,
    programName: row.programName,
    credentialType: row.credentialType,
    city: row.city,
    stateCode: row.stateCode,
    url: row.url,
    source: row.source,
    updatedAt: toDate(row.updatedAt),
  })))
  await upsertJobAvailability(parsed.jobAvailability.map(row => ({
    regionId: row.regionId,
    onetCode: row.onetCode,
    activePostings: row.activePostings,
    annualOpenings: row.annualOpenings,
    source: row.source,
    sourceUrl: row.sourceUrl,
    updatedAt: toDate(row.updatedAt),
  })))

  console.log('[labor-market] import complete')
}

main().catch((error) => {
  console.error('[labor-market] import failed')
  console.error(error)
  process.exit(1)
})
