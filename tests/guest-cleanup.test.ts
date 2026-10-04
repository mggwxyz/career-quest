import type { NeonQueryFunction } from '@neondatabase/serverless'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanupGuestData } from '../e2e/fixtures/guest-cleanup'
import { newGuestId, signGuestCookie } from '../src/lib/auth/guest'

beforeEach(() => {
  vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'guest-cleanup-test-secret')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('guest E2E cleanup scope', () => {
  it('parameterizes every delete with only this browser guest identity', async () => {
    const guestId = newGuestId()
    const otherGuestId = newGuestId()
    const execute = vi.fn().mockResolvedValue([])
    const sql = execute as unknown as NeonQueryFunction<false, false>

    await cleanupGuestData(sql, signGuestCookie(guestId))

    expect(execute).toHaveBeenCalledTimes(6)
    for (const [parts, ...values] of execute.mock.calls) {
      expect(values).toEqual([guestId])
      expect(values).not.toContain(otherGuestId)
      const statement = (parts as TemplateStringsArray).join('?')
      expect(statement).not.toMatch(/\bLIKE\b/)
      expect(statement).toContain('WHERE user_id = ?')
    }
    // Delete dependent recommendations before the run and assessment session.
    const statements = execute.mock.calls.map(([parts]) => (parts as TemplateStringsArray).join('?'))
    expect(statements[0]).toContain('DELETE FROM career_recommendations')
    expect(statements[1]).toContain('DELETE FROM recommendation_runs')
    expect(statements[2]).toContain('DELETE FROM assessment_responses')
    expect(statements[3]).toContain('DELETE FROM assessment_sessions')
  })

  it.each([undefined, '', 'malformed', 'user-account.signature'])(
    'does not delete data for an absent or invalid cookie: %s',
    async (cookie) => {
      const execute = vi.fn().mockResolvedValue([])
      await cleanupGuestData(execute as unknown as NeonQueryFunction<false, false>, cookie)
      expect(execute).not.toHaveBeenCalled()
    },
  )

  it('does not delete another guest when the cookie identity is tampered with', async () => {
    const cookie = signGuestCookie(newGuestId())
    const forgedCookie = `${newGuestId()}${cookie.slice(cookie.lastIndexOf('.'))}`
    const execute = vi.fn().mockResolvedValue([])

    await cleanupGuestData(execute as unknown as NeonQueryFunction<false, false>, forgedCookie)

    expect(execute).not.toHaveBeenCalled()
  })

  it('keeps simultaneous guest cleanups scoped to their respective identities', async () => {
    const guestA = newGuestId()
    const guestB = newGuestId()
    const executeA = vi.fn().mockResolvedValue([])
    const executeB = vi.fn().mockResolvedValue([])

    await Promise.all([
      cleanupGuestData(executeA as unknown as NeonQueryFunction<false, false>, signGuestCookie(guestA)),
      cleanupGuestData(executeB as unknown as NeonQueryFunction<false, false>, signGuestCookie(guestB)),
    ])

    for (const [execute, guestId] of [[executeA, guestA], [executeB, guestB]] as const) {
      expect(execute).toHaveBeenCalledTimes(6)
      for (const [, ...values] of execute.mock.calls) expect(values).toEqual([guestId])
    }
  })

  it('reports database cleanup failures', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('cleanup failed'))

    await expect(cleanupGuestData(
      execute as unknown as NeonQueryFunction<false, false>,
      signGuestCookie(newGuestId()),
    )).rejects.toThrow('cleanup failed')
  })
})
