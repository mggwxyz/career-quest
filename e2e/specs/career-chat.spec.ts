import { test, expect } from '../fixtures/test-base'
import { mockCareers } from '../fixtures/career-recommendations'

test.describe('Career Chat', () => {
  test.beforeEach(async ({ dbUtils }) => {
    await dbUtils.truncateAppTables()
  })

  test('should display the chat interface on career detail page', async ({
    authenticatedPage: page,
    dbUtils,
    mockChatStream,
  }) => {
    await mockChatStream(page)
    const userId = await dbUtils.getTestUserId()
    const career = mockCareers.careers[0]

    await dbUtils.sql`
      INSERT INTO career_recommendations (user_id, onet_id, title, description, why_it_matches, job_growth, salary_range)
      VALUES (${userId}, ${career.onetId}, ${career.title}, ${career.description}, ${career.whyItMatches}, ${career.jobGrowth}, ${career.salaryRange})
    `

    await page.goto(`/careers/${career.onetId}`)

    // Verify chat header renders
    await expect(page.getByText(`Chat about ${career.title}`)).toBeVisible()

    // Verify initial assistant message renders
    await expect(page.getByText(/I'm here to help you learn about/)).toBeVisible()
  })

  test('should send a message and receive a mocked streaming response', async ({
    authenticatedPage: page,
    dbUtils,
    mockChatStream,
  }) => {
    await mockChatStream(page)
    const userId = await dbUtils.getTestUserId()
    const career = mockCareers.careers[0]

    await dbUtils.sql`
      INSERT INTO career_recommendations (user_id, onet_id, title, description, why_it_matches, job_growth, salary_range)
      VALUES (${userId}, ${career.onetId}, ${career.title}, ${career.description}, ${career.whyItMatches}, ${career.jobGrowth}, ${career.salaryRange})
    `

    await page.goto(`/careers/${career.onetId}`)

    // Wait for the chat to be ready
    await expect(page.getByText(/I'm here to help you learn about/)).toBeVisible()

    // Type a message and send
    const chatInput = page.locator('textarea, input[type="text"]').last()
    await chatInput.fill('What does a typical day look like?')
    await chatInput.press('Enter')

    // Verify the user message appears
    await expect(page.getByText('What does a typical day look like?')).toBeVisible()

    // Verify the mocked assistant response streams in
    // Check for a distinctive fragment from MOCK_CHAT_RESPONSE
    await expect(page.getByText(/Day-to-Day Responsibilities/)).toBeVisible({ timeout: 10000 })

    // Verify markdown renders (the response contains bold text and lists)
    await expect(page.getByText(/Software Developers/)).toBeVisible()
  })
})
