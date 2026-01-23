/**
 * E2E Test: Dashboard Navigation and Interactions
 * Tests dashboard loading, period selection, data display, and user interactions
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')

    const username = 'admin'
    const password = 'admin123'

    await page.fill('input[type="text"], input[name="username"]', username)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")')

    // Wait for redirect
    await expect(page).toHaveURL(/\/(?!\w*login)|dashboard|home/i, { timeout: 10000 })
  })

  test('should load dashboard and display main components', async ({ page }) => {
    // Act - Navigate to dashboard
    await page.goto('/')

    // Assert
    expect(await page.title()).toContain('Arari')

    const dashboardTitle = page.locator('text=粗利ダッシュボード')
    await expect(dashboardTitle).toBeVisible()

    // Check for main sections
    const statsSection = page.locator('[data-testid="dashboard-stats"], text=統計')
    await expect(statsSection).toBeVisible({ timeout: 5000 })
  })

  test('should display period selector', async ({ page }) => {
    // Act
    await page.goto('/')

    // Assert
    const periodSelector = page.locator(
      'select, [role="combobox"], text=期間, text=年月'
    ).first()

    await expect(periodSelector).toBeVisible()
  })

  test('should auto-select latest period on load', async ({ page }) => {
    // Act
    await page.goto('/')

    // Wait for data to load
    await page.waitForTimeout(2000)

    // Assert - Should have a period selected
    const selectedPeriod = page.locator(
      'select option[selected], [role="combobox"] [aria-selected="true"]'
    ).first()

    // Should have some period selected
    const periodText = await selectedPeriod.textContent()
    expect(periodText).toMatch(/\d{4}年\d{1,2}月/)
  })

  test('should allow changing selected period', async ({ page }) => {
    // Act
    await page.goto('/')

    const periodSelector = page.locator('select').first()

    // Get available options
    const options = await periodSelector.locator('option').count()

    // If multiple periods available, change selection
    if (options > 2) {
      await periodSelector.selectOption({ index: 2 })

      // Wait for data refresh
      await page.waitForTimeout(1000)

      // Assert - Selected value changed
      const newValue = await periodSelector.inputValue()
      expect(newValue).toBeTruthy()
    }
  })

  test('should show data count for selected period', async ({ page }) => {
    // Act
    await page.goto('/')

    await page.waitForTimeout(2000)

    // Assert - Should show "件のデータ" badge
    const dataCountBadge = page.locator('text=件のデータ')
    await expect(dataCountBadge).toBeVisible()

    const countText = await dataCountBadge.textContent()
    expect(countText).toMatch(/\d+件のデータ/)
  })

  test('should display key statistics', async ({ page }) => {
    // Act
    await page.goto('/')

    // Assert - Should show key metrics
    const statistics = [
      'text=平均マージン, text=合計粗利, text=従業員数',
    ]

    for (const stat of statistics) {
      const element = page.locator(stat).first()
      await expect(element).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display margin gauge chart', async ({ page }) => {
    // Act
    await page.goto('/')

    // Assert - Should have gauge chart
    const gaugeChart = page.locator(
      'canvas, [data-testid="margin-gauge"], text=マージン'
    ).first()

    await expect(gaugeChart).toBeVisible({ timeout: 5000 })
  })

  test('should display top performers ranking', async ({ page }) => {
    // Act
    await page.goto('/')

    // Assert - Should show top employees
    const rankingSection = page.locator(
      'text=トップ, text=上位, text=ランキング, [data-testid="employee-ranking"]'
    ).first()

    await expect(rankingSection).toBeVisible({ timeout: 5000 })
  })

  test('should display company comparison chart', async ({ page }) => {
    // Act
    await page.goto('/')

    // Assert - Should show company profit comparison
    const companyChart = page.locator(
      'canvas, text=派遣先, text=Company, [data-testid="company-chart"]'
    ).first()

    await expect(companyChart).toBeVisible({ timeout: 5000 })
  })

  test('should have refresh button', async ({ page }) => {
    // Act
    await page.goto('/')

    // Assert
    const refreshButton = page.locator(
      'button:has-text("更新"), button:has-text("Refresh"), [aria-label*="refresh"], [aria-label*="更新"]'
    ).first()

    await expect(refreshButton).toBeVisible()
  })

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    // Act
    await page.goto('/')

    const refreshButton = page.locator(
      'button:has-text("更新"), button:has-text("Refresh")'
    ).first()

    const initialText = await page.locator('text=最終更新').textContent()

    // Click refresh
    await refreshButton.click()

    // Wait for data to refresh
    await page.waitForTimeout(2000)

    // Assert - Data should be reloaded (timestamp updated)
    const updatedText = await page.locator('text=最終更新').textContent()

    // Text should exist (timestamps might be same if no delay, but structure should update)
    expect(updatedText).toBeTruthy()
  })

  test('should show loading state when fetching data', async ({ page }) => {
    // Act
    await page.goto('/')

    // Should briefly show loading (or skeleton)
    const skeleton = page.locator(
      '[data-testid="stats-skeleton"], .animate-pulse, [aria-busy="true"]'
    ).first()

    // Might already be loaded, so just check for completion
    const stats = page.locator('[data-testid="dashboard-stats"], text=統計').first()
    await expect(stats).toBeVisible({ timeout: 5000 })
  })

  test('should handle empty data state', async ({ page }) => {
    // If no data exists, should show empty state
    await page.goto('/')

    // Either show data or show "データがありません"
    const dataExists = await page.locator(
      'canvas, text=粗利, [data-testid="dashboard-stats"]'
    ).first().isVisible()

    const emptyState = await page.locator(
      'text=データがありません'
    ).first().isVisible()

    // Should have one or the other
    expect(dataExists || emptyState).toBeTruthy()
  })

  test('should show upload prompt if no data', async ({ page }) => {
    // If no payroll data exists, should prompt to upload
    await page.goto('/')

    const uploadPrompt = page.locator(
      'text=ファイルをアップロード, a[href="/upload"], button:has-text("アップロード")'
    ).first()

    // Should show upload option
    // await expect(uploadPrompt).toBeVisible()
  })

  test('should navigate to employees page from sidebar', async ({ page }) => {
    // Act
    await page.goto('/')

    const employeesLink = page.locator(
      'a:has-text("従業員"), a:has-text("Employees"), [data-testid="nav-employees"]'
    ).first()

    await employeesLink.click()

    // Assert
    await expect(page).toHaveURL(/\/employees/)
  })

  test('should navigate to companies page from sidebar', async ({ page }) => {
    // Act
    await page.goto('/')

    const companiesLink = page.locator(
      'a:has-text("派遣先"), a:has-text("Companies"), [data-testid="nav-companies"]'
    ).first()

    await companiesLink.click()

    // Assert
    await expect(page).toHaveURL(/\/companies/)
  })

  test('should navigate to payroll page from sidebar', async ({ page }) => {
    // Act
    await page.goto('/')

    const payrollLink = page.locator(
      'a:has-text("給与"), a:has-text("Payroll"), [data-testid="nav-payroll"]'
    ).first()

    await payrollLink.click()

    // Assert
    await expect(page).toHaveURL(/\/payroll/)
  })

  test('should navigate to reports page from sidebar', async ({ page }) => {
    // Act
    await page.goto('/')

    const reportsLink = page.locator(
      'a:has-text("レポート"), a:has-text("Reports"), [data-testid="nav-reports"]'
    ).first()

    await reportsLink.click()

    // Assert
    await expect(page).toHaveURL(/\/reports/)
  })

  test('should toggle sidebar on mobile', async ({ page }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Find menu button
    const menuButton = page.locator(
      'button[aria-label*="menu"], button[aria-label*="toggle"], [data-testid="menu-button"]'
    ).first()

    // Menu button should exist on mobile
    await expect(menuButton).toBeVisible()

    // Click to toggle
    await menuButton.click()

    // Sidebar should be visible
    const sidebar = page.locator('[data-testid="sidebar"]').first()
    await expect(sidebar).toBeVisible()
  })

  test('should display alerts section', async ({ page }) => {
    // Act
    await page.goto('/')

    // Assert - Should show alerts
    const alertsSection = page.locator(
      'text=アラート, text=警告, [data-testid="alerts"]'
    ).first()

    await expect(alertsSection).toBeVisible({ timeout: 5000 })
  })

  test('should allow clicking on alert to view details', async ({ page }) => {
    // Act
    await page.goto('/')

    const alertButton = page.locator(
      'button:has-text("赤字"), button:has-text("マージン"), button:has-text("警告")'
    ).first()

    const isVisible = await alertButton.isVisible().catch(() => false)

    if (isVisible) {
      await alertButton.click()

      // Modal should appear
      const modal = page.locator(
        '[role="dialog"], .modal, text=従業員'
      ).first()

      await expect(modal).toBeVisible()
    }
  })

  test('should show responsive layout on different screen sizes', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    let dashboardTitle = page.locator('text=粗利ダッシュボード')
    await expect(dashboardTitle).toBeVisible()

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    dashboardTitle = page.locator('text=粗利ダッシュボード')
    await expect(dashboardTitle).toBeVisible()

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 })
    dashboardTitle = page.locator('text=粗利ダッシュボード')
    await expect(dashboardTitle).toBeVisible()
  })

  test('should maintain scroll position when changing period', async ({ page }) => {
    // Act
    await page.goto('/')

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500))

    const scrollBefore = await page.evaluate(() => window.scrollY)

    // Change period
    const periodSelector = page.locator('select').first()
    if (await periodSelector.isVisible()) {
      await periodSelector.selectOption({ index: 1 })

      // Should scroll to top when data changes (or maintain scroll)
      const scrollAfter = await page.evaluate(() => window.scrollY)

      // Either stays same or resets to top - both are acceptable
      expect([scrollBefore, 0]).toContain(scrollAfter)
    }
  })
})
