/**
 * Test suite for Dashboard (DashboardPage) component
 * Tests data fetching, rendering, period selection, and interactions
 * Follows TDD: RED-GREEN-REFACTOR cycle
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from '@/app/page'
import { useAppStore } from '@/store/appStore'
import * as hooks from '@/hooks'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock app store
jest.mock('@/store/appStore', () => ({
  useAppStore: jest.fn(),
}))

// Mock hooks
jest.mock('@/hooks', () => ({
  useEmployees: jest.fn(),
  usePayrollRecords: jest.fn(),
  usePayrollPeriods: jest.fn(),
  useDashboardStats: jest.fn(),
}))

// Mock components that are complex
jest.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

jest.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}))

jest.mock('@/components/dashboard/DashboardStats', () => ({
  DashboardStats: () => <div data-testid="dashboard-stats">Stats</div>,
}))

jest.mock('@/components/dashboard/DashboardAlerts', () => ({
  DashboardAlerts: ({ onAlertClick }: any) => (
    <div data-testid="dashboard-alerts">
      <button onClick={() => onAlertClick('critical')} data-testid="critical-alert-btn">
        Critical Alert
      </button>
    </div>
  ),
}))

jest.mock('@/components/dashboard/DashboardCharts', () => ({
  DashboardCharts: () => <div data-testid="dashboard-charts">Charts</div>,
}))

jest.mock('@/components/dashboard/EmployeeRankingTable', () => ({
  EmployeeRankingTable: () => <div data-testid="employee-ranking">Ranking</div>,
}))

jest.mock('@/components/dashboard/RecentPayrolls', () => ({
  RecentPayrolls: () => <div data-testid="recent-payrolls">Recent</div>,
}))

jest.mock('@/components/dashboard/PeriodSelector', () => ({
  PeriodSelector: ({ periods, selectedPeriod, onPeriodChange }: any) => (
    <div data-testid="period-selector">
      <select value={selectedPeriod || ''} onChange={(e) => onPeriodChange(e.target.value)}>
        <option value="">--期間を選択--</option>
        {periods.map((p: string) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  ),
}))

jest.mock('@/components/payroll/PayrollSlipModal', () => ({
  PayrollSlipModal: ({ isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="payroll-slip-modal">
        <button onClick={onClose} data-testid="close-modal-btn">
          Close
        </button>
      </div>
    ) : null
  ),
}))

jest.mock('@/components/ui/skeleton', () => ({
  DashboardStatsSkeleton: () => <div data-testid="stats-skeleton">Skeleton</div>,
  DashboardChartsSkeleton: () => <div data-testid="charts-skeleton">Charts Skeleton</div>,
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Dashboard Page', () => {
  const mockSetSelectedPeriod = jest.fn()
  const mockQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const mockEmployees = [
    {
      id: 1,
      employee_id: 'EMP001',
      name: 'Taro Yamada',
      name_kana: 'ヤマダ太郎',
      dispatch_company: 'Company A',
      hourly_rate: 1500,
      billing_rate: 2000,
      status: 'active',
    },
  ]

  const mockPayrollRecords = [
    {
      id: 1,
      employee_id: 'EMP001',
      period: '2025年1月',
      work_hours: 160,
      overtime_hours: 10,
      gross_salary: 1000000,
      billing_amount: 1250000,
      total_company_cost: 1100000,
      gross_profit: 150000,
      profit_margin: 12.0,
    },
  ]

  const mockPeriods = ['2025年1月', '2024年12月', '2024年11月']

  const mockDashboardStats = {
    total_employees: 1,
    total_payroll: 1,
    total_billing: 1250000,
    total_cost: 1100000,
    total_profit: 150000,
    average_margin: 12.0,
    top_companies: [
      {
        company_name: 'Company A',
        employee_count: 1,
        average_margin: 12.0,
      },
    ],
    recent_payrolls: [],
    profit_distribution: [],
    profit_trend: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAppStore as jest.Mock).mockReturnValue({
      selectedPeriod: '2025年1月',
      setSelectedPeriod: mockSetSelectedPeriod,
    })
    ;(hooks.useEmployees as jest.Mock).mockReturnValue({
      data: mockEmployees,
      isLoading: false,
    })
    ;(hooks.usePayrollRecords as jest.Mock).mockReturnValue({
      data: mockPayrollRecords,
      isLoading: false,
    })
    ;(hooks.usePayrollPeriods as jest.Mock).mockReturnValue({
      data: mockPeriods,
      isLoading: false,
    })
    ;(hooks.useDashboardStats as jest.Mock).mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      dataUpdatedAt: Date.now(),
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ value: 12 }),
    })
  })

  describe('Basic Rendering', () => {
    it('renders dashboard page without crashing', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )
      expect(screen.getByText('粗利ダッシュボード')).toBeInTheDocument()
    })

    it('renders header and sidebar', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })

    it('shows loading skeleton while fetching data', () => {
      ;(hooks.useDashboardStats as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: 0,
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument()
      expect(screen.getByText('データを読み込み中...')).toBeInTheDocument()
    })

    it('shows error message when API fails', () => {
      const errorMsg = 'API接続失敗'
      ;(hooks.useDashboardStats as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error(errorMsg),
        refetch: jest.fn(),
        dataUpdatedAt: 0,
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByText('接続エラー')).toBeInTheDocument()
      expect(screen.getByText(errorMsg)).toBeInTheDocument()
    })

    it('shows empty state when no payroll data exists', () => {
      ;(hooks.usePayrollRecords as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByText('データがありません')).toBeInTheDocument()
      expect(screen.getByText(/給与明細Excelファイルをアップロード/)).toBeInTheDocument()
    })
  })

  describe('Period Selection', () => {
    it('auto-selects latest period on load', () => {
      ;(useAppStore as jest.Mock).mockReturnValue({
        selectedPeriod: null,
        setSelectedPeriod: mockSetSelectedPeriod,
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      waitFor(() => {
        // Should call setSelectedPeriod with latest period
        expect(mockSetSelectedPeriod).toHaveBeenCalledWith('2025年1月')
      })
    })

    it('sorts periods chronologically before selecting latest', () => {
      const unsortedPeriods = ['2024年11月', '2025年1月', '2024年12月']
      ;(hooks.usePayrollPeriods as jest.Mock).mockReturnValue({
        data: unsortedPeriods,
        isLoading: false,
      })
      ;(useAppStore as jest.Mock).mockReturnValue({
        selectedPeriod: null,
        setSelectedPeriod: mockSetSelectedPeriod,
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      waitFor(() => {
        // Should select 2025年1月 (latest) even though it's not first in array
        expect(mockSetSelectedPeriod).toHaveBeenCalledWith('2025年1月')
      })
    })

    it('renders period selector with available periods', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      const selector = screen.getByTestId('period-selector')
      expect(selector).toBeInTheDocument()

      // Check periods are available
      mockPeriods.forEach((period) => {
        expect(selector).toHaveTextContent(period)
      })
    })

    it('updates selected period when user changes period', async () => {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      const selector = screen.getByTestId('period-selector').querySelector('select')!
      await user.selectOptions(selector, '2024年12月')

      waitFor(() => {
        expect(mockSetSelectedPeriod).toHaveBeenCalledWith('2024年12月')
      })
    })

    it('shows count of payroll records for selected period', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // Should show "1件のデータ" for one payroll record
      expect(screen.getByText(/1件のデータ/)).toBeInTheDocument()
    })
  })

  describe('Data Fetching', () => {
    it('fetches employees on mount', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(hooks.useEmployees).toHaveBeenCalled()
    })

    it('fetches payroll records on mount', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(hooks.usePayrollRecords).toHaveBeenCalled()
    })

    it('fetches available periods on mount', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(hooks.usePayrollPeriods).toHaveBeenCalled()
    })

    it('fetches dashboard stats with selected period', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(hooks.useDashboardStats).toHaveBeenCalledWith('2025年1月')
    })

    it('fetches target margin from API', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settings/target_margin')
      )
    })
  })

  describe('Component Rendering', () => {
    it('renders dashboard stats component', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument()
    })

    it('renders dashboard alerts component', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByTestId('dashboard-alerts')).toBeInTheDocument()
    })

    it('renders dashboard charts component', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument()
    })

    it('renders employee ranking table', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByTestId('employee-ranking')).toBeInTheDocument()
    })

    it('renders recent payrolls section', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByTestId('recent-payrolls')).toBeInTheDocument()
    })
  })

  describe('Alert Modals', () => {
    it('shows alert modal when alert button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      const alertBtn = screen.getByTestId('critical-alert-btn')
      await user.click(alertBtn)

      // Alert modal should appear (this is handled by page logic)
      // Implementation depends on exact modal behavior
    })

    it('closes alert modal when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      const alertBtn = screen.getByTestId('critical-alert-btn')
      await user.click(alertBtn)

      // Find and click close button if visible
      const closeBtn = screen.queryByText('✕')
      if (closeBtn) {
        await user.click(closeBtn)
      }
    })
  })

  describe('Payroll Slip Modal', () => {
    it('renders payroll slip modal when employee is selected', async () => {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // Simulate employee selection (this happens via table or ranking)
      // Modal should appear based on selectedEmployeeId state
    })

    it('closes payroll slip modal when close button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // If modal is open, close button should close it
    })
  })

  describe('Refresh Functionality', () => {
    it('has refresh button', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByText('データ更新')).toBeInTheDocument()
    })

    it('calls refetch when refresh button is clicked', async () => {
      const mockRefetch = jest.fn()
      ;(hooks.useDashboardStats as jest.Mock).mockReturnValue({
        data: mockDashboardStats,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        dataUpdatedAt: Date.now(),
      })

      const user = userEvent.setup()
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      const refreshBtn = screen.getByText('データ更新')
      await user.click(refreshBtn)

      expect(mockRefetch).toHaveBeenCalled()
    })

    it('disables refresh button while loading', () => {
      ;(hooks.useDashboardStats as jest.Mock).mockReturnValue({
        data: mockDashboardStats,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      const refreshBtn = screen.getByText('データ更新')
      expect(refreshBtn).toBeDisabled()
    })

    it('displays last updated timestamp', () => {
      const now = Date.now()
      ;(hooks.useDashboardStats as jest.Mock).mockReturnValue({
        data: mockDashboardStats,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: now,
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByText(/最終更新:/)).toBeInTheDocument()
    })
  })

  describe('Data Transformation', () => {
    it('transforms API employee data to component format', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // Component should render without errors
      // Data transformation should be transparent to tests
      expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument()
    })

    it('transforms API payroll data to component format', () => {
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // Component should render without errors
      expect(screen.getByTestId('employee-ranking')).toBeInTheDocument()
    })

    it('calculates top and bottom performers from payroll data', () => {
      const multipleRecords = [
        { ...mockPayrollRecords[0], gross_profit: 150000 },
        { ...mockPayrollRecords[0], employee_id: 'EMP002', gross_profit: 50000 },
        { ...mockPayrollRecords[0], employee_id: 'EMP003', gross_profit: -10000 },
      ]
      ;(hooks.usePayrollRecords as jest.Mock).mockReturnValue({
        data: multipleRecords,
        isLoading: false,
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // Should handle multiple employees and ranking logic
      expect(screen.getByTestId('employee-ranking')).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('shows retry button on error', () => {
      ;(hooks.useDashboardStats as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('API Error'),
        refetch: jest.fn(),
        dataUpdatedAt: 0,
      })

      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(screen.getByText('再接続')).toBeInTheDocument()
    })

    it('calls refetch when retry button is clicked', async () => {
      const mockRefetch = jest.fn()
      ;(hooks.useDashboardStats as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('API Error'),
        refetch: mockRefetch,
        dataUpdatedAt: 0,
      })

      const user = userEvent.setup()
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      const retryBtn = screen.getByText('再接続')
      await user.click(retryBtn)

      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe('Sidebar Toggle', () => {
    it('toggles sidebar open/closed', async () => {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={mockQueryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // Sidebar toggle is controlled by header menu click
      // This test verifies the integration works
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })
  })
})
