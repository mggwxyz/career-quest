import { test, expect } from '../fixtures/test-base'
import type { NeonQueryFunction } from '@neondatabase/serverless'

const SAMPLE_CODE = '15-1252.00'
const SAMPLE_SLUG = 'software-developers'
const SAMPLE_TITLE = 'Software Developers'

async function seedRecommendedCareer(dbUtils: {
  getTestUserId: () => Promise<string>
  sql: NeonQueryFunction<false, false>
}) {
  const userId = await dbUtils.getTestUserId()

  await dbUtils.sql`
    INSERT INTO onet_occupations (code, slug, title, short_title, description, short_description, job_zone, bright_outlook, riasec_primary, riasec_all, salary_annual_median, outlook_category)
    VALUES (${SAMPLE_CODE}, ${SAMPLE_SLUG}, ${SAMPLE_TITLE}, ${SAMPLE_TITLE}, 'Create and maintain software applications.', 'Create and maintain software applications.', 4, true, 'I', ARRAY['I','C'], 132270, 'Bright')
    ON CONFLICT (code) DO UPDATE SET
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      short_title = EXCLUDED.short_title,
      description = EXCLUDED.description,
      short_description = EXCLUDED.short_description,
      job_zone = EXCLUDED.job_zone,
      bright_outlook = EXCLUDED.bright_outlook,
      riasec_primary = EXCLUDED.riasec_primary,
      riasec_all = EXCLUDED.riasec_all,
      salary_annual_median = EXCLUDED.salary_annual_median,
      outlook_category = EXCLUDED.outlook_category
  `

  const sessionRows = await dbUtils.sql`
    INSERT INTO assessment_sessions (user_id, engine_version, posterior, result, completed_at)
    VALUES (
      ${userId},
      'e2e-test',
      '{}'::jsonb,
      '{"hollandCode":"ICR","meta":{"itemsAnswered":18,"itemsSkipped":0,"completedAt":"2026-01-01T00:00:00.000Z","engineVersion":"e2e-test","inconsistencyFlag":false}}'::jsonb,
      NOW()
    )
    RETURNING id
  ` as Array<{ id: string }>
  const sessionId = sessionRows[0].id

  const runRows = await dbUtils.sql`
    INSERT INTO recommendation_runs (user_id, session_id, interests_snapshot, prompt, model, engine_version)
    VALUES (${userId}, ${sessionId}, ARRAY['Coding']::text[], 'e2e', 'e2e', 'e2e-test')
    RETURNING id
  ` as Array<{ id: string }>
  const runId = runRows[0].id

  await dbUtils.sql`
    INSERT INTO career_recommendations (run_id, user_id, rank, onet_id, slug, title, description, why_it_matches, job_growth, salary_range)
    VALUES (${runId}, ${userId}, 1, ${SAMPLE_CODE}, ${SAMPLE_SLUG}, ${SAMPLE_TITLE}, 'Create and maintain software applications.', 'Your investigative and conventional interests fit structured software problem-solving.', 'Bright', '$132k')
  `

  return userId
}

test.describe('Career portfolio actions', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('saves and unsaves from a match card', async ({ authenticatedPage: page, dbUtils }) => {
    const userId = await seedRecommendedCareer(dbUtils)

    await page.goto('/discover/matches')
    await page.getByRole('button', { name: /save software developers/i }).click()
    await expect(page.getByRole('button', { name: /unsave software developers/i })).toBeVisible()

    await page.getByRole('button', { name: /unsave software developers/i }).click()
    await expect(page.getByRole('button', { name: /save software developers/i })).toBeVisible()

    const rows = await dbUtils.sql`
      SELECT action FROM career_user_actions
      WHERE user_id = ${userId} AND onet_id = ${SAMPLE_CODE}
      ORDER BY created_at ASC
    ` as Array<{ action: string }>
    expect(rows.map(row => row.action)).toEqual(['save', 'unsave'])
  })

  test('saves from detail, unsaves, then returns through the dashboard', async ({
    authenticatedPage: page,
    dbUtils,
    mockChatStream,
  }) => {
    await mockChatStream(page)
    await seedRecommendedCareer(dbUtils)

    await page.goto(`/careers/${SAMPLE_SLUG}`)
    await page.getByRole('button', { name: /save software developers/i }).click()
    await expect(page.getByRole('button', { name: /unsave software developers/i })).toBeVisible()

    await page.getByRole('button', { name: /unsave software developers/i }).click()
    await expect(page.getByRole('button', { name: /save software developers/i })).toBeVisible()

    await page.getByRole('button', { name: /save software developers/i }).click()
    await expect(page.getByRole('button', { name: /unsave software developers/i })).toBeVisible()

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Career Portfolio' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Saved careers' })).toBeVisible()
    await expect(page.getByRole('link', { name: SAMPLE_TITLE, exact: true })).toBeVisible()

    await page.getByRole('link', { name: SAMPLE_TITLE, exact: true }).click()
    await expect(page).toHaveURL(`/careers/${SAMPLE_SLUG}`)
    await expect(page.getByRole('heading', { name: SAMPLE_TITLE, exact: true })).toBeVisible()
  })
})
