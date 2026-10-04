import { test, expect } from '../fixtures/test-base'

const CAREERS = [
  {
    code: '99-9301.00',
    slug: 'compare-fixture-robotics-engineers',
    title: 'Compare Fixture Robotics Engineers',
    description: 'Design, test, and maintain robotic production systems.',
    jobZone: 4,
    bright: true,
    primary: 'I',
    riasec: ['I', 'R', 'C'],
    salary: 145000,
    outlook: 'Bright',
    reason: 'Your investigative profile fits robotics troubleshooting and systems design.',
  },
  {
    code: '99-9302.00',
    slug: 'compare-fixture-community-health-workers',
    title: 'Compare Fixture Community Health Workers',
    description: 'Coordinate outreach and help people navigate health services.',
    jobZone: 3,
    bright: false,
    primary: 'S',
    riasec: ['S', 'E'],
    salary: 58000,
    outlook: 'Average',
    reason: 'Your social interests fit helping people understand health options.',
  },
] as const

test.describe('/careers/compare', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
    const userId = await dbUtils.getTestUserId()

    for (const career of CAREERS) {
      await dbUtils.sql`
        INSERT INTO onet_occupations (
          code, slug, title, description, job_zone, bright_outlook,
          riasec_primary, riasec_all, salary_annual_median, outlook_category
        )
        VALUES (
          ${career.code}, ${career.slug}, ${career.title}, ${career.description}, ${career.jobZone}, ${career.bright},
          ${career.primary}, ${career.riasec as unknown as string[]}, ${career.salary}, ${career.outlook}
        )
        ON CONFLICT (code) DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          short_title = NULL,
          short_description = NULL,
          job_zone = EXCLUDED.job_zone,
          bright_outlook = EXCLUDED.bright_outlook,
          riasec_primary = EXCLUDED.riasec_primary,
          riasec_all = EXCLUDED.riasec_all,
          salary_annual_median = EXCLUDED.salary_annual_median,
          salary_hourly_median = NULL,
          outlook_category = EXCLUDED.outlook_category
      `
    }

    const result = JSON.stringify({
      hollandCode: 'ISR',
      riasec: {},
      workValues: { top: [], all: {} },
      workContext: {
        structureVariety: { lean: 'variety', strength: 0.7, confidence: 'high' },
        indoorOutdoor: { lean: 'indoor', strength: 0.5, confidence: 'medium' },
        soloTeam: { lean: 'team', strength: 0.8, confidence: 'high' },
      },
      meta: {
        itemsAnswered: 16,
        itemsSkipped: 0,
        completedAt: new Date().toISOString(),
        engineVersion: 'e2e-test',
        inconsistencyFlag: false,
      },
    })

    const sessionRows = await dbUtils.sql`
      INSERT INTO assessment_sessions (user_id, engine_version, posterior, result, completed_at)
      VALUES (${userId}, 'e2e-test', '{}'::jsonb, ${result}::jsonb, NOW())
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
      VALUES
        (${runId}, ${userId}, 1, ${CAREERS[0].code}, ${CAREERS[0].slug}, ${CAREERS[0].title}, ${CAREERS[0].description}, ${CAREERS[0].reason}, ${CAREERS[0].outlook}, '$145,000/yr'),
        (${runId}, ${userId}, 2, ${CAREERS[1].code}, ${CAREERS[1].slug}, ${CAREERS[1].title}, ${CAREERS[1].description}, ${CAREERS[1].reason}, ${CAREERS[1].outlook}, '$58,000/yr')
    `
  })

  test('adds two careers from browse and loads a useful compare page', async ({ authenticatedPage: page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('career-quest:career-compare')
    })

    await page.goto('/careers?q=Compare%20Fixture')
    await page.getByRole('button', { name: `Add ${CAREERS[0].title} to compare` }).click()
    await page.getByRole('button', { name: `Add ${CAREERS[1].title} to compare` }).click()

    await expect(page.getByLabel('Selected careers to compare')).toBeVisible()
    await page.getByRole('link', { name: /Open compare/i }).click()

    await expect(page).toHaveURL(/\/careers\/compare\?ids=/)
    await expect(page.getByRole('heading', { name: 'Compare careers' })).toBeVisible()
    await expect(page.getByRole('heading', { name: CAREERS[0].title })).toBeVisible()
    await expect(page.getByRole('heading', { name: CAREERS[1].title })).toBeVisible()
    await expect(page.getByText(CAREERS[0].reason)).toBeVisible()
    await expect(page.getByText(CAREERS[1].reason)).toBeVisible()
    await expect(page.getByText('$145,000/yr median').first()).toBeVisible()
    await expect(page.getByText('Zone 3: Medium Preparation Needed').first()).toBeVisible()
    await expect(page.getByText(/Live O\*NET detail is temporarily unavailable/).first()).toBeVisible()

    await page.setViewportSize({ width: 390, height: 900 })
    await expect.poll(async () => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true)
  })
})
