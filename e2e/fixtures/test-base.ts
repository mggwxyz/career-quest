/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from '@playwright/test'
import { readFileSync } from 'fs'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { buildChatStreamBody } from './chat-response'
import { TEST_USER_FILE, type TestUserRecord } from '../global-setup'

// Re-export expect so specs can import from one place
export { expect } from '@playwright/test'

function loadTestUser(): TestUserRecord {
  return JSON.parse(readFileSync(TEST_USER_FILE, 'utf-8')) as TestUserRecord
}

type TestFixtures = {
  /** A page already logged in as the per-run test user. */
  authenticatedPage: Page
  /** Helpers for direct database operations. */
  dbUtils: {
    /** Delete this run's test-user rows from the app tables. */
    truncateAppTables: () => Promise<void>
    /** Get the per-run test user's ID (from the file global-setup wrote). */
    getTestUserId: () => Promise<string>
    /** Tagged-template SQL via the Neon HTTP driver. */
    sql: NeonQueryFunction<false, false>
  }
  /** Set up the page.route mock for the chat streaming endpoint. */
  mockChatStream: (page: Page) => Promise<void>
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // The browser context is pre-authenticated via storageState loaded in
    // playwright.config.ts (written once by global-setup). This avoids
    // hitting Neon Auth's login rate limit when many tests run back-to-back.
    await use(page)
  },

  dbUtils: async ({}, use) => {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('[e2e] DATABASE_URL not set — cannot run DB fixtures')
    }
    const sql = neon(dbUrl)
    const testUser = loadTestUser()

    const truncateAppTables = async () => {
      // Scoped delete: we only own this run's user_id rows. We cannot TRUNCATE
      // because neon_auth.users_sync (managed) lives in the same DB and could
      // reference rows from other concurrent test users in the future.
      await sql`DELETE FROM career_recommendations WHERE user_id = ${testUser.userId}`
      await sql`DELETE FROM recommendation_runs WHERE user_id = ${testUser.userId}`
      await sql`DELETE FROM assessment_responses WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id = ${testUser.userId})`
      await sql`DELETE FROM assessment_sessions WHERE user_id = ${testUser.userId}`
      await sql`DELETE FROM user_interests WHERE user_id = ${testUser.userId}`
      await sql`DELETE FROM user_profiles WHERE user_id = ${testUser.userId}`
    }

    const getTestUserId = async (): Promise<string> => testUser.userId

    await use({ truncateAppTables, getTestUserId, sql })
    // No connection to close — neon() is HTTP/fetch-based.
  },

  mockChatStream: async ({}, use) => {
    const setupMock = async (page: Page) => {
      await page.route('**/api/careers/chat', async (route) => {
        const body = buildChatStreamBody()
        await route.fulfill({
          status: 200,
          contentType: 'text/plain; charset=utf-8',
          headers: {
            'x-vercel-ai-data-stream': 'v1',
          },
          body,
        })
      })
    }
    await use(setupMock)
  },
})
