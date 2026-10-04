import 'server-only'
import { db } from '@/db'
import { appErrorEvents } from '@/db/schema'

const MAX_MESSAGE_LENGTH = 2_000
const MAX_NAME_LENGTH = 160
const MAX_STACK_LENGTH = 8_000
const MAX_DIGEST_LENGTH = 200
const MAX_ROUTE_LENGTH = 500
const MAX_METHOD_LENGTH = 20
const MAX_USER_AGENT_LENGTH = 500
const MAX_COMPONENT_STACK_LENGTH = 8_000

export type ErrorEventSource = 'client' | 'server'

export interface CaptureErrorEventInput {
  source: ErrorEventSource
  message: string
  severity?: 'error' | 'warning'
  name?: string | null
  stack?: string | null
  digest?: string | null
  route?: string | null
  method?: string | null
  userId?: string | null
  userAgent?: string | null
  componentStack?: string | null
  metadata?: Record<string, unknown>
}

function trimText(value: string | null | undefined, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function safeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {}
  return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>
}

export function errorToEventFields(error: unknown) {
  if (error instanceof Error) {
    const digest = typeof (error as Error & { digest?: unknown }).digest === 'string'
      ? (error as Error & { digest: string }).digest
      : null
    return {
      name: error.name,
      message: error.message || 'Unknown error',
      stack: error.stack ?? null,
      digest,
    }
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const err = error as { name?: unknown, message?: unknown, stack?: unknown, digest?: unknown }
    const name = typeof err.name === 'string' ? err.name : null
    const message = String(err.message ?? 'Unknown error')
    const stack = typeof err.stack === 'string' ? err.stack : null
    const digest = typeof err.digest === 'string'
      ? err.digest
      : null
    return { name, message, stack, digest }
  }
  return {
    name: null,
    message: typeof error === 'string' ? error : 'Unknown error',
    stack: null,
    digest: null,
  }
}

export async function captureErrorEvent(input: CaptureErrorEventInput): Promise<void> {
  try {
    await db.insert(appErrorEvents).values({
      source: input.source,
      severity: input.severity ?? 'error',
      message: trimText(input.message, MAX_MESSAGE_LENGTH) ?? 'Unknown error',
      name: trimText(input.name, MAX_NAME_LENGTH),
      stack: trimText(input.stack, MAX_STACK_LENGTH),
      digest: trimText(input.digest, MAX_DIGEST_LENGTH),
      route: trimText(input.route, MAX_ROUTE_LENGTH),
      method: trimText(input.method, MAX_METHOD_LENGTH),
      userId: trimText(input.userId, MAX_ROUTE_LENGTH),
      userAgent: trimText(input.userAgent, MAX_USER_AGENT_LENGTH),
      componentStack: trimText(input.componentStack, MAX_COMPONENT_STACK_LENGTH),
      metadata: safeMetadata(input.metadata),
    })
  }
  catch (err) {
    console.error('[error-events] capture failed:', err)
  }
}
