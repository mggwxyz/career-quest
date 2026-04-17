import { readFileSync } from 'fs'
import { test, expect } from '../fixtures/test-base'
import { TEST_USER_FILE, type TestUserRecord } from '../global-setup'

test.describe('Authentication', () => {
  test('should sign up a new user and redirect to home', async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`

    await page.goto('/auth/sign-up')
    await page.getByLabel('Email').fill(uniqueEmail)
    await page.getByLabel('Password', { exact: true }).fill('testpassword123')
    await page.getByLabel('Repeat Password').fill('testpassword123')
    await page.getByRole('button', { name: 'Create Account' }).click()

    await page.waitForURL('/')
    await expect(page).toHaveURL('/')
  })

  test('should log in with the per-run test user', async ({ page }) => {
    const testUser = JSON.parse(readFileSync(TEST_USER_FILE, 'utf-8')) as TestUserRecord

    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(testUser.email)
    await page.getByLabel('Password').fill(testUser.password)
    await page.getByRole('button', { name: 'Sign In' }).click()

    await page.waitForURL('/')
    await expect(page).toHaveURL('/')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('should show validation error when passwords do not match', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await page.getByLabel('Email').fill('mismatch@example.com')
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByLabel('Repeat Password').fill('different456')
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })
})
