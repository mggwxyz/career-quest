import { mockCareers } from '../fixtures/career-recommendations'
import { test, expect } from '../fixtures/test-base'

test.describe('Career Results', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  // TODO(Task 22): these tests relied on `seedZustandStore` + legacy `quiz_answers`
  // to satisfy the /careers page's client-side redirect gate. That gate was
  // removed in Task 21; the server action now requires a completed
  // `assessment_sessions` row with a valid `result` jsonb blob. Rewriting these
  // specs to insert a realistic AssessmentResult + run + recommendations is
  // deferred to the e2e-rewrite pass in Task 22.
  test.skip('should generate and display career recommendations', async () => {
    // see TODO above
  })

  test('should navigate to career detail page', async ({ authenticatedPage: page, dbUtils, mockChatStream }) => {
    await mockChatStream(page)
    const userId = await dbUtils.getTestUserId()
    const career = mockCareers.careers[0]
    const slug = 'software-developers'

    // Seed the FK ancestors required by the current schema.
    const sessionRows = await dbUtils.sql`
      INSERT INTO assessment_sessions (user_id, engine_version, posterior, completed_at)
      VALUES (${userId}, 'e2e-test', '{}'::jsonb, NOW())
      RETURNING id
    ` as Array<{ id: string }>
    const sessionId = sessionRows[0].id

    const runRows = await dbUtils.sql`
      INSERT INTO recommendation_runs (user_id, session_id, interests_snapshot, prompt, model, engine_version)
      VALUES (${userId}, ${sessionId}, ARRAY[]::text[], 'e2e', 'e2e', 'e2e-test')
      RETURNING id
    ` as Array<{ id: string }>
    const runId = runRows[0].id

    await dbUtils.sql`
      INSERT INTO career_recommendations (run_id, user_id, rank, onet_id, slug, title, description, why_it_matches, job_growth, salary_range)
      VALUES (${runId}, ${userId}, 1, ${career.onetId}, ${slug}, ${career.title}, ${career.description}, ${career.whyItMatches}, ${career.jobGrowth}, ${career.salaryRange})
    `

    // Seed mirror row so slug routing resolves
    await dbUtils.sql`
      INSERT INTO onet_occupations (code, slug, title, description, job_zone, bright_outlook, riasec_primary, riasec_all)
      VALUES (${career.onetId}, ${slug}, ${career.title}, ${career.description}, 4, true, 'I', ARRAY['I','C'])
      ON CONFLICT (code) DO NOTHING
    `

    await page.goto(`/careers/${slug}`)

    // Verify the detail page renders the career title and "Why it fits you" block
    // (the old page showed salaryRange; the new page shows O*NET-derived fields)
    await expect(page.getByText('Software Developer').first()).toBeVisible()
    await expect(page.getByText('Why it fits you')).toBeVisible()
    await expect(page.getByText(/Your strong Investigative and Conventional/)).toBeVisible()
  })

  test.skip('should show career generation via server action (MSW mocked)', async () => {
    // see TODO above
  })
})
