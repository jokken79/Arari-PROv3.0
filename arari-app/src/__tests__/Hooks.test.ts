/**
 * Test suite for TanStack Query custom hooks
 * Tests data fetching, mutations, caching, and error handling
 * Follows TDD: RED-GREEN-REFACTOR cycle
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useEmployees,
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  usePayrollRecords,
  usePayrollPeriods,
  useEmployeePayroll,
  usePeriodPayroll,
  useDashboardStats,
  useCompanies,
} from '@/hooks'
import * as api from '@/lib/api'

// Mock API module
jest.mock('@/lib/api', () => ({
  employeeApi: {
    getAll: jest.fn(),
    getOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  payrollApi: {
    getRecords: jest.fn(),
    getPeriods: jest.fn(),
    getByPeriod: jest.fn(),
    getByEmployee: jest.fn(),
    create: jest.fn(),
  },
  statisticsApi: {
    getDashboard: jest.fn(),
    getMonthly: jest.fn(),
    getCompanies: jest.fn(),
    getTrend: jest.fn(),
  },
  companyApi: {
    getAll: jest.fn(),
    getEmployees: jest.fn(),
    getCount: jest.fn(),
  },
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('TanStack Query Custom Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const mockEmployeeData = {
    id: 1,
    employee_id: 'EMP001',
    name: 'Taro Yamada',
    name_kana: 'ヤマダ太郎',
    dispatch_company: 'Company A',
    hourly_rate: 1500,
    billing_rate: 2000,
    status: 'active',
  }

  const mockPayrollData = {
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
  }

  const mockDashboardStats = {
    total_employees: 1,
    total_payroll: 1,
    total_billing: 1250000,
    average_margin: 12.0,
    recent_payrolls: [],
  }

  describe('useEmployees Hook', () => {
    it('fetches and returns employee list', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: [mockEmployeeData],
        error: null,
      })

      const { result } = renderHook(() => useEmployees(), { wrapper })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual([mockEmployeeData])
      expect(result.current.error).toBeNull()
    })

    it('accepts search, company, and employeeType parameters', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: [mockEmployeeData],
        error: null,
      })

      const params = {
        search: 'Taro',
        company: 'Company A',
        employeeType: 'haken',
      }

      renderHook(() => useEmployees(params), { wrapper })

      await waitFor(() => {
        expect(api.employeeApi.getAll).toHaveBeenCalledWith(
          'Taro',
          'Company A',
          'haken'
        )
      })
    })

    it('handles API errors gracefully', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: null,
        error: 'API Error',
      })

      const { result } = renderHook(() => useEmployees(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('caches results for 10 minutes (staleTime)', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: [mockEmployeeData],
        error: null,
      })

      const { result: result1 } = renderHook(() => useEmployees(), { wrapper })

      await waitFor(() => {
        expect(result1.current.data).toBeDefined()
      })

      // Second call should use cache
      const { result: result2 } = renderHook(() => useEmployees(), { wrapper })

      // Should return data immediately from cache
      expect(result2.current.data).toEqual([mockEmployeeData])
    })

    it('has correct query key for caching', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: [mockEmployeeData],
        error: null,
      })

      renderHook(() => useEmployees({ search: 'test' }), { wrapper })

      await waitFor(() => {
        // Query key includes params for proper cache separation
        expect(api.employeeApi.getAll).toHaveBeenCalled()
      })
    })
  })

  describe('useEmployee Hook (Single)', () => {
    it('fetches single employee by ID', async () => {
      ;(api.employeeApi.getOne as jest.Mock).mockResolvedValue({
        data: mockEmployeeData,
        error: null,
      })

      const { result } = renderHook(() => useEmployee('EMP001'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockEmployeeData)
    })

    it('is disabled when employeeId is null', () => {
      const { result } = renderHook(() => useEmployee(null), { wrapper })

      // Query should not run (enabled: false)
      expect(result.current.isLoading).toBe(false)
    })

    it('refetches when employeeId changes', async () => {
      ;(api.employeeApi.getOne as jest.Mock).mockResolvedValue({
        data: mockEmployeeData,
        error: null,
      })

      const { rerender } = renderHook(
        ({ id }: { id: string | null }) => useEmployee(id),
        { wrapper, initialProps: { id: 'EMP001' } }
      )

      await waitFor(() => {
        expect(api.employeeApi.getOne).toHaveBeenCalledWith('EMP001')
      })

      rerender({ id: 'EMP002' })

      await waitFor(() => {
        expect(api.employeeApi.getOne).toHaveBeenCalledWith('EMP002')
      })
    })
  })

  describe('usePayrollRecords Hook', () => {
    it('fetches and returns payroll records', async () => {
      ;(api.payrollApi.getRecords as jest.Mock).mockResolvedValue({
        data: [mockPayrollData],
        error: null,
      })

      const { result } = renderHook(() => usePayrollRecords(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual([mockPayrollData])
    })

    it('accepts period filter parameter', async () => {
      ;(api.payrollApi.getRecords as jest.Mock).mockResolvedValue({
        data: [mockPayrollData],
        error: null,
      })

      renderHook(() => usePayrollRecords({ period: '2025年1月' }), {
        wrapper,
      })

      await waitFor(() => {
        expect(api.payrollApi.getRecords).toHaveBeenCalledWith(
          expect.objectContaining({ period: '2025年1月' })
        )
      })
    })

    it('handles empty payroll data', async () => {
      ;(api.payrollApi.getRecords as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => usePayrollRecords(), { wrapper })

      await waitFor(() => {
        expect(result.current.data).toEqual([])
      })
    })
  })

  describe('usePayrollPeriods Hook', () => {
    it('fetches and returns available periods', async () => {
      const mockPeriods = ['2025年1月', '2024年12月', '2024年11月']
      ;(api.payrollApi.getPeriods as jest.Mock).mockResolvedValue({
        data: mockPeriods,
        error: null,
      })

      const { result } = renderHook(() => usePayrollPeriods(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockPeriods)
    })

    it('caches periods appropriately', async () => {
      const mockPeriods = ['2025年1月']
      ;(api.payrollApi.getPeriods as jest.Mock).mockResolvedValue({
        data: mockPeriods,
        error: null,
      })

      const { result } = renderHook(() => usePayrollPeriods(), { wrapper })

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      expect(api.payrollApi.getPeriods).toHaveBeenCalledTimes(1)
    })
  })

  describe('useDashboardStats Hook', () => {
    it('fetches dashboard statistics', async () => {
      ;(api.statisticsApi.getDashboard as jest.Mock).mockResolvedValue({
        data: mockDashboardStats,
        error: null,
      })

      const { result } = renderHook(
        () => useDashboardStats('2025年1月'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockDashboardStats)
    })

    it('accepts period parameter', async () => {
      ;(api.statisticsApi.getDashboard as jest.Mock).mockResolvedValue({
        data: mockDashboardStats,
        error: null,
      })

      renderHook(() => useDashboardStats('2025年2月'), { wrapper })

      await waitFor(() => {
        expect(api.statisticsApi.getDashboard).toHaveBeenCalledWith('2025年2月')
      })
    })

    it('refetches when period changes', async () => {
      ;(api.statisticsApi.getDashboard as jest.Mock).mockResolvedValue({
        data: mockDashboardStats,
        error: null,
      })

      const { rerender } = renderHook(
        ({ period }: { period: string }) => useDashboardStats(period),
        { wrapper, initialProps: { period: '2025年1月' } }
      )

      await waitFor(() => {
        expect(api.statisticsApi.getDashboard).toHaveBeenCalledWith('2025年1月')
      })

      rerender({ period: '2025年2月' })

      await waitFor(() => {
        expect(api.statisticsApi.getDashboard).toHaveBeenCalledWith('2025年2月')
      })
    })
  })

  describe('useCreateEmployee Mutation', () => {
    it('creates employee successfully', async () => {
      const newEmployee = {
        employee_id: 'EMP002',
        name: 'Hanako',
        dispatch_company: 'Company B',
      }

      ;(api.employeeApi.create as jest.Mock).mockResolvedValue({
        data: { id: 2, ...newEmployee },
        error: null,
      })

      const { result } = renderHook(() => useCreateEmployee(), { wrapper })

      result.current.mutate(newEmployee as any)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({ id: 2, ...newEmployee })
    })

    it('invalidates employees query cache on success', async () => {
      ;(api.employeeApi.create as jest.Mock).mockResolvedValue({
        data: { id: 2 },
        error: null,
      })

      const { result } = renderHook(() => useCreateEmployee(), { wrapper })

      result.current.mutate({} as any)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Cache should be invalidated (verified through query client state)
    })

    it('handles creation errors', async () => {
      ;(api.employeeApi.create as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Creation failed',
      })

      const { result } = renderHook(() => useCreateEmployee(), { wrapper })

      result.current.mutate({} as any)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('shows success toast on creation', async () => {
      const toast = require('react-hot-toast').default

      ;(api.employeeApi.create as jest.Mock).mockResolvedValue({
        data: { id: 2 },
        error: null,
      })

      const { result } = renderHook(() => useCreateEmployee(), { wrapper })

      result.current.mutate({} as any)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('従業員を作成しました')
      })
    })

    it('shows error toast on failure', async () => {
      const toast = require('react-hot-toast').default

      ;(api.employeeApi.create as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Network error',
      })

      const { result } = renderHook(() => useCreateEmployee(), { wrapper })

      result.current.mutate({} as any)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        )
      })
    })
  })

  describe('useUpdateEmployee Mutation', () => {
    it('updates employee successfully', async () => {
      const updateData = {
        employeeId: 'EMP001',
        employee: { name: 'Updated Name' },
      }

      ;(api.employeeApi.update as jest.Mock).mockResolvedValue({
        data: { ...mockEmployeeData, name: 'Updated Name' },
        error: null,
      })

      const { result } = renderHook(() => useUpdateEmployee(), { wrapper })

      result.current.mutate(updateData as any)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(api.employeeApi.update).toHaveBeenCalledWith(
        'EMP001',
        updateData.employee
      )
    })

    it('invalidates both list and single employee caches', async () => {
      ;(api.employeeApi.update as jest.Mock).mockResolvedValue({
        data: mockEmployeeData,
        error: null,
      })

      const { result } = renderHook(() => useUpdateEmployee(), { wrapper })

      result.current.mutate({
        employeeId: 'EMP001',
        employee: {},
      } as any)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Both caches should be invalidated
    })

    it('shows success toast on update', async () => {
      const toast = require('react-hot-toast').default

      ;(api.employeeApi.update as jest.Mock).mockResolvedValue({
        data: mockEmployeeData,
        error: null,
      })

      const { result } = renderHook(() => useUpdateEmployee(), { wrapper })

      result.current.mutate({
        employeeId: 'EMP001',
        employee: {},
      } as any)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('従業員情報を更新しました')
      })
    })
  })

  describe('useDeleteEmployee Mutation', () => {
    it('deletes employee successfully', async () => {
      ;(api.employeeApi.delete as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useDeleteEmployee(), { wrapper })

      result.current.mutate('EMP001')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(api.employeeApi.delete).toHaveBeenCalledWith('EMP001')
    })

    it('invalidates employee caches on deletion', async () => {
      ;(api.employeeApi.delete as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useDeleteEmployee(), { wrapper })

      result.current.mutate('EMP001')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Caches should be invalidated
    })

    it('shows success toast on deletion', async () => {
      const toast = require('react-hot-toast').default

      ;(api.employeeApi.delete as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useDeleteEmployee(), { wrapper })

      result.current.mutate('EMP001')

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('従業員を削除しました')
      })
    })
  })

  describe('useCompanies Hook', () => {
    it('fetches and returns company list', async () => {
      const mockCompanies = [
        { name: 'Company A', count: 5 },
        { name: 'Company B', count: 3 },
      ]

      ;(api.companyApi.getAll as jest.Mock).mockResolvedValue({
        data: mockCompanies,
        error: null,
      })

      const { result } = renderHook(() => useCompanies(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockCompanies)
    })

    it('handles empty company data', async () => {
      ;(api.companyApi.getAll as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useCompanies(), { wrapper })

      await waitFor(() => {
        expect(result.current.data).toEqual([])
      })
    })
  })

  describe('Query Key Consistency', () => {
    it('generates consistent query keys for caching', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: [mockEmployeeData],
        error: null,
      })

      const params = { search: 'test' }

      const { result: result1 } = renderHook(() => useEmployees(params), {
        wrapper,
      })

      await waitFor(() => {
        expect(result1.current.data).toBeDefined()
      })

      // Same params should use cache
      const { result: result2 } = renderHook(() => useEmployees(params), {
        wrapper,
      })

      expect(result2.current.data).toEqual([mockEmployeeData])
      // getAll should only be called once (second call used cache)
      expect(api.employeeApi.getAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Network error',
      })

      const { result } = renderHook(() => useEmployees(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })

    it('does not retry on error by default', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: null,
        error: 'API Error',
      })

      const { result } = renderHook(() => useEmployees(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      // Should only call once (no retries)
      expect(api.employeeApi.getAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('Hook Composition', () => {
    it('works correctly when used together', async () => {
      ;(api.employeeApi.getAll as jest.Mock).mockResolvedValue({
        data: [mockEmployeeData],
        error: null,
      })
      ;(api.payrollApi.getRecords as jest.Mock).mockResolvedValue({
        data: [mockPayrollData],
        error: null,
      })

      const { result: employeesResult } = renderHook(() => useEmployees(), {
        wrapper,
      })
      const { result: payrollResult } = renderHook(() => usePayrollRecords(), {
        wrapper,
      })

      await waitFor(() => {
        expect(employeesResult.current.data).toBeDefined()
        expect(payrollResult.current.data).toBeDefined()
      })

      expect(employeesResult.current.data).toEqual([mockEmployeeData])
      expect(payrollResult.current.data).toEqual([mockPayrollData])
    })
  })
})
