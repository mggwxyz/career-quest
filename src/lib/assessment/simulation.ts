import { Item, RIASEC_SCALES, RiasecScale, ResponseChoice } from './types'

export type SyntheticUser = {
  riasec: Record<RiasecScale, number>
  noise: number
  topCode: string
}

const TOP_THETA = [2.0, 1.5, 1.0]
const LOW_THETA = -1.0

function rng(seed: number): () => number {
  let x = seed | 0
  return () => {
    x = (x * 1664525 + 1013904223) | 0
    return ((x >>> 0) / 0xFFFFFFFF)
  }
}

export function makeSyntheticUser(opts: { topCode: string, seed: number, noise?: number }): SyntheticUser {
  const r = rng(opts.seed)
  const top = opts.topCode.split('') as RiasecScale[]
  const others = RIASEC_SCALES.filter(s => !top.includes(s))
  const riasec = {} as Record<RiasecScale, number>
  top.forEach((s, i) => {
    riasec[s] = TOP_THETA[i] + (r() - 0.5) * 0.1
  })
  others.forEach((s) => {
    riasec[s] = LOW_THETA + (r() - 0.5) * 0.1
  })
  return { riasec, noise: opts.noise ?? 0.5, topCode: opts.topCode }
}

export function simulateChoice(user: SyntheticUser, item: Item, seed: number): ResponseChoice {
  const utility = (loadings: Record<RiasecScale, number>): number =>
    RIASEC_SCALES.reduce((sum, s) => sum + user.riasec[s] * loadings[s], 0)

  const u1 = utility(item.option1.loadings.riasec)
  const u2 = utility(item.option2.loadings.riasec)
  const p1 = 1 / (1 + Math.exp(-(u1 - u2) / user.noise))
  const r = rng(seed)()
  return r < p1 ? 1 : 2
}

export function allHollandCodes(): string[] {
  const codes: string[] = []
  for (const a of RIASEC_SCALES) for (const b of RIASEC_SCALES) for (const c of RIASEC_SCALES) {
    if (a !== b && b !== c && a !== c) codes.push(a + b + c)
  }
  return codes
}
