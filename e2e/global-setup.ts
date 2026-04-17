import { writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import path from 'path'
import { neon } from '@neondatabase/serverless'

export const TEST_USER_FILE = path.resolve(__dirname, '.test-user.json')

const BASE_URL = 'http://localhost:3000'
const DEV_SERVER_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 500

export type TestUserRecord = {
  email: string
  password: string
  userId: string
}

async function waitForDevServer(): Promise<void> {
  const deadline = Date.now() + DEV_SERVER_TIMEOUT_MS
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL, { method: 'GET' })
      // Any HTTP response means the server is up (even 4xx is fine)
      if (res.status > 0) return
    }
    catch (err) {
      lastError = err
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error(`[e2e] Dev server at ${BASE_URL} did not become reachable within ${DEV_SERVER_TIMEOUT_MS}ms: ${String(lastError)}`)
}

/**
 * Create a fresh test user via Better Auth's sign-up endpoint. The Neon Auth
 * SDK has no admin API for user creation in this version, so the only path is
 * self-serve sign-up. We use a UUID-suffixed email so each test run gets an
 * isolated identity (the previous test run's identity is left behind in
 * neon_auth.users_sync — which is read-only — but its quizAnswers /
 * careerRecommendations rows are cleaned up in teardown).
 */
async function createTestUserViaApi(): Promise<TestUserRecord> {
  const email = `e2e-${randomUUID()}@test.career-quest.local`
  const password = 'testpassword123'
  const name = email.split('@')[0]

  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '<no body>')
    throw new Error(`[e2e] Sign-up failed (${res.status}): ${text}`)
  }

  // Better Auth's sign-up/email returns { token, user: { id, email, name, ... } }
  const body = await res.json() as { user?: { id?: string }, token?: string }
  const userId = body?.user?.id
  if (!userId) {
    throw new Error(`[e2e] Sign-up response did not include user.id: ${JSON.stringify(body)}`)
  }

  return { email, password, userId }
}

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('[e2e] DATABASE_URL must be set (load .env.local first)')
  }

  console.log('[e2e] Waiting for dev server...')
  await waitForDevServer()
  console.log('[e2e] Dev server is up.')

  console.log('[e2e] Creating test user via /api/auth/sign-up/email...')
  const testUser = await createTestUserViaApi()
  console.log(`[e2e] Test user created: ${testUser.email} (id=${testUser.userId})`)

  // Wipe any stale app data for this user id (paranoid — id is freshly minted,
  // but a UUID collision or partially-failed previous run could leave junk).
  const sql = neon(databaseUrl)
  await sql`DELETE FROM quiz_answers WHERE user_id = ${testUser.userId}`
  await sql`DELETE FROM career_recommendations WHERE user_id = ${testUser.userId}`

  writeFileSync(TEST_USER_FILE, JSON.stringify(testUser, null, 2) + '\n')
  console.log(`[e2e] Wrote ${TEST_USER_FILE}`)
}
