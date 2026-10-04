export type CareerActionToggle = 'save' | 'shortlist' | 'dismiss'
export type CareerActionEvent = 'view' | 'chat'

export interface CareerActionState {
  saved: boolean
  shortlisted: boolean
  dismissed: boolean
  viewedAt: Date | null
  chattedAt: Date | null
  latestNote: string | null
  latestNoteAt: Date | null
}

export const EMPTY_CAREER_ACTION_STATE: CareerActionState = {
  saved: false,
  shortlisted: false,
  dismissed: false,
  viewedAt: null,
  chattedAt: null,
  latestNote: null,
  latestNoteAt: null,
}

export function createEmptyCareerActionState(): CareerActionState {
  return { ...EMPTY_CAREER_ACTION_STATE }
}
