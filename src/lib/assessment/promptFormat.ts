import { AssessmentResult, Confidence, RIASEC_SCALES, RiasecScale } from './types'

const RIASEC_NAMES: Record<RiasecScale, string> = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
}

const WV_NAMES: Record<string, string> = {
  ACH: 'Achievement', IND: 'Independence', REC: 'Recognition',
  REL: 'Relationships', SUP: 'Support', WC: 'Working Conditions',
}

export function formatResultForPrompt(r: AssessmentResult): string {
  const top3Letters = r.hollandCode.split('') as RiasecScale[]
  const top3Names = top3Letters.map(s => RIASEC_NAMES[s]).join('-')

  const ranked = RIASEC_SCALES
    .map(s => ({ s, ...r.riasec[s] }))
    .sort((a, b) => a.rank - b.rank)
  const confLine = ranked.slice(0, 3).map(x => `${x.s} ${x.confidence}`)
    .join(', ')
  const lowLetters = ranked.filter(x => x.score < 35).map(x => x.s)
  const lowLine = lowLetters.length > 0 ? `; clearly low on ${lowLetters.join(', ')}` : ''

  const wvLine = r.workValues.top
    .map(s => `${WV_NAMES[s]} (${r.workValues.all[s].confidence})`)
    .join(', ')

  const ctxLine = [
    contextLineFor('structureVariety', r.workContext.structureVariety),
    contextLineFor('indoorOutdoor', r.workContext.indoorOutdoor),
    contextLineFor('soloTeam', r.workContext.soloTeam),
  ].filter(Boolean).join('; ')

  const notes: string[] = []
  if (r.workValues.suppressed) notes.push('Work-value results are tentative (younger user).')
  if (r.meta.inconsistencyFlag) notes.push('Some answers seemed inconsistent — treat as exploratory.')

  return [
    `User Profile:`,
    `- Holland Code: ${r.hollandCode} (${top3Names})`,
    `- Confidence: ${confLine}${lowLine}`,
    `- Top work values: ${wvLine || 'none clearly above neutral'}`,
    `- Work context: ${ctxLine}`,
    notes.length > 0 ? `- Notes: ${notes.join(' ')}` : '',
    `- Items answered: ${r.meta.itemsAnswered}.`,
  ].filter(Boolean).join('\n')
}

function contextLineFor(
  axis: 'structureVariety' | 'indoorOutdoor' | 'soloTeam',
  v: { lean: string, strength: number, confidence: Confidence },
): string {
  if (v.lean === 'balanced' || v.lean === 'mixed' || v.lean === 'flexible') {
    return axis === 'indoorOutdoor' ? 'no strong indoor/outdoor preference' : `${axis}: balanced`
  }
  return `prefers ${v.lean} (${v.confidence})`
}
