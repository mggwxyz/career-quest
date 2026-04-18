import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { items } from '@/app/_data/items'
import {
  advance, AdvanceOutput, chooseFirstItem, ENGINE_VERSION, finalize,
  GradeBand, initialPosterior, Item, Posterior, ResponseChoice, startSession,
  Session,
} from '@/lib/assessment'

export const VALID_GRADE_BANDS: GradeBand[] = ['middle', 'early-hs', 'late-hs', 'college']
export function isGradeBand(x: unknown): x is GradeBand {
  return typeof x === 'string' && (VALID_GRADE_BANDS as string[]).includes(x)
}

export async function abandonActiveSessionsForUser(userId: string): Promise<void> {
  await db.update(assessmentSessions)
    .set({ abandonedAt: new Date() })
    .where(and(
      eq(assessmentSessions.userId, userId),
      isNull(assessmentSessions.completedAt),
      isNull(assessmentSessions.abandonedAt),
    ))
}

export async function createNewSession(
  userId: string, gradeBand: GradeBand | undefined,
): Promise<{ sessionId: string, firstItem: Item }> {
  const posterior = initialPosterior({ gradeBand })
  const engineSession = startSession({ bank: items, gradeBand })
  const firstItem = chooseFirstItem(items, engineSession)

  const [row] = await db.insert(assessmentSessions)
    .values({
      userId,
      gradeBand: gradeBand ?? null,
      engineVersion: ENGINE_VERSION,
      posterior,
      inconsistency: false,
    })
    .returning({ id: assessmentSessions.id })

  await db.insert(assessmentResponses).values({
    sessionId: row.id,
    itemId: firstItem.id,
    position: 1,
  })

  return { sessionId: row.id, firstItem }
}

export async function loadActiveSession(userId: string): Promise<{
  sessionId: string
  posterior: Posterior
  gradeBand: GradeBand | undefined
  responses: Array<{ itemId: string, position: number, choice: ResponseChoice, responseMs: number | null, respondedAt: Date | null }>
} | null> {
  const [session] = await db.select()
    .from(assessmentSessions)
    .where(and(
      eq(assessmentSessions.userId, userId),
      isNull(assessmentSessions.completedAt),
      isNull(assessmentSessions.abandonedAt),
    ))
    .limit(1)
  if (!session) return null

  const responses = await db.select().from(assessmentResponses)
    .where(eq(assessmentResponses.sessionId, session.id))
    .orderBy(assessmentResponses.position)

  return {
    sessionId: session.id,
    posterior: session.posterior as Posterior,
    gradeBand: (session.gradeBand ?? undefined) as GradeBand | undefined,
    responses: responses.map(r => ({
      itemId: r.itemId,
      position: r.position,
      choice: r.choice as ResponseChoice,
      responseMs: r.responseMs,
      respondedAt: r.respondedAt,
    })),
  }
}

export function rebuildSessionFromLog(args: {
  gradeBand: GradeBand | undefined
  responses: Array<{ itemId: string, choice: ResponseChoice, responseMs: number | null }>
}): { session: Session, lastAdvance: AdvanceOutput | null } {
  let session = startSession({ bank: items, gradeBand: args.gradeBand })
  let lastAdvance: AdvanceOutput | null = null
  for (const r of args.responses) {
    const item = items.find(i => i.id === r.itemId)
    if (!item) continue
    if (r.choice === null || r.choice === undefined) continue // un-answered shown rows ignored
    lastAdvance = advance({
      session, bank: items, shownItem: item,
      choice: r.choice, responseMs: r.responseMs ?? undefined,
    })
    session = lastAdvance.session
  }
  return { session, lastAdvance }
}

export { finalize }
