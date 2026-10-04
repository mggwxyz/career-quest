import {
  DEFAULT_LABOR_MARKET_REGION_ID,
  type LaborMarketEstimate,
  type LaborMarketFallbackLevel,
  type LaborMarketJobAvailability,
  type LaborMarketRegion,
  type LaborMarketSummary,
  type LaborMarketTrainingOption,
  type OccupationLaborFallback,
} from './types'

export const NATIONAL_LABOR_MARKET_REGION: LaborMarketRegion = {
  id: DEFAULT_LABOR_MARKET_REGION_ID,
  type: 'national',
  name: 'United States',
  stateCode: null,
  parentRegionId: null,
  blsAreaCode: '99',
}

export function onetCodeToSocCode(onetCode: string): string | null {
  const trimmed = onetCode.trim()
  const match = /^(\d{2}-\d{4})(?:\.\d{2})?$/.exec(trimmed)
  return match?.[1] ?? null
}

export function normalizeSocCode(raw: string): string | null {
  const trimmed = raw.trim()
  if (/^\d{2}-\d{4}$/.test(trimmed)) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 6) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}`
  return null
}

export function buildRegionFallbackChain(selectedRegion: LaborMarketRegion): string[] {
  const chain = [selectedRegion.id]
  if (selectedRegion.parentRegionId && !chain.includes(selectedRegion.parentRegionId)) {
    chain.push(selectedRegion.parentRegionId)
  }
  if (!chain.includes(DEFAULT_LABOR_MARKET_REGION_ID)) {
    chain.push(DEFAULT_LABOR_MARKET_REGION_ID)
  }
  return chain
}

function fallbackLevelForEstimate(
  estimate: LaborMarketEstimate | null,
  selectedRegion: LaborMarketRegion,
): LaborMarketFallbackLevel {
  if (!estimate) return 'missing'
  if (estimate.regionId === selectedRegion.id) return 'selected'
  if (selectedRegion.parentRegionId && estimate.regionId === selectedRegion.parentRegionId) {
    return 'state-fallback'
  }
  if (estimate.regionId === DEFAULT_LABOR_MARKET_REGION_ID) return 'national-fallback'
  return 'selected'
}

function pickLatestEstimate(
  estimates: LaborMarketEstimate[],
  regionChain: string[],
): LaborMarketEstimate | null {
  for (const regionId of regionChain) {
    const matches = estimates
      .filter(e => e.regionId === regionId)
      .sort((a, b) => b.dataYear - a.dataYear)
    if (matches[0]) return matches[0]
  }
  return null
}

function pickTrainingOptions(
  options: LaborMarketTrainingOption[],
  regionChain: string[],
): LaborMarketTrainingOption[] {
  for (const regionId of regionChain) {
    const matches = options.filter(o => o.regionId === regionId)
    if (matches.length > 0) {
      return matches
        .slice()
        .sort((a, b) => a.providerName.localeCompare(b.providerName) || a.programName.localeCompare(b.programName))
    }
  }
  return []
}

function pickJobAvailability(
  rows: LaborMarketJobAvailability[],
  regionChain: string[],
): LaborMarketJobAvailability | null {
  for (const regionId of regionChain) {
    const matches = rows.filter(r => r.regionId === regionId)
    if (matches.length > 0) {
      return matches.slice()
        .sort((a, b) => {
          const aUpdated = a.updatedAt ? Date.parse(a.updatedAt) : 0
          const bUpdated = b.updatedAt ? Date.parse(b.updatedAt) : 0
          return bUpdated - aUpdated
        })[0] ?? null
    }
  }
  return null
}

function withRegion(regionsById: Map<string, LaborMarketRegion>, id: string | null | undefined): LaborMarketRegion | null {
  if (!id) return null
  return regionsById.get(id) ?? (id === DEFAULT_LABOR_MARKET_REGION_ID ? NATIONAL_LABOR_MARKET_REGION : null)
}

function centsFromHourlyDollars(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return Math.round(value * 100)
}

export function buildLaborMarketSummary(args: {
  onetCode: string
  selectedRegion: LaborMarketRegion
  regionsById: Map<string, LaborMarketRegion>
  estimates: LaborMarketEstimate[]
  trainingOptions?: LaborMarketTrainingOption[]
  jobAvailability?: LaborMarketJobAvailability[]
  occupationFallback?: OccupationLaborFallback | null
}): LaborMarketSummary {
  const socCode = onetCodeToSocCode(args.onetCode)
  const regionChain = buildRegionFallbackChain(args.selectedRegion)
  const estimates = socCode
    ? args.estimates.filter(e => e.socCode === socCode)
    : []
  const estimate = pickLatestEstimate(estimates, regionChain)
  const estimateFallbackLevel = fallbackLevelForEstimate(estimate, args.selectedRegion)
  const trainingOptions = pickTrainingOptions(args.trainingOptions ?? [], regionChain)
  const jobAvailability = pickJobAvailability(args.jobAvailability ?? [], regionChain)
  const notes: string[] = []

  let fallbackLevel = estimateFallbackLevel
  let annualMedianWage = estimate?.annualMedianWage ?? null
  let hourlyMedianWageCents = estimate?.hourlyMedianWageCents ?? null
  const annualMeanWage = estimate?.annualMeanWage ?? null
  const employment = estimate?.employment ?? null
  const employmentRseTenths = estimate?.employmentRseTenths ?? null
  let source = estimate?.source ?? null
  let sourceUrl = estimate?.sourceUrl ?? null
  let dataYear = estimate?.dataYear ?? null
  let resolvedRegion = withRegion(args.regionsById, estimate?.regionId)

  if (!estimate) {
    const fallback = args.occupationFallback
    annualMedianWage = fallback?.salaryAnnualMedian ?? null
    hourlyMedianWageCents = centsFromHourlyDollars(fallback?.salaryHourlyMedian)
    if (annualMedianWage != null || hourlyMedianWageCents != null) {
      fallbackLevel = 'onet-national-fallback'
      source = 'O*NET national mirror'
      sourceUrl = null
      dataYear = null
      resolvedRegion = NATIONAL_LABOR_MARKET_REGION
      notes.push('No cached BLS OEWS estimate matched this SOC and region; showing national O*NET pay.')
    }
    else {
      fallbackLevel = 'missing'
      notes.push('No cached local, state, national, or O*NET pay estimate is available for this occupation.')
    }
  }
  else if (fallbackLevel === 'state-fallback') {
    notes.push('Metro data is not cached for this SOC; showing the parent state estimate.')
  }
  else if (fallbackLevel === 'national-fallback') {
    notes.push('Local data is not cached for this SOC; showing the national OEWS estimate.')
  }

  if (trainingOptions.length === 0) {
    notes.push('No cached training options are available for this occupation and region yet.')
  }
  if (!jobAvailability) {
    notes.push('No cached job availability snapshot is available for this occupation and region yet.')
  }

  return {
    onetCode: args.onetCode,
    socCode,
    selectedRegion: args.selectedRegion,
    resolvedRegion,
    fallbackLevel,
    dataYear,
    source,
    sourceUrl,
    annualMedianWage,
    hourlyMedianWageCents,
    annualMeanWage,
    employment,
    employmentRseTenths,
    trainingOptions,
    trainingRegion: withRegion(args.regionsById, trainingOptions[0]?.regionId),
    jobAvailability,
    jobAvailabilityRegion: withRegion(args.regionsById, jobAvailability?.regionId),
    notes,
  }
}
