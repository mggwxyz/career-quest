import { randomUUID } from 'crypto'
import type { Page } from '@playwright/test'
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { test, expect } from '../fixtures/test-base'
import { GUEST_COOKIE_NAME, guestCookieValueToUserId } from '@/lib/guest/token'

test.describe('Guest discovery flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.setTimeout(60_000)

  test('anonymous user completes assessment and sees a profile', async ({ page }) => {
    await completeGuestAssessment(page)

    await expect(page).toHaveURL('/discover/profile')
    await expect(page.getByText('Your Holland Code')).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign up to save/i })).toBeVisible()
  })

  test('guest assessment and interests merge into the account after sign-up', async ({ page, dbUtils }) => {
    let guestUserId: string | null = null
    let authUserId: string | null = null

    try {
      await completeGuestAssessment(page)
      guestUserId = await getGuestUserId(page)

      const [guestSession] = await dbUtils.sql`
        SELECT result
        FROM assessment_sessions
        WHERE user_id = ${guestUserId} AND completed_at IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 1
      `
      expect(guestSession?.result).toBeTruthy()

      const guestInterestRows = await dbUtils.sql`
        SELECT interest
        FROM user_interests
        WHERE user_id = ${guestUserId}
        ORDER BY created_at
      `
      const guestInterests = guestInterestRows.map(row => row.interest)
      expect(guestInterests).toEqual(['Technology'])

      const email = `guest-merge-${randomUUID()}@test.career-quest.local`
      await page.getByRole('link', { name: /Sign up to save/i }).click()
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password', { exact: true }).fill('testpassword123')
      await page.getByLabel('Repeat Password').fill('testpassword123')
      await page.getByRole('button', { name: 'Create Account' }).click()
      await page.waitForURL('/discover/profile')

      await expect.poll(async () => {
        const user = await page.evaluate(async () => {
          const res = await fetch('/api/user')
          if (!res.ok) return null
          return res.json() as Promise<{ id?: string }>
        })
        return user?.id ?? null
      }, { timeout: 10_000 }).not.toBeNull()
      authUserId = await page.evaluate(async () => {
        const res = await fetch('/api/user')
        const user = await res.json() as { id: string }
        return user.id
      })

      await expect.poll(async () => {
        const rows = await dbUtils.sql`
          SELECT result
          FROM assessment_sessions
          WHERE user_id = ${authUserId} AND completed_at IS NOT NULL
          ORDER BY completed_at DESC
          LIMIT 1
        `
        return rows[0]?.result ? JSON.stringify(rows[0].result) : null
      }, { timeout: 10_000 }).not.toBeNull()
      const mergedRows = await dbUtils.sql`
        SELECT result
        FROM assessment_sessions
        WHERE user_id = ${authUserId} AND completed_at IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 1
      `
      const mergedResultJson = JSON.stringify(mergedRows[0].result)

      expect(mergedResultJson).toBe(JSON.stringify(guestSession.result))

      const mergedInterestRows = await dbUtils.sql`
        SELECT interest
        FROM user_interests
        WHERE user_id = ${authUserId}
        ORDER BY created_at
      `
      expect(mergedInterestRows.map(row => row.interest)).toEqual(guestInterests)

      const guestRowsLeft = await dbUtils.sql`
        SELECT COUNT(*)::int AS count
        FROM assessment_sessions
        WHERE user_id = ${guestUserId}
      `
      expect(guestRowsLeft[0].count).toBe(0)
    }
    finally {
      if (authUserId) await deleteAppRows(dbUtils.sql, authUserId)
      if (guestUserId) await deleteAppRows(dbUtils.sql, guestUserId)
    }
  })
})

async function completeGuestAssessment(page: Page) {
  await page.goto('/discover/interests')
  await page.getByRole('button', { name: /Technology/i }).click()
  await page.getByRole('button', { name: /Continue/i }).click()
  await expect(page).toHaveURL('/discover/would-you-rather')

  await page.getByRole('button', { name: /Let's go/i }).click()

  for (let i = 0; i < 45; i++) {
    const resultsLink = page.getByRole('link', { name: /View Your Results/i })
    if (await resultsLink.isVisible().catch(() => false)) {
      await resultsLink.click()
      return
    }

    const seeAnyway = page.getByRole('button', { name: /See my results anyway/i })
    if (await seeAnyway.isVisible().catch(() => false)) {
      await seeAnyway.click()
      continue
    }

    await page.locator('button:has(figure)').nth(2)
      .click()
    await page.waitForTimeout(350)
  }

  throw new Error('Assessment did not complete within 45 answers')
}

async function getGuestUserId(page: Page): Promise<string> {
  const cookie = (await page.context().cookies()).find(c => c.name === GUEST_COOKIE_NAME)
  const userId = guestCookieValueToUserId(cookie?.value)
  if (!userId) throw new Error('Guest cookie was not present after anonymous assessment')
  return userId
}

async function deleteAppRows(
  sql: NeonQueryFunction<false, false>,
  userId: string,
) {
  await sql`DELETE FROM career_recommendations WHERE user_id = ${userId}`
  await sql`DELETE FROM recommendation_runs WHERE user_id = ${userId}`
  await sql`DELETE FROM career_user_actions WHERE user_id = ${userId}`
  await sql`DELETE FROM assessment_responses WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id = ${userId})`
  await sql`DELETE FROM assessment_sessions WHERE user_id = ${userId}`
  await sql`DELETE FROM user_interests WHERE user_id = ${userId}`
  await sql`DELETE FROM user_profiles WHERE user_id = ${userId}`
}
