import { readFileSync } from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { test, expect } from '../fixtures/test-base'

const axeSource = readFileSync(path.resolve(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf-8')

const SAMPLE_CODE = '29-1141.00'
const SAMPLE_SLUG = 'registered-nurses'

type ReadyRoute = {
  path: string
  heading: RegExp | string
}

async function seedCareerFixture(dbUtils: { sql: NeonQueryFunction<false, false> }) {
  await dbUtils.sql`
    INSERT INTO onet_occupations (
      code, slug, title, description, job_zone, bright_outlook,
      riasec_primary, riasec_all, salary_annual_median, outlook_category
    )
    VALUES (
      ${SAMPLE_CODE}, ${SAMPLE_SLUG}, 'Registered Nurses', 'Assess patient health.',
      4, true, 'S', ARRAY['S','I','R'], 85000, 'Bright'
    )
    ON CONFLICT (code) DO UPDATE SET
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      job_zone = EXCLUDED.job_zone,
      bright_outlook = EXCLUDED.bright_outlook,
      riasec_primary = EXCLUDED.riasec_primary,
      riasec_all = EXCLUDED.riasec_all,
      salary_annual_median = EXCLUDED.salary_annual_median,
      outlook_category = EXCLUDED.outlook_category
  `
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    const clientWidth = root.clientWidth
    const scrollWidth = root.scrollWidth
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').trim().slice(0, 80),
          className: typeof el.className === 'string' ? el.className.slice(0, 120) : '',
          left: Math.floor(rect.left),
          right: Math.ceil(rect.right),
        }
      })
      .filter(el => el.left < -1 || el.right > clientWidth + 1)
      .slice(0, 8)

    return { clientWidth, scrollWidth, offenders }
  })

  expect(
    overflow.scrollWidth,
    JSON.stringify(overflow.offenders, null, 2),
  ).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

async function gotoReady(page: Page, route: ReadyRoute) {
  await page.goto(route.path, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
  await page.waitForLoadState('load')
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

async function expectNoAxeViolations(page: Page) {
  await page.addScriptTag({ content: axeSource })
  const violations = await page.evaluate(async () => {
    type AxeViolation = {
      id: string
      impact?: string
      help: string
      nodes: Array<{ target: string[], failureSummary?: string }>
    }
    const axe = (window as typeof window & {
      axe: { run: (context: Document) => Promise<{ violations: AxeViolation[] }> }
    }).axe
    const results = await axe.run(document)
    return results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })),
    }))
  })

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
}

test.describe('Phase 1 mobile and accessibility sweep', () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
    await seedCareerFixture(dbUtils)
  })

  test('core routes do not horizontally overflow at 375px', async ({ authenticatedPage: page, mockChatStream }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockChatStream(page)

    const routes: ReadyRoute[] = [
      { path: '/discover/interests', heading: /what interests you/i },
      { path: '/discover/profile', heading: /no results yet/i },
      { path: '/discover/profile/answers', heading: /no answers yet/i },
      { path: '/discover/matches', heading: /your career matches/i },
      { path: '/careers', heading: /explore careers/i },
      { path: `/careers/${SAMPLE_SLUG}`, heading: /registered nurses/i },
    ]

    for (const route of routes) {
      await gotoReady(page, route)
      await expectNoHorizontalOverflow(page)
    }
  })

  test('assessment question route does not horizontally overflow at 375px', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await gotoReady(page, { path: '/discover/would-you-rather', heading: /ready/i })
    const sessionResponsePromise = page.waitForResponse(response => (
      response.url().includes('/api/assessment/session') && response.request().method() === 'POST'
    ))
    await page.getByRole('button', { name: /Let's go/i }).click()
    const sessionResponse = await sessionResponsePromise
    expect(sessionResponse.ok(), await sessionResponse.text()).toBe(true)
    await expect(page.getByRole('heading', { name: /would you rather/i })).toBeVisible({ timeout: 15000 })
    await expectNoHorizontalOverflow(page)
  })

  test('core routes are axe clean', async ({ authenticatedPage: page }) => {
    const routes: ReadyRoute[] = [
      { path: '/discover/interests', heading: /what interests you/i },
      { path: '/discover/would-you-rather', heading: /ready/i },
      { path: '/careers', heading: /explore careers/i },
    ]

    for (const route of routes) {
      await gotoReady(page, route)
      await expectNoAxeViolations(page)
    }
  })
})
