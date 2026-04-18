import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import {
  abandonActiveSessionsForUser, createNewSession, isGradeBand,
  loadActiveSession, rebuildSessionFromLog,
} from '@/lib/assessment/serverSession'
import { items } from '@/app/_data/items'
import { chooseFirstItem, startSession } from '@/lib/assessment'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const body = await request.json().catch(() => ({})) as { gradeBand?: unknown }
    const gradeBand = body.gradeBand === undefined || body.gradeBand === null
      ? undefined
      : (isGradeBand(body.gradeBand) ? body.gradeBand : '__invalid__')
    if (gradeBand === '__invalid__') {
      return NextResponse.json({ error: 'Invalid gradeBand' }, { status: 400 })
    }

    await abandonActiveSessionsForUser(session.user.id)
    const { sessionId, firstItem } = await createNewSession(session.user.id, gradeBand)

    return NextResponse.json({ sessionId, item: firstItem, itemsAnswered: 0 })
  }
  catch (err) {
    console.error('[api/assessment/session] POST failed:', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const active = await loadActiveSession(session.user.id)
    if (!active) {
      return NextResponse.json({ active: null })
    }

    const answered = active.responses.filter(r => r.choice !== null && r.choice !== undefined)
    const answeredCount = answered.length

    if (answeredCount === 0) {
      const unanswered = active.responses.find(r => r.choice === null || r.choice === undefined)
      const firstItem = unanswered
        ? items.find(i => i.id === unanswered.itemId) ?? chooseFirstItem(items, startSession({ bank: items, gradeBand: active.gradeBand }))
        : chooseFirstItem(items, startSession({ bank: items, gradeBand: active.gradeBand }))
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
