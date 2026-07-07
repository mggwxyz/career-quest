import { describe, expect, it } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { db as Db } from '@/db'
import { buildReassignStatements } from '@/lib/auth/merge-guest-data'

// Offline drizzle instance — neon() builds a lazy fetch client and never
// connects during .toSQL() rendering, so no live DB is required.
const db = drizzle({ client: neon('postgres://user:pass@localhost/db') }) as unknown as typeof Db

const GUEST = 'guest_11111111-1111-1111-1111-111111111111'
const REAL = 'real-user-42'
const STRANGER = 'guest_99999999-9999-9999-9999-999999999999'

describe('buildReassignStatements — isolation', () => {
  const statements = buildReassignStatements(db, GUEST, REAL)

  it('produces the full set of reassign statements', () => {
    expect(statements).toHaveLength(9)
  })

  it('every statement touches ONLY the guest id and the target id — never a third party', () => {
    for (const stmt of statements) {
      const params = (stmt as unknown as { toSQL: () => { params: unknown[] } }).toSQL().params
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
      const params = (stmt as unknown as { toSQL: () => { params: unknown[] } }).toSQL().params
      return params.includes(GUEST)
    })
    expect(withGuest.length).toBeGreaterThanOrEqual(6)
  })
})
