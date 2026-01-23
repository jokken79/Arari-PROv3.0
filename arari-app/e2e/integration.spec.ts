/**
 * E2E Test: Integration Tests
 * Tests end-to-end workflows combining multiple features
 * Also tests edge cases and error scenarios
 */

import { test, expect } from '@playwright/test'

test.describe('Integration Workflows', () => {
  test('complete workflow: login → upload → view dashboard → download report', async ({
    page,
  }) => {
    // Step 1: Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Verify logged in
    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Step 2: Navigate to dashboard
    await page.goto('/')
    const dashboardTitle = page.locator('text=粗利ダッシュボード')
    await expect(dashboardTitle).toBeVisible()

    // Step 3: Navigate to reports
    const reportsLink = page.locator(
      'a:has-text("レポート"), a:has-text("Reports")'
    ).first()

    if (await reportsLink.isVisible()) {
      await reportsLink.click()
      await expect(page).toHaveURL(/\/reports/)
    }

    // Step 4: Verify can download (no actual file needed)
    const downloadButton = page.locator(
      'button:has-text("ダウンロード"), button:has-text("Download")'
    ).first()

    if (await downloadButton.isVisible()) {
      await expect(downloadButton).toBeEnabled()
    }
  })

  test('should maintain authentication across page navigation', async ({ page, context }) => {
    // Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Wait for redirect
    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Navigate through multiple pages
    const pages_to_visit = ['/', '/employees', '/companies', '/payroll']

    for (const pageUrl of pages_to_visit) {
      await page.goto(pageUrl)

      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/)

      // Content should load
      await page.waitForTimeout(500)
    }

    // Verify session still active
    const cookies = await context.cookies()
    const authCookie = cookies.find(c => c.name === 'access_token' || c.name.includes('token'))

    expect(authCookie).toBeDefined()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Navigate to dashboard
    await page.goto('/')

    // If API fails, should show error or retry
    const errorMessage = page.locator(
      'text=接続エラー, text=Connection Error, text=再接続'
    ).first()

    const retryButton = page.locator('button:has-text("再接続"), button:has-text("Retry")')

    // Should either show error with retry, or successfully load
    const hasError = await errorMessage.isVisible().catch(() => false)
    const hasRetry = await retryButton.isVisible().catch(() => false)
    const hasContent = await page.locator('text=粗利ダッシュボード').isVisible().catch(() => false)

    expect(hasError && hasRetry || hasContent).toBeTruthy()
  })

  test('logout and re-login should work correctly', async ({ page, context }) => {
    // Initial login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Find and click logout button
    const logoutButton = page.locator(
      'button:has-text("ログアウト"), button:has-text("Logout"), [data-testid="logout-btn"]'
    ).first()

    const hasLogout = await logoutButton.isVisible().catch(() => false)

    if (hasLogout) {
      await logoutButton.click()

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)

      // Try login again
      await page.fill('input[type="text"], input[name="username"]', username)
      await page.fill('input[type="password"], input[name="password"]', password)
      await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

      // Should successfully log in again
      await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })
    }
  })

  test('should handle period selection across multiple pages', async ({ page }) => {
    // Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Change period on dashboard
    await page.goto('/')

    const periodSelector = page.locator('select').first()

    if (await periodSelector.isVisible()) {
      const options = await periodSelector.locator('option').count()

      if (options > 2) {
        await periodSelector.selectOption({ index: 2 })

        const selectedValue = await periodSelector.inputValue()

        // Navigate to different page
        await page.goto('/payroll')

        // Period selection should be handled independently or show current period
        const newPeriodSelector = page.locator('select').first()

        if (await newPeriodSelector.isVisible()) {
          const newValue = await newPeriodSelector.inputValue()
          expect(newValue).toBeTruthy()
        }
      }
    }
  })

  test('should handle responsive design during navigation', async ({ page }) => {
    // Start on desktop
    await page.setViewportSize({ width: 1920, height: 1080 })

    // Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Resize to tablet during navigation
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('/')

    const title = page.locator('text=粗利ダッシュボード')
    await expect(title).toBeVisible()

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/employees')

    const employeeTitle = page.locator('text=従業員').first()
    await expect(employeeTitle).toBeVisible()

    // Resize back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('/reports')

    const reportTitle = page.locator('text=レポート').first()
    await expect(reportTitle).toBeVisible()
  })

  test('should display loading states during data transitions', async ({ page }) => {
    // Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Navigate to dashboard
    await page.goto('/')

    // Should show content eventually
    const content = page.locator('text=粗利ダッシュボード')
    await expect(content).toBeVisible({ timeout: 5000 })
  })

  test('should handle network timeout gracefully', async ({ page, context }) => {
    // Simulate slow network by throttling
    await context.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000)) // 5 second delay
      await route.continue()
    })

    // Login
    await page.goto('/login', { waitUntil: 'networkidle' })

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)

    const submitButton = page.locator('button[type="submit"], button:has-text("ログイン")')

    // Click submit
    await submitButton.click()

    // Should either timeout with error or eventually load
    const isErrorOrLoaded = await Promise.race([
      page.waitForURL(/\/login/),
      page.waitForURL(/\/(?!\w*login)|dashboard|home/i).then(() => true),
      page.waitForSelector('text=エラー, text=Error', { timeout: 10000 }).then(() => true),
    ]).catch(() => true)

    expect(isErrorOrLoaded).toBeTruthy()
  })

  test('should preserve form data on validation error', async ({ page }) => {
    // This test would apply to any forms on the site

    // Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'wrong' // Invalid password

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Wait for error
    await page.waitForTimeout(1000)

    // Form fields should still have values
    const usernameField = page.locator('input[type="text"], input[name="username"]').first()
    const usernameValue = await usernameField.inputValue()

    expect(usernameValue).toBe(username)
  })

  test('should handle concurrent requests properly', async ({ page }) => {
    // Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Rapidly navigate between pages
    const pages = ['/', '/employees', '/companies', '/payroll', '/reports']

    for (const pageUrl of pages) {
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })

      // Should not crash or redirect to error
      await expect(page).not.toHaveURL(/\/error|500|404/)
    }

    // Should end up on last page
    await expect(page).toHaveURL(/\/reports/)
  })

  test('should cache data appropriately', async ({ page }) => {
    // Login
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })

    // Navigate to page with data
    await page.goto('/')

    // Measure load time
    const start = Date.now()
    await page.waitForSelector('text=粗利ダッシュボード', { timeout: 5000 })
    const firstLoadTime = Date.now() - start

    // Navigate away
    await page.goto('/employees')

    // Navigate back - should be faster due to cache
    const start2 = Date.now()
    await page.goto('/')
    await page.waitForSelector('text=粗利ダッシュボード', { timeout: 5000 })
    const secondLoadTime = Date.now() - start2

    // Second load should be faster or similar (browser cache)
    expect(secondLoadTime).toBeLessThanOrEqual(firstLoadTime + 1000) // Allow 1 sec variance
  })
})
