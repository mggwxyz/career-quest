import { existsSync, readFileSync, unlinkSync } from 'fs'
import { neon } from '@neondatabase/serverless'
import { TEST_USER_FILE, type TestUserRecord } from './global-setup'

export default async function globalTeardown() {
  if (!existsSync(TEST_USER_FILE)) {
    console.log('[e2e] No test-user file to clean up.')
    return
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.warn('[e2e] DATABASE_URL not set during teardown — skipping DB cleanup.')
    unlinkSync(TEST_USER_FILE)
    return
  }

  try {
    const testUser = JSON.parse(readFileSync(TEST_USER_FILE, 'utf-8')) as TestUserRecord
    const sql = neon(databaseUrl)

    // We can't delete the Neon Auth identity itself (neon_auth.users_sync is
    // managed and read-only), but we can clean up the app rows keyed off the
    // user id.
    await sql`DELETE FROM quiz_answers WHERE user_id = ${testUser.userId}`
    await sql`DELETE FROM career_recommendations WHERE user_id = ${testUser.userId}`
    console.log(`[e2e] Cleaned up app data for ${testUser.email}`)
  }
  catch (err) {
    console.warn('[e2e] Teardown DB cleanup failed (continuing):', err)
  }
  finally {
    unlinkSync(TEST_USER_FILE)
    console.log('[e2e] Removed test-user file.')
  }
}
