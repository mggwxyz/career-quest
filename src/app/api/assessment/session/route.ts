import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import {
  abandonActiveSessionsForUser, createNewSession, isGradeBand,
} from '@/lib/assessment/serverSession'

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
