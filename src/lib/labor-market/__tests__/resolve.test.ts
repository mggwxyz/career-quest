import { describe, expect, it } from 'vitest'
import { buildLaborMarketSummary } from '../resolve'
import type { LaborMarketEstimate, LaborMarketRegion } from '../types'

const us: LaborMarketRegion = {
  id: 'US',
  type: 'national',
  name: 'United States',
  stateCode: null,
  parentRegionId: null,
  blsAreaCode: '99',
}

const ca: LaborMarketRegion = {
  id: 'STATE:CA',
  type: 'state',
  name: 'California',
  stateCode: 'CA',
  parentRegionId: 'US',
  blsAreaCode: 'CA',
}

const sf: LaborMarketRegion = {
  id: 'METRO:41860',
  type: 'metro',
  name: 'San Francisco-Oakland-Fremont, CA',
  stateCode: 'CA',
  parentRegionId: 'STATE:CA',
  blsAreaCode: '41860',
}

const regionsById = new Map([us, ca, sf].map(region => [region.id, region]))

function estimate(regionId: string, annualMedianWage: number): LaborMarketEstimate {
  return {
    regionId,
    socCode: '15-1252',
    occupationTitle: 'Software Developers',
    dataYear: 2025,
    employment: 100,
    employmentRseTenths: null,
    hourlyMedianWageCents: null,
    annualMedianWage,
    hourlyMeanWageCents: null,
    annualMeanWage: null,
    source: 'BLS OEWS',
    sourceUrl: 'https://www.bls.gov/oes/tables.htm',
  }
}

describe('buildLaborMarketSummary', () => {
  it('uses selected metro data when available', () => {
    const summary = buildLaborMarketSummary({
      onetCode: '15-1252.00',
      selectedRegion: sf,
      regionsById,
      estimates: [estimate('US', 137500), estimate('STATE:CA', 162490), estimate('METRO:41860', 191660)],
    })

    expect(summary.fallbackLevel).toBe('selected')
    expect(summary.resolvedRegion?.id).toBe('METRO:41860')
    expect(summary.annualMedianWage).toBe(191660)
    expect(summary.dataYear).toBe(2025)
  })

  it('falls back from a metro to state, then national OEWS data', () => {
    const stateSummary = buildLaborMarketSummary({
      onetCode: '15-1252.00',
      selectedRegion: sf,
      regionsById,
      estimates: [estimate('US', 137500), estimate('STATE:CA', 162490)],
    })
    expect(stateSummary.fallbackLevel).toBe('state-fallback')
    expect(stateSummary.resolvedRegion?.id).toBe('STATE:CA')

    const nationalSummary = buildLaborMarketSummary({
      onetCode: '15-1252.00',
      selectedRegion: sf,
      regionsById,
      estimates: [estimate('US', 137500)],
    })
    expect(nationalSummary.fallbackLevel).toBe('national-fallback')
    expect(nationalSummary.resolvedRegion?.id).toBe('US')
  })

  it('uses national O*NET pay when OEWS data is missing', () => {
    const summary = buildLaborMarketSummary({
      onetCode: '15-1252.00',
      selectedRegion: sf,
      regionsById,
      estimates: [],
      occupationFallback: {
        salaryAnnualMedian: 127260,
        salaryHourlyMedian: null,
      },
    })

    expect(summary.fallbackLevel).toBe('onet-national-fallback')
    expect(summary.annualMedianWage).toBe(127260)
    expect(summary.dataYear).toBeNull()
    expect(summary.notes.join(' ')).toMatch(/No cached BLS OEWS estimate/)
  })

  it('reports missing data when neither OEWS nor O*NET pay exists', () => {
    const summary = buildLaborMarketSummary({
      onetCode: '15-1252.00',
      selectedRegion: sf,
      regionsById,
      estimates: [],
      occupationFallback: {
        salaryAnnualMedian: null,
        salaryHourlyMedian: null,
      },
    })

    expect(summary.fallbackLevel).toBe('missing')
    expect(summary.annualMedianWage).toBeNull()
    expect(summary.resolvedRegion).toBeNull()
  })
})
