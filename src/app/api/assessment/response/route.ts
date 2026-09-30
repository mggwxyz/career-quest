import { NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getOrCreateUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { finalize, ResponseChoice } from '@/lib/assessment'
import { isGradeBand, rebuildSessionFromLog } from '@/lib/assessment/serverSession'

const ResponseChoiceSchema = z.union([z.literal(1), z.literal(2), z.null()])
const BodySchema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  choice: ResponseChoiceSchema.optional().default(null),
  responseMs: z.number()
    .int()
    .nonnegative()
    .max(24 * 60 * 60 * 1000)
    .optional(),
})

export async function POST(request: Request) {
  try {
    const { id: userId } = await getOrCreateUserId()
    const parsed = BodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const body = parsed.data
    const choice: ResponseChoice = body.choice

    // Verify session belongs to this user and is active
    const [sessionRow] = await db.select().from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.id, body.sessionId),
        eq(assessmentSessions.userId, userId),
        isNull(assessmentSessions.completedAt),
        isNull(assessmentSessions.abandonedAt),
      ))
      .limit(1)
    if (!sessionRow) {
      return NextResponse.json({ error: 'Session not found or inactive' }, { status: 404 })
    }

    // Older sessions may contain a duplicate shown row after a submitted skip.
    const existingRows = await db.select().from(assessmentResponses)
      .where(eq(assessmentResponses.sessionId, body.sessionId))
      .orderBy(assessmentResponses.position)
    if (existingRows.some(r => r.respondedAt !== null && r.itemId === body.itemId)) {
      return NextResponse.json({ error: 'Item not outstanding in this session' }, { status: 409 })
    }

    // Record the response against the outstanding row for this item in this session
    const [shownRow] = await db.select().from(assessmentResponses)
      .where(and(
        eq(assessmentResponses.sessionId, body.sessionId),
        eq(assessmentResponses.itemId, body.itemId),
        isNull(assessmentResponses.respondedAt),
      ))
      .limit(1)
    if (!shownRow) {
      return NextResponse.json({ error: 'Item not outstanding in this session' }, { status: 409 })
    }
    const [recorded] = await db.update(assessmentResponses)
      .set({ choice, respondedAt: new Date(), responseMs: body.responseMs ?? null })
      .where(and(
        eq(assessmentResponses.id, shownRow.id),
        isNull(assessmentResponses.respondedAt),
      ))
      .returning({ id: assessmentResponses.id })
    if (!recorded) {
      return NextResponse.json({ error: 'Item not outstanding in this session' }, { status: 409 })
    }

    // Load full response log and rebuild engine state
    const allRows = await db.select().from(assessmentResponses)
      .where(eq(assessmentResponses.sessionId, body.sessionId))
      .orderBy(assessmentResponses.position)
    const submitted = allRows.filter(r => r.respondedAt !== null)
    const answeredCount = submitted.filter(r => r.choice === 1 || r.choice === 2).length

    const { session: engineSession, lastAdvance } = rebuildSessionFromLog({
      gradeBand: isGradeBand(sessionRow.gradeBand) ? sessionRow.gradeBand : undefined,
      responses: allRows.map(r => ({
        itemId: r.itemId, choice: r.choice as ResponseChoice,
        responseMs: r.responseMs, respondedAt: r.respondedAt,
      })),
    })

    if (!lastAdvance) {
      // Should not happen: we just recorded a submitted response, so replay must advance at least once.
      console.error(
        '[api/assessment/response] engine rebuild produced no advance for session %s (submitted=%d)',
        body.sessionId, submitted.length,
      )
      return NextResponse.json({ error: 'Engine desync: response log references unknown items' }, { status: 500 })
    }

    // Posterior is derived — if a write is lost, the next rebuild-from-log will reproduce it.
    // The response-log is the source of truth; this update is just a cached snapshot for /session GET.
    await db.update(assessmentSessions)
      .set({ posterior: engineSession.posterior })
      .where(eq(assessmentSessions.id, body.sessionId))

    if (lastAdvance.kind === 'stop') {
      const result = finalize(engineSession)
      await db.update(assessmentSessions).set({
        completedAt: new Date(),
        result,
        inconsistency: result.meta.inconsistencyFlag,
      })
        .where(eq(assessmentSessions.id, body.sessionId))
      return NextResponse.json({ kind: 'stop', reason: lastAdvance.reason, result })
    }

    // Resume may have already persisted this replayed item during the request.
    if (!allRows.some(r => r.respondedAt === null && r.itemId === lastAdvance.nextItem.id)) {
      const nextPosition = Math.max(0, ...allRows.map(r => r.position)) + 1
      await db.insert(assessmentResponses).values({
        sessionId: body.sessionId,
        itemId: lastAdvance.nextItem.id,
        position: nextPosition,
      })
        .onConflictDoNothing()
    }

    return NextResponse.json({
      kind: 'next',
      item: lastAdvance.nextItem,
      itemsAnswered: answeredCount,
      posteriorSnapshot: engineSession.posterior,
    })
  }
  catch (err) {
    console.error('[api/assessment/response] POST failed:', err)
    return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
  }
}
