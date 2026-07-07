import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrCreateUserId } from '@/lib/auth/identity'
import {
  abandonActiveSessionsForUser, createNewSession,
  loadActiveSession, rebuildSessionFromLog,
} from '@/lib/assessment/serverSession'
import { items } from '@/app/_data/items'
import { chooseFirstItem, startSession } from '@/lib/assessment'

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

    const answered = active.responses.filter(r => r.choice !== null && r.choice !== undefined)
    const answeredCount = answered.length

    if (answeredCount === 0) {
      const unanswered = active.responses.find(r => r.choice === null || r.choice === undefined)
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

    const { lastAdvance } = rebuildSessionFromLog({
      gradeBand: active.gradeBand,
      responses: answered.map(a => ({ itemId: a.itemId, choice: a.choice, responseMs: a.responseMs })),
    })
    if (lastAdvance?.kind === 'stop') {
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
        '[api/assessment/session] GET: rebuildSessionFromLog returned no advance despite answeredCount=%d for session %s',
        answeredCount, active.sessionId,
      )
    }
    const nextItem = lastAdvance?.kind === 'next' ? lastAdvance.nextItem : null
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
