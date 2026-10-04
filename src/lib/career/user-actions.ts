import 'server-only'

import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import {
  CAREER_USER_ACTION_VALUES,
  careerUserActions,
  type CareerUserActionValue,
} from '@/db/schema'
import {
  createEmptyCareerActionState,
  type CareerActionEvent,
  type CareerActionState,
  type CareerActionToggle,
} from './action-types'

export { CAREER_USER_ACTION_VALUES, type CareerUserActionValue }
export type { CareerActionEvent, CareerActionState, CareerActionToggle }

type CareerActionRow = typeof careerUserActions.$inferSelect

export function isCareerUserActionValue(value: string): value is CareerUserActionValue {
  return CAREER_USER_ACTION_VALUES.includes(value as CareerUserActionValue)
}

export function applyCareerActionRow(
  state: CareerActionState,
  row: Pick<CareerActionRow, 'action' | 'createdAt' | 'note'>,
): CareerActionState {
  switch (row.action) {
    case 'save':
      return { ...state, saved: true, dismissed: false }
    case 'unsave':
      return { ...state, saved: false }
    case 'shortlist':
      return { ...state, shortlisted: true, dismissed: false }
    case 'unshortlist':
      return { ...state, shortlisted: false }
    case 'dismiss':
      return { ...state, dismissed: true }
    case 'undismiss':
      return { ...state, dismissed: false }
    case 'view':
      return { ...state, viewedAt: row.createdAt }
    case 'chat':
      return { ...state, chattedAt: row.createdAt }
    case 'note': {
      const note = row.note?.trim()
      return note ? { ...state, latestNote: note, latestNoteAt: row.createdAt } : state
    }
    default:
      return state
  }
}

export function buildCareerActionStates(
  rows: Pick<CareerActionRow, 'onetId' | 'action' | 'createdAt' | 'note'>[],
): Map<string, CareerActionState> {
  const states = new Map<string, CareerActionState>()

  for (const row of rows) {
    const state = states.get(row.onetId) ?? createEmptyCareerActionState()
    states.set(row.onetId, applyCareerActionRow(state, row))
  }

  return states
}

export async function getCareerActionStates(
  userId: string,
  onetIds: string[],
): Promise<Map<string, CareerActionState>> {
  const uniqueOnetIds = [...new Set(onetIds.filter(Boolean))]
  if (uniqueOnetIds.length === 0) return new Map()

  const rows = await db.select().from(careerUserActions)
    .where(and(
      eq(careerUserActions.userId, userId),
      inArray(careerUserActions.onetId, uniqueOnetIds),
    ))
    .orderBy(asc(careerUserActions.createdAt))

  return buildCareerActionStates(rows)
}

export async function getCareerActionState(
  userId: string,
  onetId: string,
): Promise<CareerActionState> {
  const states = await getCareerActionStates(userId, [onetId])
  return states.get(onetId) ?? createEmptyCareerActionState()
}

export async function appendCareerUserAction({
  userId,
  onetId,
  action,
  note,
}: {
  userId: string
  onetId: string
  action: CareerUserActionValue
  note?: string | null
}) {
  await db.insert(careerUserActions).values({
    userId,
    onetId,
    action,
    note: note ?? null,
  })
}

export function actionValueForToggle(
  toggle: CareerActionToggle,
  active: boolean,
): CareerUserActionValue {
  if (toggle === 'save') return active ? 'save' : 'unsave'
  if (toggle === 'shortlist') return active ? 'shortlist' : 'unshortlist'
  return active ? 'dismiss' : 'undismiss'
}
