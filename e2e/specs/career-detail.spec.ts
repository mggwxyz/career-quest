import { test, expect } from '../fixtures/test-base'

const SAMPLE_CODE = '29-1141.00'
const SAMPLE_SLUG = 'registered-nurses'

test.describe('Career detail page', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
    // ensure the mirror row exists for the test career
    await dbUtils.sql`
      INSERT INTO onet_occupations (code, slug, title, description, job_zone, bright_outlook, riasec_primary, riasec_all)
      VALUES (${SAMPLE_CODE}, ${SAMPLE_SLUG}, 'Registered Nurses', 'Assess patient health.', 4, true, 'S', ARRAY['S','I','R'])
      ON CONFLICT (code) DO UPDATE SET
        slug = EXCLUDED.slug,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        job_zone = EXCLUDED.job_zone,
        bright_outlook = EXCLUDED.bright_outlook,
        riasec_primary = EXCLUDED.riasec_primary,
        riasec_all = EXCLUDED.riasec_all
    `
  })

  test('renders O*NET details for a known slug', async ({ authenticatedPage: page, mockChatStream }) => {
    await mockChatStream(page)
    await page.goto(`/careers/${SAMPLE_SLUG}`)
    await expect(page.getByRole('heading', { name: 'Registered Nurses', exact: true })).toBeVisible()
    // The description renders in more than one place (header + panel); the local
    // mirror also carries the full O*NET catalog, so scope to the first match.
    await expect(page.getByText('Assess patient health.').first()).toBeVisible()
    await expect(page.getByText(/Job Zone 4/)).toBeVisible()
    await expect(page.getByText(/Bright Outlook/i)).toBeVisible()
  })

  test('redirects O*NET code URL to canonical slug', async ({ authenticatedPage: page }) => {
    const response = await page.goto(`/careers/${SAMPLE_CODE}`)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(new RegExp(`/careers/${SAMPLE_SLUG}$`))
  })

  test('shows 404 for an unknown slug', async ({ authenticatedPage: page }) => {
    await page.goto('/careers/no-such-career')
    await expect(page.getByText(/could not be found/i)).toBeVisible()
  })

  test('renders "Why it fits you" when career is in user recommendations', async ({
    authenticatedPage: page,
    dbUtils,
    mockChatStream,
  }) => {
    await mockChatStream(page)
    const userId = await dbUtils.getTestUserId()

    // Seed the FK ancestors required by the current schema
    // (assessment_sessions -> recommendation_runs -> career_recommendations).
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
      VALUES (${runId}, ${userId}, 1, ${SAMPLE_CODE}, ${SAMPLE_SLUG}, 'Registered Nurses', 'd', 'You care about helping people.', 'Fast', '$80k')
    `
    await page.goto(`/careers/${SAMPLE_SLUG}`)
    await expect(page.getByText('Why it fits you').first()).toBeVisible()
    await expect(page.getByText(/You care about helping people/)).toBeVisible()
  })
})
