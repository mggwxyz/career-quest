import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLocalLaborMarketCsv, validateSocMappings } from '../ingest'

describe('local labor-market ingestion parser', () => {
  it('loads the fixture and normalizes regions, OEWS estimates, training, and job snapshots', () => {
    const input = readFileSync(resolve(process.cwd(), 'data/fixtures/local-labor-market-oews.csv'), 'utf8')
    const parsed = parseLocalLaborMarketCsv(input)

    expect(parsed.regions.map(r => r.id).sort()).toEqual([
      'METRO:41860',
      'STATE:CA',
      'US',
    ])
    expect(parsed.estimates).toHaveLength(5)
    expect(parsed.estimates[0]).toMatchObject({
      regionId: 'US',
      socCode: '15-1252',
      dataYear: 2025,
      employment: 1795300,
      hourlyMedianWageCents: 6588,
      annualMedianWage: 137500,
    })
    expect(parsed.trainingOptions[0]).toMatchObject({
      onetCode: '15-1252.00',
      providerName: 'National Online University',
    })
    expect(parsed.jobAvailability[0]).toMatchObject({
      onetCode: '15-1252.00',
      activePostings: 128000,
      annualOpenings: 91300,
    })
  })

  it('validates OEWS SOC prefixes against known O*NET codes', () => {
    const validation = validateSocMappings(
      [
        { socCode: '15-1252' },
        { socCode: '29-1141' },
        { socCode: '99-9999' },
      ],
      ['15-1252.00', '29-1141.03'],
    )

    expect(validation.mappedSocCodes).toEqual(['15-1252', '29-1141'])
    expect(validation.missingSocCodes).toEqual(['99-9999'])
  })
})
