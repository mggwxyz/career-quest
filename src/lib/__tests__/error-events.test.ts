import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
  },
}))

import { captureErrorEvent, errorToEventFields } from '@/lib/error-events'
import { db } from '@/db'

type Mock = ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  ;(db.insert as Mock).mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  })
})

describe('errorToEventFields', () => {
  it('extracts useful fields from Error objects', () => {
    const err = Object.assign(new Error('boom'), { digest: 'abc123' })

    expect(errorToEventFields(err)).toMatchObject({
      name: 'Error',
      message: 'boom',
      digest: 'abc123',
    })
  })
})

describe('captureErrorEvent', () => {
  it('trims large values before inserting', async () => {
    await captureErrorEvent({
      source: 'server',
      message: 'x'.repeat(3_000),
      stack: 's'.repeat(9_000),
      route: '/x',
      metadata: { ok: true },
    })

    const insertChain = (db.insert as Mock).mock.results[0].value
    const values = insertChain.values.mock.calls[0][0]
    expect(values.message).toHaveLength(2_000)
    expect(values.stack).toHaveLength(8_000)
    expect(values.metadata).toEqual({ ok: true })
  })
})
