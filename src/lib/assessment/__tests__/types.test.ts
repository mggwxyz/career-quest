import { describe, it, expect } from 'vitest'
import { RIASEC_SCALES, WORK_VALUE_SCALES, ENGINE_VERSION } from '../types'

describe('assessment types', () => {
  it('exports the six RIASEC scales in canonical order', () => {
    expect(RIASEC_SCALES).toEqual(['R', 'I', 'A', 'S', 'E', 'C'])
  })

  it('exports the six O*NET work values', () => {
    expect(WORK_VALUE_SCALES).toEqual(['ACH', 'IND', 'REC', 'REL', 'SUP', 'WC'])
  })

  it('declares an engine version', () => {
    expect(ENGINE_VERSION).toMatch(/^v\d+\.\d+\.\d+$/)
  })
})
