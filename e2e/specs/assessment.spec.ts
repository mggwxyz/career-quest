import { test, expect } from '../fixtures/test-base'

test.describe('Adaptive Assessment Flow', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('shows intro, then first item', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/would-you-rather')
    await expect(page.getByText(/Ready\?/i)).toBeVisible()
    await page.getByRole('button', { name: /Let's go/i }).click()
    await expect(page.getByText(/Would you rather/i)).toBeVisible()
  })

  test('clicking an option advances to the next item', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/would-you-rather')
    await page.getByRole('button', { name: /Let's go/i }).click()

    const firstCard = page.locator('button:has(figure)').nth(2) // desktop grid first card
    const firstText = await firstCard.locator('h2').innerText()
    await firstCard.click()

    // New item should have different option text
    await expect(page.locator('button:has(figure) h2').first()).not.toHaveText(firstText, { timeout: 5000 })
  })

  test('skip does not record an answer', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/would-you-rather')
    await page.getByRole('button', { name: /Let's go/i }).click()

    const meter = page.getByRole('progressbar')

    // Answer one item so the itemsAnswered counter advances to 1.
    await page.locator('button:has(figure)').nth(2)
      .click()
    await expect(meter).toHaveAttribute('aria-valuenow', '1', { timeout: 3000 })

    // Skipping the current item must NOT increment itemsAnswered.
    await page.getByRole('button', { name: /Skip/i }).click()
    // Give the skip request time to round-trip before asserting.
    await page.waitForTimeout(500)
    await expect(meter).toHaveAttribute('aria-valuenow', '1')
  })

  test('peek button appears after 13 answers', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/would-you-rather')
    await page.getByRole('button', { name: /Let's go/i }).click()

    const meter = page.getByRole('progressbar')
    await expect(meter).toHaveAttribute('aria-valuenow', '0')

    // Click the first desktop option card 13 times, waiting for the
    // progressbar to advance before clicking again. The cards re-render with
    // AnimatePresence (140ms exit + 150ms enter) and the submit handler has a
    // 220ms debounce before the POST — `.click()` during that window is
    // swallowed by the `if (selectedOption !== null) return` guard, so we
    // re-resolve the locator fresh each iteration and retry if the tick stalls.
    for (let i = 1; i <= 13; i++) {
      for (let attempt = 0; attempt < 5; attempt++) {
        await page.locator('button:has(figure)').nth(2)
          .click()
        try {
          await expect(meter).toHaveAttribute('aria-valuenow', String(i), { timeout: 2500 })
          break
        }
        catch {
          if (attempt === 4) throw new Error(`Progressbar did not advance to ${i} after 5 attempts`)
        }
      }
    }
    await expect(page.getByRole('button', { name: /Peek at profile/i })).toBeVisible()
  })

  test('session persists across reload', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/would-you-rather')
    await page.getByRole('button', { name: /Let's go/i }).click()
    await page.locator('button:has(figure)').nth(2)
      .click()
    await page.waitForTimeout(1000)

    await page.reload()
    await expect(page.getByText(/Would you rather/i)).toBeVisible({ timeout: 5000 })
  })
})
