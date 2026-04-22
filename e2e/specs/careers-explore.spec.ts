import { test, expect } from '../fixtures/test-base'

test.describe('/careers (explore)', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
    // Upsert so the seed is authoritative regardless of any pre-existing mirror rows
    // (e.g. from `pnpm seed:onet` run locally, which may have different titles).
    await dbUtils.sql`
      INSERT INTO onet_occupations (code, slug, title, description, job_zone, bright_outlook, riasec_primary, riasec_all) VALUES
        ('29-1141.00', 'registered-nurses', 'Registered Nurses', '', 4, true, 'S', ARRAY['S','I','R']),
        ('15-1252.00', 'software-developers', 'Software Developers', '', 4, true, 'I', ARRAY['I','C']),
        ('35-3031.00', 'waiters-and-waitresses', 'Waiters and Waitresses', '', 2, false, 'E', ARRAY['E','C'])
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

  test('renders the default grid', async ({ authenticatedPage: page }) => {
    await page.goto('/careers')
    await expect(page.getByRole('heading', { name: 'Explore careers' })).toBeVisible()
    // Default grid is ordered by bright outlook, then salary desc. The seeded
    // fixtures here (salary ~$80k–$127k) may not appear in the first page
    // alongside the real O*NET catalog. Assert the page shell + result count
    // rendered, rather than specific rows that depend on global sort order.
    await expect(page.getByText(/careers match/i)).toBeVisible()
  })

  test('filters by keyword search', async ({ authenticatedPage: page }) => {
    await page.goto('/careers')
    await page.getByPlaceholder(/Search/).fill('nurse')
    await page.getByPlaceholder(/Search/).press('Enter')
    await expect(page).toHaveURL(/q=nurse/)
    await expect(page.getByText('Registered Nurses')).toBeVisible()
    await expect(page.getByText('Software Developers')).not.toBeVisible()
  })

  test('filters by bright outlook chip', async ({ authenticatedPage: page }) => {
    await page.goto('/careers')
    await page.getByRole('button', { name: /Bright/i }).click()
    await expect(page).toHaveURL(/bright=1/)
    await expect(page.getByText('Waiters and Waitresses')).not.toBeVisible()
  })

  test('links to the detail page by slug', async ({ authenticatedPage: page }) => {
    // Filter to nurses so the "Registered Nurses" card is guaranteed to appear
    // on the first page regardless of global sort order.
    await page.goto('/careers?q=nurse')
    await page.getByRole('link', { name: /Registered Nurses/ }).first()
      .click()
    await expect(page).toHaveURL('/careers/registered-nurses')
  })
})
