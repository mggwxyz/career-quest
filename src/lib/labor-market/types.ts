export const DEFAULT_LABOR_MARKET_REGION_ID = 'US'

export type LaborMarketRegionType = 'national' | 'state' | 'metro' | 'nonmetro'

export interface LaborMarketRegion {
  id: string
  type: LaborMarketRegionType
  name: string
  stateCode: string | null
  parentRegionId: string | null
  blsAreaCode: string | null
}

export interface LaborMarketEstimate {
  regionId: string
  socCode: string
  occupationTitle: string | null
  dataYear: number
  employment: number | null
  employmentRseTenths: number | null
  hourlyMedianWageCents: number | null
  annualMedianWage: number | null
  hourlyMeanWageCents: number | null
  annualMeanWage: number | null
  source: string
  sourceUrl: string | null
}

export interface LaborMarketTrainingOption {
  regionId: string
  onetCode: string
  providerName: string
  programName: string
  credentialType: string | null
  city: string | null
  stateCode: string | null
  url: string | null
  source: string
  updatedAt: string | null
}

export interface LaborMarketJobAvailability {
  regionId: string
  onetCode: string
  activePostings: number | null
  annualOpenings: number | null
  source: string
  sourceUrl: string | null
  updatedAt: string | null
}

export interface OccupationLaborFallback {
  salaryAnnualMedian: number | null
  salaryHourlyMedian: number | null
}

export type LaborMarketFallbackLevel =
  | 'selected'
  | 'state-fallback'
  | 'national-fallback'
  | 'onet-national-fallback'
  | 'missing'

export interface LaborMarketSummary {
  onetCode: string
  socCode: string | null
  selectedRegion: LaborMarketRegion
  resolvedRegion: LaborMarketRegion | null
  fallbackLevel: LaborMarketFallbackLevel
  dataYear: number | null
  source: string | null
  sourceUrl: string | null
  annualMedianWage: number | null
  hourlyMedianWageCents: number | null
  annualMeanWage: number | null
  employment: number | null
  employmentRseTenths: number | null
  trainingOptions: LaborMarketTrainingOption[]
  trainingRegion: LaborMarketRegion | null
  jobAvailability: LaborMarketJobAvailability | null
  jobAvailabilityRegion: LaborMarketRegion | null
  notes: string[]
}
