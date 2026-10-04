import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { captureErrorEvent } from '@/lib/error-events'
import { rateLimit } from '@/lib/rate-limit'

const MAX_BODY_BYTES = 32 * 1024
const RATE_LIMIT = 30
const RATE_LIMIT_WINDOW_MS = 60_000

const BodySchema = z.object({
  source: z.literal('client').default('client'),
  message: z.string()
    .min(1)
    .max(2_000),
  name: z.string()
    .max(160)
    .nullish(),
  stack: z.string()
    .max(8_000)
    .nullish(),
  digest: z.string()
    .max(200)
    .nullish(),
  route: z.string()
    .max(500)
    .nullish(),
  componentStack: z.string()
    .max(8_000)
    .nullish(),
  metadata: z.record(z.unknown()).optional(),
})

function clientKey(request: Request, userId: string | null): string {
  if (userId) return `error-event:user:${userId}`
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  return `error-event:anon:${forwardedFor ?? userAgent}`
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Body too large' }, { status: 413 })
  }

  const session = await getSession().catch(() => null)
  const userId = session?.user?.id ?? null
  if (!rateLimit(clientKey(request, userId), RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many error events' }, { status: 429 })
  }

  let raw = ''
  try {
    raw = await request.text()
  }
  catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Body too large' }, { status: 413 })
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw || '{}')
  }
  catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(parsedJson)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  await captureErrorEvent({
    ...parsed.data,
    source: 'client',
    method: request.method,
    userId,
    userAgent: request.headers.get('user-agent'),
  })

  return new NextResponse(null, { status: 202 })
}
