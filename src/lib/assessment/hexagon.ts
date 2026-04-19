// src/lib/assessment/hexagon.ts
import { RiasecScale, DimensionContrast } from './types'

const ORDER: RiasecScale[] = ['R', 'I', 'A', 'S', 'E', 'C']

export function hexagonDistance(a: RiasecScale, b: RiasecScale): 0 | 1 | 2 | 3 {
  const i = ORDER.indexOf(a)
  const j = ORDER.indexOf(b)
  const raw = Math.abs(i - j)
  const dist = Math.min(raw, ORDER.length - raw)
  return dist as 0 | 1 | 2 | 3
}

export function contrastCategory(
  scalesA: RiasecScale[],
  scalesB: RiasecScale[],
): DimensionContrast {
  if (scalesA.length !== 1 || scalesB.length !== 1) return 'mixed'
  const d = hexagonDistance(scalesA[0], scalesB[0])
  if (d === 3) return 'opposite'
  if (d === 2) return 'alternate'
  if (d === 1) return 'adjacent'
  return 'mixed'
}
