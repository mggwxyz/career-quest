import { NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { assessmentResponses, assessmentSessions } from '@/db/schema'
import { getOrCreateUserId } from '@/lib/auth/identity'
import {
  abandonActiveSessionsForUser, createNewSession,
  loadActiveSession, rebuildSessionFromLog,
} from '@/lib/assessment/serverSession'
import { items } from '@/app/_data/items'
import { chooseFirstItem, finalize, startSession } from '@/lib/assessment'

const BodySchema = z.object({
  gradeBand: z.enum(['middle', 'early-hs', 'late-hs', 'college']).nullish()
    .transform(v => v ?? undefined),
})

export async function POST(request: Request) {
  try {
    const { id: userId } = await getOrCreateUserId()
    const parsed = BodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid gradeBand' }, { status: 400 })
    }

    await abandonActiveSessionsForUser(userId)
    const { sessionId, firstItem } = await createNewSession(userId, parsed.data.gradeBand)

    return NextResponse.json({ sessionId, item: firstItem, itemsAnswered: 0 })
  }
  catch (err) {
    console.error('[api/assessment/session] POST failed:', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { id: userId } = await getOrCreateUserId()
    const active = await loadActiveSession(userId)
    if (!active) {
      return NextResponse.json({ active: null })
    }

    const submitted = active.responses.filter(r => r.respondedAt !== null)
    const answeredCount = submitted.filter(r => r.choice === 1 || r.choice === 2).length

    if (submitted.length === 0) {
      const unanswered = active.responses.find(r => r.respondedAt === null)
      if (unanswered) {
        const storedItem = items.find(i => i.id === unanswered.itemId)
        if (!storedItem) {
          // Item bank changed since session was created — the stored itemId no
          // longer exists, so we cannot resume without corrupting the audit
          // trail. Abandon the session so the client starts fresh.
          console.warn(
            '[api/assessment/session] GET: stored itemId %s not in bank for session %s; abandoning',
            unanswered.itemId, active.sessionId,
          )
          await abandonActiveSessionsForUser(userId)
          return NextResponse.json({ active: null })
        }
        return NextResponse.json({
          active: {
            sessionId: active.sessionId,
            gradeBand: active.gradeBand ?? null,
            itemsAnswered: 0,
            item: storedItem,
          },
        })
      }
      const firstItem = chooseFirstItem(items, startSession({ bank: items, gradeBand: active.gradeBand }))
      return NextResponse.json({
        active: {
          sessionId: active.sessionId,
          gradeBand: active.gradeBand ?? null,
          itemsAnswered: 0,
          item: firstItem,
        },
      })
    }

    const { session: engineSession, lastAdvance } = rebuildSessionFromLog({
      gradeBand: active.gradeBand,
      responses: active.responses,
    })
    if (lastAdvance?.kind === 'stop') {
      // Replay can hit the stop cap on a session that was never finalized
      // (e.g. a legacy skip log, or a completion write that failed after the
      // last response). Persist completion here so /api/assessment/result
      // returns this session's result instead of a stale or missing one.
      const result = finalize(engineSession)
      // Guard on the session still being active: a concurrent POST may have
      // abandoned it between loadActiveSession and this write, and completing
      // an abandoned session would let it surface as the latest result.
      await db.update(assessmentSessions).set({
        completedAt: new Date(),
        result,
        inconsistency: result.meta.inconsistencyFlag,
      })
        .where(and(
          eq(assessmentSessions.id, active.sessionId),
          isNull(assessmentSessions.completedAt),
          isNull(assessmentSessions.abandonedAt),
        ))
      return NextResponse.json({
        active: {
          sessionId: active.sessionId,
          gradeBand: active.gradeBand ?? null,
          itemsAnswered: answeredCount,
          item: null,
          stopped: true,
        },
      })
    }
    // defense-in-depth — signals DB/engine skew when log contains only unknown item IDs
    if (!lastAdvance) {
      console.warn(
        '[api/assessment/session] GET: rebuildSessionFromLog returned no advance despite submittedCount=%d for session %s',
        submitted.length, active.sessionId,
      )
    }
    const nextItem = lastAdvance?.kind === 'next' ? lastAdvance.nextItem : null
    if (nextItem && !active.responses.some(r => r.respondedAt === null && r.itemId === nextItem.id)) {
      // Old skip handling either omitted the next row or logged the skipped item
      // again. Preserve that history and make the replayed item answerable.
      const nextPosition = Math.max(0, ...active.responses.map(r => r.position)) + 1
      await db.insert(assessmentResponses).values({
        sessionId: active.sessionId,
        itemId: nextItem.id,
        position: nextPosition,
      })
        .onConflictDoNothing()
    }
    return NextResponse.json({
      active: {
        sessionId: active.sessionId,
        gradeBand: active.gradeBand ?? null,
        itemsAnswered: answeredCount,
        item: nextItem,
      },
    })
  }
  catch (err) {
    console.error('[api/assessment/session] GET failed:', err)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}
