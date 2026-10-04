import { normalizeSocCode, onetCodeToSocCode } from './resolve'
import type {
  LaborMarketEstimate,
  LaborMarketJobAvailability,
  LaborMarketRegion,
  LaborMarketRegionType,
  LaborMarketTrainingOption,
} from './types'

export interface ParsedLocalLaborMarketData {
  regions: LaborMarketRegion[]
  estimates: LaborMarketEstimate[]
  trainingOptions: LaborMarketTrainingOption[]
  jobAvailability: LaborMarketJobAvailability[]
}

export interface SocMappingValidation {
  mappedSocCodes: string[]
  missingSocCodes: string[]
}

type CsvRow = Record<string, string>

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      }
      else {
        quoted = !quoted
      }
    }
    else if (ch === ',' && !quoted) {
      cells.push(current)
      current = ''
    }
    else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

export function parseDelimitedRows(input: string): CsvRow[] {
  const lines = input.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return []
  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const headers = delimiter === '\t'
    ? lines[0].split('\t')
    : splitCsvLine(lines[0])
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase())

  return lines.slice(1).map((line) => {
    const cells = delimiter === '\t' ? line.split('\t') : splitCsvLine(line)
    const row: CsvRow = {}
    normalizedHeaders.forEach((header, i) => {
      row[header] = cells[i]?.trim() ?? ''
    })
    return row
  })
}

function first(row: CsvRow, names: string[]): string {
  for (const name of names) {
    const value = row[name.toLowerCase()]
    if (value != null && value.trim() !== '') return value.trim()
  }
  return ''
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseInteger(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || ['*', '**', '#', '##', '-', 'n/a', 'na'].includes(trimmed.toLowerCase())) {
    return null
  }
  const parsed = Number.parseInt(trimmed.replace(/[$,%\s,]/g, ''), 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseDollars(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || ['*', '**', '#', '##', '-', 'n/a', 'na'].includes(trimmed.toLowerCase())) {
    return null
  }
  const parsed = Number.parseFloat(trimmed.replace(/[$,%\s,]/g, ''))
  return Number.isNaN(parsed) ? null : Math.round(parsed)
}

function parseHourlyCents(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || ['*', '**', '#', '##', '-', 'n/a', 'na'].includes(trimmed.toLowerCase())) {
    return null
  }
  const parsed = Number.parseFloat(trimmed.replace(/[$,%\s,]/g, ''))
  return Number.isNaN(parsed) ? null : Math.round(parsed * 100)
}

function parseTenths(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || ['*', '**', '#', '##', '-', 'n/a', 'na'].includes(trimmed.toLowerCase())) {
    return null
  }
  const parsed = Number.parseFloat(trimmed.replace(/[%\s,]/g, ''))
  return Number.isNaN(parsed) ? null : Math.round(parsed * 10)
}

function normalizeRegionType(value: string, areaCode: string, areaName: string): LaborMarketRegionType {
  const raw = value.trim().toLowerCase()
  if (raw === '1' || raw.includes('national') || areaCode === '99' || areaName.toLowerCase() === 'united states') {
    return 'national'
  }
  if (raw === '2' || raw.includes('state')) return 'state'
  if (raw === '4' || raw.includes('metro')) return 'metro'
  if (raw === '5' || raw.includes('nonmetro') || raw.includes('nonmetropolitan')) return 'nonmetro'
  return areaCode.length === 2 ? 'state' : 'metro'
}

function normalizeRegion(row: CsvRow): LaborMarketRegion {
  const areaCode = first(row, ['region_id', 'area', 'area_code', 'bls_area_code'])
  const areaName = first(row, ['region_name', 'area_title', 'area_name'])
  const stateCode = first(row, ['state_code', 'prim_state', 'state'])
    .slice(0, 2)
    .toUpperCase()
  const type = normalizeRegionType(first(row, ['region_type', 'area_type']), areaCode, areaName)

  if (type === 'national') {
    return {
      id: 'US',
      type,
      name: areaName || 'United States',
      stateCode: null,
      parentRegionId: null,
      blsAreaCode: areaCode || '99',
    }
  }

  if (type === 'state') {
    const code = stateCode || areaCode.toUpperCase()
    return {
      id: `STATE:${code}`,
      type,
      name: areaName || code,
      stateCode: code,
      parentRegionId: 'US',
      blsAreaCode: areaCode || code,
    }
  }

  const prefix = type === 'nonmetro' ? 'NONMETRO' : 'METRO'
  return {
    id: `${prefix}:${areaCode}`,
    type,
    name: areaName || areaCode,
    stateCode: stateCode || null,
    parentRegionId: stateCode ? `STATE:${stateCode}` : 'US',
    blsAreaCode: areaCode,
  }
}

export function parseLocalLaborMarketCsv(input: string): ParsedLocalLaborMarketData {
  const rows = parseDelimitedRows(input)
  const regions = new Map<string, LaborMarketRegion>()
  const estimates: LaborMarketEstimate[] = []
  const trainingOptions: LaborMarketTrainingOption[] = []
  const jobAvailability: LaborMarketJobAvailability[] = []

  for (const row of rows) {
    const region = normalizeRegion(row)
    regions.set(region.id, region)

    const socCode = normalizeSocCode(first(row, ['soc_code', 'occ_code', 'occupation_code']))
    if (!socCode || socCode === '00-0000') continue

    const dataYear = parseInteger(first(row, ['data_year', 'year'])) ?? new Date().getFullYear()
    const sourceUrl = nullable(first(row, ['source_url', 'url']))
    estimates.push({
      regionId: region.id,
      socCode,
      occupationTitle: nullable(first(row, ['occupation_title', 'occ_title'])),
      dataYear,
      employment: parseInteger(first(row, ['employment', 'tot_emp', 'total_employment'])),
      employmentRseTenths: parseTenths(first(row, ['employment_rse', 'emp_prse'])),
      hourlyMedianWageCents: parseHourlyCents(first(row, ['hourly_median_wage', 'h_median'])),
      annualMedianWage: parseDollars(first(row, ['annual_median_wage', 'a_median'])),
      hourlyMeanWageCents: parseHourlyCents(first(row, ['hourly_mean_wage', 'h_mean'])),
      annualMeanWage: parseDollars(first(row, ['annual_mean_wage', 'a_mean'])),
      source: first(row, ['source']) || 'BLS OEWS',
      sourceUrl,
    })

    const onetCode = first(row, ['onet_code', 'onet_id']) || `${socCode}.00`
    const providerName = first(row, ['training_provider', 'provider_name'])
    const programName = first(row, ['training_program', 'program_name'])
    if (providerName && programName) {
      trainingOptions.push({
        regionId: region.id,
        onetCode,
        providerName,
        programName,
        credentialType: nullable(first(row, ['credential_type', 'credential'])),
        city: nullable(first(row, ['training_city', 'city'])),
        stateCode: nullable(first(row, ['training_state', 'state_code', 'prim_state'])
          .slice(0, 2)
          .toUpperCase()),
        url: nullable(first(row, ['training_url', 'program_url'])),
        source: first(row, ['training_source']) || 'CareerOneStop cached',
        updatedAt: nullable(first(row, ['updated_at', 'snapshot_date'])),
      })
    }

    const activePostings = parseInteger(first(row, ['active_postings', 'job_postings']))
    const annualOpenings = parseInteger(first(row, ['annual_openings', 'projected_openings']))
    if (activePostings != null || annualOpenings != null) {
      jobAvailability.push({
        regionId: region.id,
        onetCode,
        activePostings,
        annualOpenings,
        source: first(row, ['job_source']) || 'CareerOneStop cached',
        sourceUrl,
        updatedAt: nullable(first(row, ['updated_at', 'snapshot_date'])),
      })
    }
  }

  return {
    regions: [...regions.values()],
    estimates,
    trainingOptions,
    jobAvailability,
  }
}

export function validateSocMappings(
  estimates: Pick<LaborMarketEstimate, 'socCode'>[],
  knownOnetCodes: string[],
): SocMappingValidation {
  const knownSocCodes = new Set(
    knownOnetCodes
      .map(onetCodeToSocCode)
      .filter((code): code is string => Boolean(code)),
  )
  const inputSocCodes = [...new Set(estimates.map(e => e.socCode))].sort()
  return {
    mappedSocCodes: inputSocCodes.filter(code => knownSocCodes.has(code)),
    missingSocCodes: inputSocCodes.filter(code => !knownSocCodes.has(code)),
  }
}
