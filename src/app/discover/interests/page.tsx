import { eq } from 'drizzle-orm'
import InterestsClient from './_components/InterestsClient'
import { getUserId } from '@/lib/auth/identity'
import { db } from '@/db'
import { userInterests } from '@/db/schema'

export default async function InterestsPage() {
  // Guests can pick interests with zero signup (G01); their guest cookie is
  // minted on the first save via /api/user/interests.
  const identity = await getUserId()
  const rows = identity
    ? await db.select({ interest: userInterests.interest })
      .from(userInterests)
      .where(eq(userInterests.userId, identity.id))
      .orderBy(userInterests.createdAt)
    : []
  return <InterestsClient initialInterests={rows.map(r => r.interest)} />
}
