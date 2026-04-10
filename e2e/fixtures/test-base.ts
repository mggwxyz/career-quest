/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from '@playwright/test'
import postgres from 'postgres'
import { buildChatStreamBody } from './chat-response'

// Re-export expect so specs can import from one place
export { expect } from '@playwright/test'

const TEST_USER_EMAIL = 'test@example.com'
const TEST_USER_PASSWORD = 'testpassword123'

type TestFixtures = {
  /** A page already logged in as the pre-seeded test user. */
  authenticatedPage: Page
  /** Helpers for direct database operations. */
  dbUtils: {
    /** Truncate all app tables (preserves auth.users). */
    truncateAppTables: () => Promise<void>
    /** Get the pre-seeded test user's ID. */
    getTestUserId: () => Promise<string>
    /** Run arbitrary SQL. */
    sql: postgres.Sql
  }
  /** Set up the page.route mock for the chat streaming endpoint. */
  mockChatStream: (page: Page) => Promise<void>
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(TEST_USER_EMAIL)
    await page.getByLabel('Password').fill(TEST_USER_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    // Wait for redirect after login
    await page.waitForURL('/')
    await use(page)
  },

  dbUtils: async ({}, use) => {
    const dbUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    const sql = postgres(dbUrl)

    const truncateAppTables = async () => {
      await sql`TRUNCATE career_recommendations, quiz_answers, users CASCADE`
      // Re-insert the test user row in the app's users table
      // (auth.users is not truncated — it persists from the seed)
      const [authUser] = await sql`
        SELECT id, email FROM auth.users WHERE email = ${TEST_USER_EMAIL} LIMIT 1
      `
      if (authUser) {
        await sql`
          INSERT INTO users (id, email)
          VALUES (${authUser.id}, ${authUser.email})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    const getTestUserId = async (): Promise<string> => {
      const [row] = await sql`
        SELECT id FROM auth.users WHERE email = ${TEST_USER_EMAIL} LIMIT 1
      `
      return row.id as string
    }

    await use({ truncateAppTables, getTestUserId, sql })
    await sql.end()
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
