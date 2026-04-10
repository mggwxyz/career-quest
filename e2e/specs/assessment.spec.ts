import { test, expect } from '../fixtures/test-base'

test.describe('Assessment Flow', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('should select interests and continue to quiz', async ({ authenticatedPage: page }) => {
    await page.goto('/intake/interests')

    // Select a few interests
    await page.getByRole('button', { name: /Technology/ }).click()
    await page.getByRole('button', { name: /Science/ }).click()
    await page.getByRole('button', { name: /Art & Design/ }).click()

    // Verify they appear selected (have the active border class)
    await expect(page.getByRole('button', { name: /Technology/ })).toHaveClass(/border-primary/)

    // Click continue
    await page.getByRole('button', { name: /Continue/ }).click()

    // Should redirect to the quiz
    await page.waitForURL('/intake/would-you-rather')
    await expect(page).toHaveURL('/intake/would-you-rather')
  })

  test('should add a custom interest', async ({ authenticatedPage: page }) => {
    await page.goto('/intake/interests')

    await page.getByPlaceholder('Add a custom interest').fill('Robotics')
    await page.getByRole('button', { name: 'Add' }).click()

    // Custom interest should appear as a selected chip
    await expect(page.getByRole('button', { name: 'Robotics' })).toBeVisible()
  })

  test('should answer quiz questions and show progress', async ({ authenticatedPage: page }) => {
    await page.goto('/intake/would-you-rather')

    // Verify we see the first question
    await expect(page.getByText('Would you rather...')).toBeVisible()
    await expect(page.getByText('1 of 30')).toBeVisible()

    // The option cards are clickable divs — click the first one
    await page.locator('img').first()
      .click()

    // After the 500ms animation, should advance to question 2
    await expect(page.getByText('2 of 30')).toBeVisible({ timeout: 2000 })
  })

  test('should skip a question', async ({ authenticatedPage: page }) => {
    await page.goto('/intake/would-you-rather')

    await expect(page.getByText('1 of 30')).toBeVisible()

    // Click skip
    await page.getByRole('button', { name: /Skip/ }).click()

    // Should advance to question 2
    await expect(page.getByText('2 of 30')).toBeVisible()
  })

  test('should navigate back to previous question', async ({ authenticatedPage: page }) => {
    await page.goto('/intake/would-you-rather')

    // Answer first question
    await page.locator('img').first()
      .click()
    await expect(page.getByText('2 of 30')).toBeVisible({ timeout: 2000 })

    // Go back
    await page.getByRole('button', { name: /Back/ }).click()
    await expect(page.getByText('1 of 30')).toBeVisible()
  })

  test('should persist progress across page reload', async ({ authenticatedPage: page }) => {
    await page.goto('/intake/would-you-rather')

    // Answer first question
    await page.locator('img').first()
      .click()
    await expect(page.getByText('2 of 30')).toBeVisible({ timeout: 2000 })

    // Wait for the 2-second debounce save to complete
    await page.waitForTimeout(3000)

    // Reload the page
    await page.reload()

    // Should restore to question 2 (hydrated from DB)
    await expect(page.getByText('2 of 30')).toBeVisible({ timeout: 5000 })
  })
})
