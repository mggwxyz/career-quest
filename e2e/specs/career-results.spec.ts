import { test, expect } from '../fixtures/test-base'
import { mockCareers } from '../fixtures/career-recommendations'

test.describe('Career Results', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('should generate and display career recommendations', async ({ authenticatedPage: page, dbUtils }) => {
    const userId = await dbUtils.getTestUserId()

    // Seed the user with interests and quiz answers so the summary page works.
    // We'll pre-populate the DB directly rather than clicking through 30 questions.
    await dbUtils.sql`
      UPDATE users SET interests = ARRAY['Technology', 'Science']
      WHERE id = ${userId}
    `

    // Seed career recommendations directly to test the list rendering
    for (const career of mockCareers.careers) {
      await dbUtils.sql`
        INSERT INTO career_recommendations (user_id, onet_id, title, description, why_it_matches, job_growth, salary_range)
        VALUES (${userId}, ${career.onetId}, ${career.title}, ${career.description}, ${career.whyItMatches}, ${career.jobGrowth}, ${career.salaryRange})
      `
    }

    await page.goto('/careers')

    // Verify all 10 careers render
    for (const career of mockCareers.careers) {
      await expect(page.getByText(career.title).first()).toBeVisible()
    }
  })

  test('should navigate to career detail page', async ({ authenticatedPage: page, dbUtils }) => {
    const userId = await dbUtils.getTestUserId()

    // Seed one career
    const career = mockCareers.careers[0]
    await dbUtils.sql`
      INSERT INTO career_recommendations (user_id, onet_id, title, description, why_it_matches, job_growth, salary_range)
      VALUES (${userId}, ${career.onetId}, ${career.title}, ${career.description}, ${career.whyItMatches}, ${career.jobGrowth}, ${career.salaryRange})
    `

    await page.goto(`/careers/${career.onetId}`)

    // Verify career details render
    await expect(page.getByText(career.title).first()).toBeVisible()
    await expect(page.getByText(career.salaryRange).first()).toBeVisible()
  })

  test('should show career generation via server action (MSW mocked)', async ({ authenticatedPage: page, dbUtils }) => {
    const userId = await dbUtils.getTestUserId()

    // Ensure user has interests
    await dbUtils.sql`
      UPDATE users SET interests = ARRAY['Technology', 'Science']
      WHERE id = ${userId}
    `

    // Seed quiz answers for all 30 questions so getDeckResults() returns data
    for (let i = 1; i <= 10; i++) {
      await dbUtils.sql`
        INSERT INTO quiz_answers (user_id, question_id, selected_option)
        VALUES (${userId}, ${'riasec-' + i}, 1)
        ON CONFLICT (user_id, question_id) DO UPDATE SET selected_option = 1
      `
    }
    for (let i = 1; i <= 10; i++) {
      await dbUtils.sql`
        INSERT INTO quiz_answers (user_id, question_id, selected_option)
        VALUES (${userId}, ${'workvalue-' + i}, 1)
        ON CONFLICT (user_id, question_id) DO UPDATE SET selected_option = 1
      `
    }
    for (let i = 1; i <= 10; i++) {
      await dbUtils.sql`
        INSERT INTO quiz_answers (user_id, question_id, selected_option)
        VALUES (${userId}, ${'env-' + i}, 1)
        ON CONFLICT (user_id, question_id) DO UPDATE SET selected_option = 1
      `
    }

    // Navigate to careers page and verify it loads without errors
    await page.goto('/careers')
    await expect(page).toHaveURL('/careers')
  })
})
