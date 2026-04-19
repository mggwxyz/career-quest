import { test, expect } from '../fixtures/test-base'

test.describe('Would-you-rather keyboard navigation', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('tab focuses an option card and Enter advances the quiz', async ({ authenticatedPage: page }) => {
    await page.goto('/get-started/would-you-rather')

    // Wait for the first question to render
    await expect(page.getByRole('heading', { name: /would you rather/i })).toBeVisible()
    await expect(page.getByText('1 of 30')).toBeVisible()

    // The desktop option-card buttons live inside a grid and contain a figure.
    // Focus the first desktop card directly (the existing suite uses nth(2) for this).
    // Using .focus() on the locator simulates Tab reaching this element without
    // having to enumerate every preceding focusable element on the page.
    const firstDesktopCard = page.locator('button:has(figure)').nth(2)
    await firstDesktopCard.focus()

    // Sanity check: the focused element should actually be the card button.
    const focusedIsCard = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return Boolean(el && el.tagName === 'BUTTON' && el.querySelector('figure'))
    })
    expect(focusedIsCard).toBe(true)

    // Press Enter to select
    await page.keyboard.press('Enter')

    // After the 500ms handleOptionSelect timeout the quiz advances to question 2.
    await expect(page.getByText('2 of 30')).toBeVisible({ timeout: 2000 })
  })

  test('Space key also selects a focused option card', async ({ authenticatedPage: page }) => {
    await page.goto('/get-started/would-you-rather')

    await expect(page.getByText('1 of 30')).toBeVisible()

    const firstDesktopCard = page.locator('button:has(figure)').nth(2)
    await firstDesktopCard.focus()
    await page.keyboard.press('Space')

    await expect(page.getByText('2 of 30')).toBeVisible({ timeout: 2000 })
  })

  test('Tab traversal reaches an option card from the start of the page', async ({ authenticatedPage: page }) => {
    await page.goto('/get-started/would-you-rather')
    await expect(page.getByText('1 of 30')).toBeVisible()

    // Start from the top of the document
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())

    // Tab up to 20 times looking for a card button
    let focusedOnCard = false
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const isCard = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        return Boolean(el && el.tagName === 'BUTTON' && el.querySelector('figure'))
      })
      if (isCard) {
        focusedOnCard = true
        break
      }
    }

    expect(focusedOnCard).toBe(true)
  })
})
