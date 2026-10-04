import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import {
  assessmentSessions,
  careerRecommendations,
  careerUserActions,
  recommendationRuns,
  userInterests,
  userProfiles,
} from '@/db/schema'
import { isGuestUserId } from './token'

export async function mergeGuestDataIntoUser(args: {
  guestUserId: string
  userId: string
}): Promise<{ merged: boolean, interestsMerged: number }> {
  const { guestUserId, userId } = args
  if (!isGuestUserId(guestUserId) || guestUserId === userId) {
    return { merged: false, interestsMerged: 0 }
  }

  const guestInterestRows = await db.select({
    interest: userInterests.interest,
    source: userInterests.source,
  })
    .from(userInterests)
    .where(eq(userInterests.userId, guestUserId))

  let interestsMerged = 0
  if (guestInterestRows.length > 0) {
    const existingRows = await db.select({ interest: userInterests.interest })
      .from(userInterests)
      .where(eq(userInterests.userId, userId))
    const existing = new Set(existingRows.map(row => row.interest))
    const toInsert = guestInterestRows
      .filter(row => !existing.has(row.interest))
      .map(row => ({ userId, interest: row.interest, source: row.source }))

    if (toInsert.length > 0) {
      await db.insert(userInterests).values(toInsert)
      interestsMerged = toInsert.length
    }
    await db.delete(userInterests).where(eq(userInterests.userId, guestUserId))
  }

  // Preserve the guest in-flight assessment by making room for it if the
  // authenticated account already has an active session.
  await db.update(assessmentSessions)
    .set({ abandonedAt: new Date() })
    .where(and(
      eq(assessmentSessions.userId, userId),
      isNull(assessmentSessions.completedAt),
      isNull(assessmentSessions.abandonedAt),
    ))

  await db.update(assessmentSessions)
    .set({ userId })
    .where(eq(assessmentSessions.userId, guestUserId))

  await db.update(recommendationRuns)
    .set({ userId })
    .where(eq(recommendationRuns.userId, guestUserId))

  await db.update(careerRecommendations)
    .set({ userId })
    .where(eq(careerRecommendations.userId, guestUserId))

  await db.update(careerUserActions)
    .set({ userId })
    .where(eq(careerUserActions.userId, guestUserId))

  const guestProfiles = await db.select({
    userId: userProfiles.userId,
    gradeBand: userProfiles.gradeBand,
  })
    .from(userProfiles)
    .where(eq(userProfiles.userId, guestUserId))

  if (guestProfiles.length > 0) {
    const existingProfiles = await db.select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
    if (existingProfiles.length === 0) {
      await db.insert(userProfiles).values({
        userId,
        gradeBand: guestProfiles[0].gradeBand,
      })
    }
    await db.delete(userProfiles).where(eq(userProfiles.userId, guestUserId))
  }

  return { merged: true, interestsMerged }
}
