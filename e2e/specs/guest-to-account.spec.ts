import { test, expect } from '../fixtures/test-base'

// G01 — a first-time visitor with NO account can pick interests, take the
// assessment, and browse careers with zero signup. These specs run
// unauthenticated, overriding the suite's default logged-in storageState.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Guest-to-account (G01)', () => {
  test.afterEach(async ({ dbUtils }) => {
    // Clean up guest rows this spec created. workers:1, so a broad guest_%
    // delete is safe and never touches the real per-run test user's rows.
    await dbUtils.sql`DELETE FROM assessment_responses WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id LIKE 'guest_%')`
    await dbUtils.sql`DELETE FROM assessment_sessions WHERE user_id LIKE 'guest_%'`
    await dbUtils.sql`DELETE FROM user_interests WHERE user_id LIKE 'guest_%'`
    await dbUtils.sql`DELETE FROM user_profiles WHERE user_id LIKE 'guest_%'`
  })

  test('reaches the interest picker without being bounced to login', async ({ page }) => {
    await page.goto('/discover/interests')
    // Middleware must NOT redirect a guest to /auth/login.
    await expect(page).toHaveURL(/\/discover\/interests$/)
    await expect(page.getByRole('heading', { name: /What Interests You/i })).toBeVisible()
  })

  test('starts the assessment and is issued a signed guest cookie', async ({ page, context }) => {
    await page.goto('/discover/would-you-rather')
    await page.getByRole('button', { name: /Let.?s go/i }).click()
    // The first question renders — a session was created for the guest.
    await expect(page.getByRole('heading', { name: /Would you rather/i })).toBeVisible()

    const guestCookie = (await context.cookies()).find(c => c.name === 'cq_guest')
    expect(guestCookie?.value).toBeTruthy()
    expect(guestCookie?.httpOnly).toBe(true)
  })

  test('can browse careers and sees a save-progress nudge', async ({ page }) => {
    // Mint the guest identity by starting the assessment, then browse.
    await page.goto('/discover/would-you-rather')
    await page.getByRole('button', { name: /Let.?s go/i }).click()
    await expect(page.getByRole('heading', { name: /Would you rather/i })).toBeVisible()

    await page.goto('/careers')
    await expect(page.getByRole('heading', { name: 'Explore careers' })).toBeVisible()
    await expect(page.getByText(/exploring as a guest/i)).toBeVisible()
  })
})
