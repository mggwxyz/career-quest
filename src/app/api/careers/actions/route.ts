import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { careerUserActions } from '@/db/schema'

const BodySchema = z.object({
  onetId: z.string().regex(/^\d{2}-\d{4}\.\d{2}$/),
  action: z.enum(['saved']),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  await db.insert(careerUserActions).values({
    userId: session.user.id,
    onetId: parsed.data.onetId,
    action: parsed.data.action,
  })

  return NextResponse.json({ ok: true })
}
