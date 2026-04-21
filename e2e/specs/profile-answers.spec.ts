import { test, expect } from '../fixtures/test-base'

test.describe('/profile/answers page', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('empty state when no completed session exists', async ({ authenticatedPage: page }) => {
    await page.goto('/profile/answers')
    await expect(page.getByRole('heading', { name: /No Answers Yet/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Start the Assessment/i })).toBeVisible()
  })

  test('renders answered and skipped rows after a completed session', async ({
    authenticatedPage: page,
    dbUtils,
  }) => {
    const userId = await dbUtils.getTestUserId()
    const [{ id: sessionId }] = await dbUtils.sql`
      INSERT INTO assessment_sessions (user_id, engine_version, posterior, completed_at)
      VALUES (${userId}, 'test', '{}'::jsonb, NOW())
      RETURNING id
    ` as unknown as Array<{ id: string }>

    await dbUtils.sql`
      INSERT INTO assessment_responses (session_id, item_id, position, responded_at, choice)
      VALUES
        (${sessionId}, 'rs-bike-tutor', 1, NOW(), 1),
        (${sessionId}, 'rs-mentor-treehouse', 2, NOW(), 2),
        (${sessionId}, 'rs-appliance-counsel', 3, NOW(), NULL)
    `

    await page.goto('/profile/answers')

    await expect(page.getByRole('heading', { name: /Your Would You Rathers/i })).toBeVisible()
    await expect(page.getByText('Question 1')).toBeVisible()
    await expect(page.getByText('Question 2')).toBeVisible()
    await expect(page.getByText('Question 3')).toBeVisible()
    // The unanswered row must be marked as skipped
    await expect(page.getByText(/Skipped/i)).toBeVisible()
  })

  test('retake flow navigates to /get-started/would-you-rather', async ({
    authenticatedPage: page,
    dbUtils,
  }) => {
    const userId = await dbUtils.getTestUserId()
    const [{ id: sessionId }] = await dbUtils.sql`
      INSERT INTO assessment_sessions (user_id, engine_version, posterior, completed_at)
      VALUES (${userId}, 'test', '{}'::jsonb, NOW())
      RETURNING id
    ` as unknown as Array<{ id: string }>

    await dbUtils.sql`
      INSERT INTO assessment_responses (session_id, item_id, position, responded_at, choice)
      VALUES (${sessionId}, 'rs-bike-tutor', 1, NOW(), 1)
    `

    await page.goto('/profile/answers')
    await page.getByRole('button', { name: /Retake Assessment/i }).click()

    const dialog = page.getByRole('heading', { name: /Start over\?/i })
    await expect(dialog).toBeVisible()

    await page.getByRole('button', { name: /Yes, start over/i }).click()
    await page.waitForURL('**/get-started/would-you-rather')
    expect(page.url()).toContain('/get-started/would-you-rather')
  })
})
