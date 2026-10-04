import 'server-only'
import { and, eq, isNull, sql } from 'drizzle-orm'
import type { db as Db } from '@/db'
import {
  assessmentSessions, careerRecommendations, careerUserActions,
  recommendationRuns, userInterests, userProfiles,
} from '@/db/schema'

/**
 * Build the ordered set of statements that reassign every row owned by a guest
 * id to a real user id. Isolation invariant: EVERY statement is scoped to
 * `user_id = fromId` (or the target's own rows for the one conflict pre-clear),
 * so a merge can only ever touch data the caller already owns via its signed
 * guest cookie — never another visitor's rows.
 *
 * Conflict policy (only reachable when merging into an account that already has
 * data — i.e. logging into an existing account mid-guest-session): the existing
 * account wins. Guest rows that would violate a uniqueness constraint are
 * dropped rather than clobbering the real user's data.
 */
export function buildReassignStatements(db: typeof Db, fromId: string, toId: string) {
  return [
    // user_profiles PK is user_id: move only if the target has no profile yet,
    // then drop any leftover guest profile.
    db.update(userProfiles).set({ userId: toId })
      .where(and(
        eq(userProfiles.userId, fromId),
        sql`NOT EXISTS (SELECT 1 FROM ${userProfiles} up WHERE up.user_id = ${toId})`,
      )),
    db.delete(userProfiles).where(eq(userProfiles.userId, fromId)),

    // user_interests is UNIQUE(user_id, interest): move only interests the
    // target doesn't already have, then drop the duplicates.
    db.update(userInterests).set({ userId: toId })
      .where(and(
        eq(userInterests.userId, fromId),
        sql`NOT EXISTS (SELECT 1 FROM ${userInterests} ui WHERE ui.user_id = ${toId} AND ui.interest = ${userInterests.interest})`,
      )),
    db.delete(userInterests).where(eq(userInterests.userId, fromId)),

    // assessment_sessions has a partial UNIQUE index of one active session per
    // user. Abandon the target's active session (rare) before moving the guest's
    // so the guest's in-progress work survives without violating the index.
    db.update(assessmentSessions).set({ abandonedAt: new Date() })
      .where(and(
        eq(assessmentSessions.userId, toId),
        isNull(assessmentSessions.completedAt),
        isNull(assessmentSessions.abandonedAt),
      )),
    db.update(assessmentSessions).set({ userId: toId })
      .where(eq(assessmentSessions.userId, fromId)),

    // No cross-user uniqueness on the rest — a plain reassign is safe.
    // assessment_responses ride along via their session FK (no user_id column).
    db.update(recommendationRuns).set({ userId: toId })
      .where(eq(recommendationRuns.userId, fromId)),
    db.update(careerRecommendations).set({ userId: toId })
      .where(eq(careerRecommendations.userId, fromId)),
    db.update(careerUserActions).set({ userId: toId })
      .where(eq(careerUserActions.userId, fromId)),
  ] as const
}

/**
 * Atomically reassign all data from a guest id to a real user id. Uses
 * `db.batch` (the neon-http driver's implicit-transaction primitive), so a
 * failure rolls the whole merge back — and because every statement is scoped to
 * `user_id = fromId`, a retry is idempotent and self-healing.
 */
export async function reassignGuestData(db: typeof Db, fromId: string, toId: string): Promise<void> {
  const statements = buildReassignStatements(db, fromId, toId)
  // db.batch requires a non-empty tuple; the builder always returns 8 statements.
  await db.batch(statements as unknown as [typeof statements[number], ...typeof statements[number][]])
}
