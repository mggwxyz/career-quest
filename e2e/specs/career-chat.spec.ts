import type { NeonQueryFunction } from '@neondatabase/serverless'
import { test, expect } from '../fixtures/test-base'

const SAMPLE_CODE = '29-1141.00' // Registered Nurses — matches MOCK_CHAT_RESPONSE persona
const SAMPLE_SLUG = 'registered-nurses'
const SAMPLE_TITLE = 'Registered Nurses'

type SeedCareer = {
  onetId: string
  slug: string
  title: string
  description: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

/**
 * Seed a single career_recommendations row for the given user, creating the
 * minimal assessment_sessions + recommendation_runs ancestors required by the
 * current schema (both FKs are NOT NULL).
 */
async function seedCareerRecommendation(
  sql: NeonQueryFunction<false, false>,
  userId: string,
  career: SeedCareer,
) {
  const sessionRows = await sql`
    INSERT INTO assessment_sessions (user_id, engine_version, posterior, completed_at)
    VALUES (${userId}, 'e2e-test', '{}'::jsonb, NOW())
    RETURNING id
  ` as Array<{ id: string }>
  const sessionId = sessionRows[0].id

  const runRows = await sql`
    INSERT INTO recommendation_runs (user_id, session_id, interests_snapshot, prompt, model, engine_version)
    VALUES (${userId}, ${sessionId}, ARRAY[]::text[], 'e2e', 'e2e', 'e2e-test')
    RETURNING id
  ` as Array<{ id: string }>
  const runId = runRows[0].id

  await sql`
    INSERT INTO career_recommendations (run_id, user_id, rank, onet_id, slug, title, description, why_it_matches, job_growth, salary_range)
    VALUES (${runId}, ${userId}, 1, ${career.onetId}, ${career.slug}, ${career.title}, ${career.description}, ${career.whyItMatches}, ${career.jobGrowth}, ${career.salaryRange})
  `
}

const sampleCareer: SeedCareer = {
  onetId: SAMPLE_CODE,
  slug: SAMPLE_SLUG,
  title: SAMPLE_TITLE,
  description: 'Assess patient health.',
  whyItMatches: 'You care about helping people.',
  jobGrowth: 'Fast',
  salaryRange: '$80k',
}

test.describe('Career Chat (role-play)', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
    // Seed the onet_occupations mirror row so slug routing works
    await dbUtils.sql`
      INSERT INTO onet_occupations (code, slug, title, description, job_zone, bright_outlook, riasec_primary, riasec_all)
      VALUES (${SAMPLE_CODE}, ${SAMPLE_SLUG}, ${SAMPLE_TITLE}, 'Assess patient health problems and needs.', 4, true, 'S', ARRAY['S','I','R'])
      ON CONFLICT (code) DO NOTHING
    `
  })

  test('displays the role-play chat interface on career detail page', async ({
    authenticatedPage: page,
    dbUtils,
    mockChatStream,
  }) => {
    await mockChatStream(page)
    const userId = await dbUtils.getTestUserId()
    await seedCareerRecommendation(dbUtils.sql, userId, sampleCareer)

    await page.goto(`/careers/${SAMPLE_SLUG}`)

    // Verify role-play chat header renders
    await expect(page.getByText(/Talk with a/)).toBeVisible()
    await expect(page.getByText('Registered Nurses', { exact: true }).first()).toBeVisible()
  })

  test('sends a message and receives first-person mocked stream', async ({
    authenticatedPage: page,
    dbUtils,
    mockChatStream,
  }) => {
    await mockChatStream(page)
    const userId = await dbUtils.getTestUserId()
    await seedCareerRecommendation(dbUtils.sql, userId, sampleCareer)

    await page.goto(`/careers/${SAMPLE_SLUG}`)

    // Wait for the chat UI to be ready
    await expect(page.getByText(/Talk with a/)).toBeVisible()

    // Type a message and send
    const chatInput = page.locator('textarea, input[type="text"]').last()
    await chatInput.fill('What does a typical shift look like?')
    await chatInput.press('Enter')

    // Verify the user message appears
    await expect(page.getByText('What does a typical shift look like?')).toBeVisible()

    // Verify the mocked first-person practitioner response streams in
    await expect(page.getByText(/I've been a Registered Nurse for 8 years/)).toBeVisible({ timeout: 10000 })
  })
})
