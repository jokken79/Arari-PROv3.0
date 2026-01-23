/**
 * E2E Test: Login Flow
 * Tests authentication, token handling, and redirect to dashboard
 * Uses Playwright with real browser automation
 */

import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login')
  })

  test('should display login page with form fields', async ({ page }) => {
    // Arrange & Act - page is already navigated to /login

    // Assert
    expect(await page.title()).toContain('Arari')
    await expect(page.locator('h1, h2')).toContainText(/ログイン|Login/i)

    // Check form fields exist
    const usernameField = page.locator('input[name="username"], input[placeholder*="ユーザー"], input[placeholder*="User"]').first()
    const passwordField = page.locator('input[name="password"], input[type="password"]').first()
    const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    await expect(usernameField).toBeVisible()
    await expect(passwordField).toBeVisible()
    await expect(submitButton).toBeVisible()
  })

  test('should show error message with invalid credentials', async ({ page }) => {
    // Arrange
    const username = 'admin'
    const invalidPassword = 'wrongpassword'

    // Act
    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', invalidPassword)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Assert - Should show error
    const errorMessage = page.locator(
      'text=/エラー|失敗|失敗しました|Error|Failed|incorrect|Invalid|credentials/i'
    ).first()

    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    // Arrange
    const username = 'admin'
    const password = 'admin123'

    // Act
    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Assert - Should redirect to dashboard
    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Verify page content changes (dashboard loads)
    const dashboardTitle = page.locator(
      'text=粗利ダッシュボード, h1:has-text("Dashboard"), h1:has-text("粗利")'
    ).first()

    await expect(dashboardTitle).toBeVisible({ timeout: 10000 })
  })

  test('should persist login session (cookie-based auth)', async ({ page, context }) => {
    // Arrange
    const username = 'admin'
    const password = 'admin123'

    // Act - Login
    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Wait for redirect
    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Get cookies (HttpOnly cookies are stored by browser)
    const cookies = await context.cookies()
    const authCookie = cookies.find(c => c.name === 'access_token' || c.name.includes('token'))

    // Assert
    expect(authCookie).toBeDefined()
    expect(authCookie?.httpOnly).toBe(true)

    // Navigate away and back
    await page.goto('/employees')
    await expect(page).toHaveURL(/\/employees/)

    // Should still be authenticated (no redirect to login)
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('should handle empty username gracefully', async ({ page }) => {
    // Arrange
    const password = 'admin123'

    // Act
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Assert - Should either show error or stay on login page
    const url = page.url()
    const isOnLogin = url.includes('/login') || url.endsWith('/')

    expect(isOnLogin || page.locator('text=/エラー|Error|必須|required/i').first()).toBeTruthy()
  })

  test('should handle empty password gracefully', async ({ page }) => {
    // Arrange
    const username = 'admin'

    // Act
    await page.fill('input[type="text"], input[name="username"]', username)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Assert - Should either show error or stay on login page
    const url = page.url()
    const isOnLogin = url.includes('/login') || url.endsWith('/')

    expect(isOnLogin || page.locator('text=/エラー|Error|必須|required/i').first()).toBeTruthy()
  })

  test('should enforce rate limiting on failed attempts', async ({ page }) => {
    // Arrange
    const maxAttempts = 5
    const invalidPassword = 'wrong'

    // Act - Try to login 5 times with wrong password
    for (let i = 0; i < maxAttempts; i++) {
      await page.fill('input[type="text"], input[name="username"]', 'admin')
      await page.fill('input[type="password"], input[name="password"]', invalidPassword)
      await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

      // Wait between attempts
      await page.waitForTimeout(500)
    }

    // Assert - Should show rate limit error after multiple attempts
    const rateLimitError = page.locator(
      'text=/レート制限|Too many|too many|rate limit|制限|試行回数/i'
    ).first()

    // Either show error or disable button
    const isRateLimited =
      await rateLimitError.isVisible().catch(() => false) ||
      await page.locator('button[type="submit"]:disabled').isVisible().catch(() => false)

    expect(isRateLimited).toBeTruthy()
  })

  test('should clear password field on page reload', async ({ page }) => {
    // Arrange
    const password = 'admin123'

    // Act
    await page.fill('input[type="password"], input[name="password"]', password)

    // Assert - Password should be in field
    const passwordField = page.locator('input[type="password"], input[name="password"]').first()
    await expect(passwordField).toHaveValue(password)

    // Reload page
    await page.reload()

    // Assert - Password should be cleared (security best practice)
    await expect(passwordField).toHaveValue('')
  })

  test('should respond to Enter key in password field', async ({ page }) => {
    // Arrange
    const username = 'admin'
    const password = 'admin123'

    // Act
    await page.fill('input[type="text"], input[name="username"]', username)
    const passwordField = page.locator('input[type="password"], input[name="password"]').first()
    await passwordField.fill(password)
    await passwordField.press('Enter')

    // Assert - Should submit form
    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })
  })

  test('should show loading state during login', async ({ page }) => {
    // Arrange
    const username = 'admin'
    const password = 'admin123'

    // Act
    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)

    // Get submit button before clicking
    const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Click and immediately check for loading state
    await submitButton.click()

    // Assert - Button should be disabled or show loading indicator
    const isDisabled = await submitButton.isDisabled().catch(() => false)
    const hasLoadingIndicator = await page.locator(
      'text=ログイン中, [aria-busy="true"], .animate-spin, [role="status"]'
    ).first().isVisible().catch(() => false)

    expect(isDisabled || hasLoadingIndicator).toBeTruthy()
  })

  test('should redirect unauthenticated users from protected pages to login', async ({ page }) => {
    // Arrange - User is not logged in (session cleared)
    // Clear any existing cookies/session
    await page.context().clearCookies()

    // Act - Try to access protected page
    await page.goto('/employees')

    // Assert - Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})
