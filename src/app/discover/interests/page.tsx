import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import InterestsClient from './_components/InterestsClient'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { userInterests } from '@/db/schema'

export default async function InterestsPage() {
  const auth = await getSession()
  if (!auth?.user) {
    redirect('/auth/login?redirect=/discover/interests')
  }
  const rows = await db.select({ interest: userInterests.interest })
    .from(userInterests)
    .where(eq(userInterests.userId, auth.user.id))
    .orderBy(userInterests.createdAt)
  return <InterestsClient initialInterests={rows.map(r => r.interest)} />
}
