'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import {
  actionValueForToggle,
  appendCareerUserAction,
  getCareerActionState,
  type CareerActionEvent,
  type CareerActionState,
  type CareerActionToggle,
} from '@/lib/career/user-actions'

type ActionResult =
  | { success: true, state: CareerActionState }
  | { success: false, error: string }

const ToggleSchema = z.object({
  onetId: z.string().min(1),
  toggle: z.enum(['save', 'shortlist', 'dismiss']),
  active: z.boolean(),
  slug: z.string().min(1)
    .optional(),
})

const EventSchema = z.object({
  onetId: z.string().min(1),
  event: z.enum(['view', 'chat']),
  slug: z.string().min(1)
    .optional(),
})

const NoteSchema = z.object({
  onetId: z.string().min(1),
  note: z.string().trim()
    .min(1)
    .max(1000),
  slug: z.string().min(1)
    .optional(),
})

function revalidateCareerSurfaces(slug?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/careers')
  revalidatePath('/discover/matches')
  if (slug) revalidatePath(`/careers/${slug}`)
}

async function requireUserId(): Promise<string | null> {
  const session = await getSession()
  return session?.user?.id ?? null
}

export async function setCareerActionStateAction(input: unknown): Promise<ActionResult> {
  const parsed = ToggleSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid career action' }
  }

  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: 'Authentication required' }
  }

  const { onetId, toggle, active, slug } = parsed.data as {
    onetId: string
    toggle: CareerActionToggle
    active: boolean
    slug?: string
  }

  try {
    if (active && toggle !== 'dismiss') {
      await appendCareerUserAction({ userId, onetId, action: 'undismiss' })
    }
    await appendCareerUserAction({
      userId,
      onetId,
      action: actionValueForToggle(toggle, active),
    })
    revalidateCareerSurfaces(slug)
    return { success: true, state: await getCareerActionState(userId, onetId) }
  }
  catch (error) {
    console.error('[career actions] setCareerActionStateAction failed:', error)
    return { success: false, error: 'Could not update career action' }
  }
}

export async function recordCareerEventAction(input: unknown): Promise<ActionResult> {
  const parsed = EventSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid career event' }
  }

  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: 'Authentication required' }
  }

  const { onetId, event, slug } = parsed.data as {
    onetId: string
    event: CareerActionEvent
    slug?: string
  }

  try {
    await appendCareerUserAction({ userId, onetId, action: event })
    revalidateCareerSurfaces(slug)
    return { success: true, state: await getCareerActionState(userId, onetId) }
  }
  catch (error) {
    console.error('[career actions] recordCareerEventAction failed:', error)
    return { success: false, error: 'Could not record career activity' }
  }
}

export async function addCareerNoteAction(input: unknown): Promise<ActionResult> {
  const parsed = NoteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Write a note before saving' }
  }

  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: 'Authentication required' }
  }

  const { onetId, note, slug } = parsed.data

  try {
    await appendCareerUserAction({ userId, onetId, action: 'note', note })
    revalidateCareerSurfaces(slug)
    return { success: true, state: await getCareerActionState(userId, onetId) }
  }
  catch (error) {
    console.error('[career actions] addCareerNoteAction failed:', error)
    return { success: false, error: 'Could not save note' }
  }
}
