// src/lib/assessment/types.ts
export const RIASEC_SCALES = ['R', 'I', 'A', 'S', 'E', 'C'] as const
export type RiasecScale = typeof RIASEC_SCALES[number]

export const WORK_VALUE_SCALES = ['ACH', 'IND', 'REC', 'REL', 'SUP', 'WC'] as const
export type WorkValueScale = typeof WORK_VALUE_SCALES[number]

export type GradeBand = 'middle' | 'early-hs' | 'late-hs' | 'college'
export type Confidence = 'high' | 'medium' | 'low'

export type ScaleEstimate = { mean: number, variance: number }

export type Posterior = {
  riasec: Record<RiasecScale, ScaleEstimate>
  workValues: Record<WorkValueScale, ScaleEstimate>
  workContext: {
    structureVariety: ScaleEstimate
    indoorOutdoor: ScaleEstimate
    soloTeam: ScaleEstimate
  }
}

export type RiasecLoadings = Record<RiasecScale, number> // 0..3
export type WorkValueLoadings = Record<WorkValueScale, number> // 0..3
export type WorkContextLoadings = {
  structureVariety: number // -2..2 (negative = structure)
  indoorOutdoor: number // -2..2 (negative = indoor)
  soloTeam: number // -2..2 (negative = solo)
}

export type Option = {
  id: string
  text: string
  imageUrl: string
  prompt: string
  loadings: {
    riasec: RiasecLoadings
    workValues: WorkValueLoadings
    workContext: WorkContextLoadings
  }
  desirability: number // 1..5
}

export type DimensionContrast = 'opposite' | 'alternate' | 'adjacent' | 'mixed'

export type Item = {
  id: string
  option1: Option
  option2: Option
  dimensionContrast: DimensionContrast
  primaryScales: RiasecScale[]
  minGradeBand?: GradeBand
}

export type ResponseChoice = 1 | 2 | null // null = skip

export type RecordedResponse = {
  itemId: string
  choice: ResponseChoice
  position: number
  responseMs?: number
}

export type AssessmentResult = {
  hollandCode: string
  riasec: Record<RiasecScale, {
    score: number // 0..100
    rank: 1 | 2 | 3 | 4 | 5 | 6
    confidence: Confidence
  }>
  workValues: {
    top: WorkValueScale[]
    all: Record<WorkValueScale, { score: number, confidence: Confidence }>
    suppressed?: boolean
  }
  workContext: {
    structureVariety: { lean: 'structure' | 'variety' | 'balanced', strength: number, confidence: Confidence }
    indoorOutdoor: { lean: 'indoor' | 'outdoor' | 'mixed', strength: number, confidence: Confidence }
    soloTeam: { lean: 'solo' | 'team' | 'flexible', strength: number, confidence: Confidence }
  }
  meta: {
    itemsAnswered: number
    itemsSkipped: number
    completedAt: string
    engineVersion: string
    inconsistencyFlag: boolean
    degenerate?: boolean
  }
}

export const ENGINE_VERSION = 'v1.0.0'
