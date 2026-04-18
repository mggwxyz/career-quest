export * from './types'
export { initialPosterior, updatePosterior } from './posterior'
export { rankRiasec, hollandCode, confidenceBand, contextLean, buildResult } from './scoring'
export { detectInconsistency } from './inconsistency'
export { validateBank, eligibleItems, unseenItems, RIASEC_COVERAGE_FLOOR, DESIRABILITY_GAP_MAX } from './itemBank'
export {
  scoreItemForSelection, pickNextItem, pickWithCoveragePhase, shouldStop,
  startSession, advance, finalize, chooseFirstItem,
  FLOOR_ITEMS, CAP_ITEMS,
} from './engine'
export type { StopReason, AdvanceOutput } from './engine'
export { formatResultForPrompt } from './promptFormat'
