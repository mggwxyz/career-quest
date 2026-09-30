import type { NeonQueryFunction } from '@neondatabase/serverless'
import { parseGuestCookie } from '../../src/lib/auth/guest'

export async function cleanupGuestData(
  sql: NeonQueryFunction<false, false>,
  cookieValue: string | undefined,
): Promise<void> {
  const guestId = parseGuestCookie(cookieValue)
  if (!guestId) return

  await sql`DELETE FROM career_recommendations WHERE user_id = ${guestId}`
  await sql`DELETE FROM recommendation_runs WHERE user_id = ${guestId}`
  await sql`DELETE FROM assessment_responses WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id = ${guestId})`
  await sql`DELETE FROM assessment_sessions WHERE user_id = ${guestId}`
  await sql`DELETE FROM user_interests WHERE user_id = ${guestId}`
  await sql`DELETE FROM user_profiles WHERE user_id = ${guestId}`
}
