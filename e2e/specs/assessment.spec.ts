import { test, expect } from '../fixtures/test-base'

test.describe('Adaptive Assessment Flow', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('shows intro, then first item', async ({ authenticatedPage: page }) => {
    await page.goto('/get-started/would-you-rather')
    await expect(page.getByText(/Ready\?/i)).toBeVisible()
    await page.getByRole('button', { name: /Let's go/i }).click()
    await expect(page.getByText(/Would you rather/i)).toBeVisible()
  })

  test('clicking an option advances to the next item', async ({ authenticatedPage: page }) => {
    await page.goto('/get-started/would-you-rather')
    await page.getByRole('button', { name: /Let's go/i }).click()

    const firstCard = page.locator('button:has(figure)').nth(2) // desktop grid first card
    const firstText = await firstCard.locator('h2').innerText()
    await firstCard.click()

    // New item should have different option text
    await expect(page.locator('button:has(figure) h2').first()).not.toHaveText(firstText, { timeout: 5000 })
  })

  test('skip advances without recording an answer', async ({ authenticatedPage: page }) => {
    await page.goto('/get-started/would-you-rather')
    await page.getByRole('button', { name: /Let's go/i }).click()

    const firstCard = page.locator('button:has(figure)').nth(2)
    const firstText = await firstCard.locator('h2').innerText()
    await page.getByRole('button', { name: /Skip/i }).click()
    await expect(page.locator('button:has(figure) h2').first()).not.toHaveText(firstText, { timeout: 5000 })
  })

  test('peek button appears after 8 answers', async ({ authenticatedPage: page }) => {
    await page.goto('/get-started/would-you-rather')
    await page.getByRole('button', { name: /Let's go/i }).click()

    for (let i = 0; i < 8; i++) {
      await page.locator('button:has(figure)').nth(2)
        .click()
      // Wait for the next item to render
      await page.waitForTimeout(700)
    }
    await expect(page.getByRole('button', { name: /Peek at profile/i })).toBeVisible()
  })

  test('session persists across reload', async ({ authenticatedPage: page }) => {
    await page.goto('/get-started/would-you-rather')
    await page.getByRole('button', { name: /Let's go/i }).click()
    await page.locator('button:has(figure)').nth(2)
      .click()
    await page.waitForTimeout(1000)

    await page.reload()
    await expect(page.getByText(/Would you rather/i)).toBeVisible({ timeout: 5000 })
  })
})
