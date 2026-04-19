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
      ON CONFLICT (code) DO NOTHING
    `
  })

  test('renders O*NET details for a known slug', async ({ authenticatedPage: page, mockChatStream }) => {
    await mockChatStream(page)
    await page.goto(`/careers/${SAMPLE_SLUG}`)
    await expect(page.getByRole('heading', { name: 'Registered Nurses', exact: true })).toBeVisible()
    await expect(page.getByText(/Job Zone 4/)).toBeVisible()
    await expect(page.getByText(/Bright Outlook/i)).toBeVisible()
  })

  test('redirects O*NET code URL to canonical slug', async ({ authenticatedPage: page }) => {
    const response = await page.goto(`/careers/${SAMPLE_CODE}`)
    expect(response?.status()).toBe(200)
    expect(page.url()).toContain(`/careers/${SAMPLE_SLUG}`)
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
    await dbUtils.sql`
      INSERT INTO career_recommendations (user_id, onet_id, slug, title, description, why_it_matches, job_growth, salary_range)
      VALUES (${userId}, ${SAMPLE_CODE}, ${SAMPLE_SLUG}, 'Registered Nurses', 'd', 'You care about helping people.', 'Fast', '$80k')
    `
    await page.goto(`/careers/${SAMPLE_SLUG}`)
    await expect(page.getByText('Why it fits you')).toBeVisible()
    await expect(page.getByText(/You care about helping people/)).toBeVisible()
  })
})
