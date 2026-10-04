import { describe, expect, it, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { db as Db } from '@/db'
import { buildReassignStatements, reassignGuestData } from '@/lib/auth/merge-guest-data'

// Offline drizzle instance — neon() builds a lazy fetch client and never
// connects during .toSQL() rendering, so no live DB is required.
const db = drizzle({ client: neon('postgres://user:pass@localhost/db') }) as unknown as typeof Db

const GUEST = 'guest_11111111-1111-1111-1111-111111111111'
const REAL = 'real-user-42'
const STRANGER = 'guest_99999999-9999-9999-9999-999999999999'

type RenderableStatement = {
  toSQL: () => {
    sql: string
    params: unknown[]
  }
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/

function normalizeParam(param: unknown) {
  if (param instanceof Date) {
    return '[date]'
  }
  if (typeof param === 'string' && ISO_TIMESTAMP.test(param)) {
    return '[date]'
  }
  return param
}

function render(statement: unknown) {
  const { sql, params } = (statement as RenderableStatement).toSQL()
  return {
    sql,
    params: params.map(normalizeParam),
  }
}

describe('buildReassignStatements — isolation', () => {
  const statements = buildReassignStatements(db, GUEST, REAL)

  it('produces the full set of reassign statements', () => {
    expect(statements).toHaveLength(9)
  })

  it('every statement touches ONLY the guest id and the target id — never a third party', () => {
    for (const stmt of statements) {
      const params = render(stmt).params
      // Never another visitor's guest id, and no guest id other than our own.
      expect(params).not.toContain(STRANGER)
      const foreignGuest = params.some(
        p => typeof p === 'string' && p.startsWith('guest_') && p !== GUEST,
      )
      expect(foreignGuest).toBe(false)
      // Any account-id param must be the verified target.
      const foreignUser = params.some(
        p => typeof p === 'string' && !p.startsWith('guest_')
          && /^real-|^user-/.test(p) && p !== REAL,
      )
      expect(foreignUser).toBe(false)
    }
  })

  it('scopes the guest-owned reassigns to the guest id (WHERE user_id = guest)', () => {
    // At least the six guest-scoped statements must bind the guest id; the lone
    // exception is the pre-clear that abandons the TARGET's active session.
    const withGuest = statements.filter((stmt) => {
      const params = render(stmt).params
      return params.includes(GUEST)
    })
    expect(withGuest.length).toBeGreaterThanOrEqual(6)
  })

  it('keeps the account profile when the target already has one', () => {
    const profileMove = render(statements[0])
    const guestProfileDelete = render(statements[1])

    expect(profileMove.sql).toContain('update "user_profiles"')
    expect(profileMove.sql).toContain('NOT EXISTS')
    expect(profileMove.sql).toContain('up.user_id')
    expect(profileMove.params).toEqual([REAL, GUEST, REAL])

    expect(guestProfileDelete.sql).toContain('delete from "user_profiles"')
    expect(guestProfileDelete.params).toEqual([GUEST])
  })

  it('moves only interests that do not already exist on the account', () => {
    const interestsMove = render(statements[2])
    const guestInterestsDelete = render(statements[3])

    expect(interestsMove.sql).toContain('update "user_interests"')
    expect(interestsMove.sql).toContain('NOT EXISTS')
    expect(interestsMove.sql).toContain('ui.user_id')
    expect(interestsMove.sql).toContain('ui.interest = "user_interests"."interest"')
    expect(interestsMove.params).toEqual([REAL, GUEST, REAL])

    expect(guestInterestsDelete.sql).toContain('delete from "user_interests"')
    expect(guestInterestsDelete.params).toEqual([GUEST])
  })

  it('abandons the target active assessment session before reassigning guest sessions', () => {
    const abandonTargetActiveSession = render(statements[4])
    const reassignGuestSessions = render(statements[5])

    expect(abandonTargetActiveSession.sql).toContain('update "assessment_sessions"')
    expect(abandonTargetActiveSession.sql).toContain('"completed_at" is null')
    expect(abandonTargetActiveSession.sql).toContain('"abandoned_at" is null')
    expect(abandonTargetActiveSession.params).toHaveLength(2)
    expect(abandonTargetActiveSession.params[1]).toBe(REAL)
    expect(abandonTargetActiveSession.params).not.toContain(GUEST)

    expect(reassignGuestSessions.sql).toContain('update "assessment_sessions"')
    expect(reassignGuestSessions.params).toEqual([REAL, GUEST])
  })
})

describe('reassignGuestData', () => {
  it('batches the full ordered merge statement set atomically', async () => {
    const batch = vi.fn().mockResolvedValue([])
    const batchDb = db as typeof Db & { batch: typeof batch }
    const originalBatch = batchDb.batch
    batchDb.batch = batch

    try {
      await reassignGuestData(batchDb, GUEST, REAL)
    }
    finally {
      batchDb.batch = originalBatch
    }

    expect(batch).toHaveBeenCalledTimes(1)
    const [batched] = batch.mock.calls[0] as [unknown[]]
    const expectedStatements = buildReassignStatements(db, GUEST, REAL)
    expect(batched).toHaveLength(9)
    expect(batched.map(render)).toEqual(expectedStatements.map(render))
  })
})
