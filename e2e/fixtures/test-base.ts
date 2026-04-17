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
  /**
   * Seed the Zustand store in localStorage so pages that check for
   * quiz answers (e.g. /careers) won't redirect away.
   */
  seedZustandStore: (page: Page, overrides?: { answers?: Record<string, number>, interests?: string[] }) => Promise<void>
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const testUser = loadTestUser()
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(testUser.email)
    await page.getByLabel('Password').fill(testUser.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    // Wait for redirect after login
    await page.waitForURL('/')
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
      await sql`DELETE FROM quiz_answers WHERE user_id = ${testUser.userId}`
      await sql`DELETE FROM career_recommendations WHERE user_id = ${testUser.userId}`
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

  seedZustandStore: async ({}, use) => {
    const seed = async (page: Page, overrides?: { answers?: Record<string, number>, interests?: string[] }) => {
      // Build default quiz answers for all 30 questions so getDeckResults() returns data
      const defaultAnswers: Record<string, number> = {}
      for (let i = 1; i <= 10; i++) {
        defaultAnswers[`riasec-${i}`] = 1
        defaultAnswers[`workvalue-${i}`] = 1
        defaultAnswers[`env-${i}`] = 1
      }

      const storeState = {
        state: {
          interests: overrides?.interests ?? ['Technology', 'Science'],
          currentQuestionIndex: 30,
          answers: overrides?.answers ?? defaultAnswers,
          skippedQuestions: [],
        },
        version: 0,
      }

      await page.evaluate((state) => {
        localStorage.setItem('app-store', JSON.stringify(state))
      }, storeState)
    }
    await use(seed)
  },
})
