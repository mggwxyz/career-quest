import { eq } from 'drizzle-orm'
import InterestsClient from './_components/InterestsClient'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { userInterests } from '@/db/schema'

export default async function InterestsPage() {
  const auth = await getSession()
  if (!auth?.user) {
    return <InterestsClient initialInterests={[]} />
  }
  const rows = await db.select({ interest: userInterests.interest })
    .from(userInterests)
    .where(eq(userInterests.userId, auth.user.id))
    .orderBy(userInterests.createdAt)
  return <InterestsClient initialInterests={rows.map(r => r.interest)} />
}
