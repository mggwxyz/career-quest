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

  for (const answersBeforeSkip of [0, 1]) {
    test(`consecutive skips advance and resume after ${answersBeforeSkip} answers`, async ({ authenticatedPage: page, dbUtils }, testInfo) => {
      await page.goto('/discover/would-you-rather')
      const started = page.waitForResponse(r => r.url().endsWith('/api/assessment/session') && r.request().method() === 'POST')
      await page.getByRole('button', { name: /Let's go/i }).click()
      const startResponse = await started
      expect(startResponse.ok()).toBe(true)
      const start = await startResponse.json()
      let currentItem = start.item
      const seen = new Set<string>()
      const meter = page.getByRole('progressbar')
      const card = page.locator('button:has(figure):visible').first()
      const captureQuestion = async (name: string) => {
        await expect(card.locator('xpath=../../..')).toHaveCSS('opacity', '1')
        await expect.poll(() => page.locator('button:has(figure):visible img').evaluateAll(images =>
          images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
        )).toBe(true)
        await page.screenshot({ path: testInfo.outputPath(name), fullPage: true })
      }
      await expect(card.locator('h2')).toHaveText(currentItem.option1.text)
      await captureQuestion('first-question.png')

      for (const choice of [...Array<number>(answersBeforeSkip).fill(1), null, null]) {
        seen.add(currentItem.id)
        const responded = page.waitForResponse(r => r.url().endsWith('/api/assessment/response') && r.request().method() === 'POST')
        if (choice === null) await page.getByRole('button', { name: /Skip/i }).click()
        else await card.click()
        const response = await responded
        expect(response.ok()).toBe(true)
        const body = await response.json()
        expect(body.kind).toBe('next')
        expect(seen.has(body.item.id)).toBe(false)
        expect(body.itemsAnswered).toBe(choice === null ? answersBeforeSkip : 1)
        currentItem = body.item
        await expect(card.locator('h2')).toHaveText(currentItem.option1.text)
        await expect(meter).toHaveAttribute('aria-valuenow', String(choice === null ? answersBeforeSkip : 1))
        await captureQuestion(`question-${seen.size + 1}.png`)
      }

      const resumed = page.waitForResponse(r => r.url().endsWith('/api/assessment/session') && r.request().method() === 'GET')
      await page.reload()
      const resumeResponse = await resumed
      expect(resumeResponse.ok()).toBe(true)
      const { active } = await resumeResponse.json()
      expect(active.item.id).toBe(currentItem.id)
      expect(active.itemsAnswered).toBe(answersBeforeSkip)
      await expect(card.locator('h2')).toHaveText(currentItem.option1.text)
      await expect(meter).toHaveAttribute('aria-valuenow', String(answersBeforeSkip))
      await captureQuestion('resumed-question.png')

      const rows = await dbUtils.sql`SELECT item_id, choice, responded_at FROM assessment_responses WHERE session_id = ${start.sessionId} ORDER BY position`
      expect(rows.filter(r => r.responded_at !== null && r.choice === null)).toHaveLength(2)
      expect(rows.filter(r => r.responded_at === null)).toHaveLength(1)
      const skippedId = rows.find(r => r.responded_at !== null && r.choice === null)!.item_id
      const stale = await page.request.post('/api/assessment/response', {
        data: { sessionId: start.sessionId, itemId: skippedId, choice: 1 },
      })
      expect(stale.status()).toBe(409)
      const [stillSkipped] = await dbUtils.sql`SELECT choice FROM assessment_responses WHERE session_id = ${start.sessionId} AND item_id = ${skippedId}`
      expect(stillSkipped.choice).toBeNull()
    })
  }

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
