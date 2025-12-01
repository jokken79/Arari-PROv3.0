'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Employee,
  PayrollRecord,
  MonthlySummary,
  CompanySummary,
  DashboardStats,
  FilterOptions,
  Theme
} from '@/types'
import { sampleEmployees, samplePayrollRecords, generateDashboardStats } from '@/data/sampleData'
import { employeeApi, payrollApi, statisticsApi } from '@/lib/api'

interface AppState {
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Data
  employees: Employee[]
  payrollRecords: PayrollRecord[]
  monthlySummaries: MonthlySummary[]
  companySummaries: CompanySummary[]
  dashboardStats: DashboardStats | null

  // Filters
  filters: FilterOptions
  setFilters: (filters: FilterOptions) => void
  clearFilters: () => void

  // Selected period
  selectedPeriod: string
  setSelectedPeriod: (period: string) => void
  availablePeriods: string[]

  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Backend connection status
  useBackend: boolean

  // Actions
  loadSampleData: () => void
  loadDataFromBackend: () => Promise<void>
  addPayrollRecords: (records: PayrollRecord[]) => void
  updateEmployee: (employee: Employee) => void
  deleteEmployee: (id: string) => void
  calculateMonthlySummary: (period: string) => MonthlySummary | null
  refreshDashboardStats: () => void
  refreshFromBackend: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme - default to dark
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // Data
      employees: [],
      payrollRecords: [],
      monthlySummaries: [],
      companySummaries: [],
      dashboardStats: null,

      // Filters
      filters: {},
      setFilters: (filters) => set({ filters }),
      clearFilters: () => set({ filters: {} }),

      // Selected period
      selectedPeriod: '',
      setSelectedPeriod: (period) => set({ selectedPeriod: period }),
      availablePeriods: [],

      // Loading
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      // Backend status
      useBackend: false,

      // Actions
      loadSampleData: async () => {
        // Try to load from backend first
        try {
          await get().loadDataFromBackend()
        } catch (error) {
          console.log('Backend not available, using sample data')
          // Fallback to sample data
          const employees = sampleEmployees
          const payrollRecords = samplePayrollRecords
          const periods = Array.from(new Set(payrollRecords.map(r => r.period))).sort().reverse()
          const selectedPeriod = periods[0] || '2025年1月'
          const dashboardStats = generateDashboardStats(employees, payrollRecords)

          set({
            employees,
            payrollRecords,
            availablePeriods: periods,
            selectedPeriod,
            dashboardStats,
            useBackend: false,
          })
        }
      },

      loadDataFromBackend: async () => {
        set({ isLoading: true })

        try {
          // Fetch employees from backend
          const empResponse = await employeeApi.getAll()
          if (empResponse.error) throw new Error(empResponse.error)

          // Fetch payroll records
          const payrollResponse = await payrollApi.getAll()
          if (payrollResponse.error) throw new Error(payrollResponse.error)

          // Fetch periods
          const periodsResponse = await payrollApi.getPeriods()
          if (periodsResponse.error) throw new Error(periodsResponse.error)

          // Fetch dashboard stats
          const statsResponse = await statisticsApi.getDashboard()
          if (statsResponse.error) throw new Error(statsResponse.error)

          // Transform backend data to frontend format
          const employees: Employee[] = (empResponse.data || []).map(emp => ({
            id: emp.employee_id,
            employeeId: emp.employee_id,
            name: emp.name,
            nameKana: emp.name_kana || '',
            dispatchCompany: emp.dispatch_company,
            department: emp.department || '',
            hourlyRate: emp.hourly_rate,
            billingRate: emp.billing_rate,
            status: emp.status as 'active' | 'inactive' | 'pending',
            hireDate: emp.hire_date || '',
            createdAt: emp.created_at || new Date().toISOString(),
            updatedAt: emp.updated_at || new Date().toISOString(),
          }))

          const payrollRecords: PayrollRecord[] = (payrollResponse.data || []).map(rec => ({
            id: rec.id?.toString() || '',
            employeeId: rec.employee_id,
            period: rec.period,
            workDays: rec.work_days,
            workHours: rec.work_hours,
            overtimeHours: rec.overtime_hours,
            paidLeaveHours: rec.paid_leave_hours,
            paidLeaveDays: rec.paid_leave_days,
            baseSalary: rec.base_salary,
            overtimePay: rec.overtime_pay,
            transportAllowance: rec.transport_allowance,
            otherAllowances: rec.other_allowances,
            grossSalary: rec.gross_salary,
            socialInsurance: rec.social_insurance,
            employmentInsurance: rec.employment_insurance,
            incomeTax: rec.income_tax,
            residentTax: rec.resident_tax,
            otherDeductions: rec.other_deductions,
            netSalary: rec.net_salary,
            billingAmount: rec.billing_amount,
            companySocialInsurance: rec.company_social_insurance,
            companyEmploymentInsurance: rec.company_employment_insurance,
            totalCompanyCost: rec.total_company_cost,
            grossProfit: rec.gross_profit,
            profitMargin: rec.profit_margin,
          }))

          const periods = periodsResponse.data || []
          const selectedPeriod = periods[0] || '2025年1月'

          // Transform dashboard stats
          const stats = statsResponse.data
          const dashboardStats: DashboardStats = stats ? {
            totalEmployees: stats.total_employees,
            activeEmployees: stats.active_employees,
            totalCompanies: stats.total_companies,
            averageProfit: stats.average_profit,
            averageMargin: stats.average_margin,
            totalMonthlyRevenue: stats.total_monthly_revenue,
            totalMonthlyCost: stats.total_monthly_cost,
            totalMonthlyProfit: stats.total_monthly_profit,
            profitTrend: (stats.profit_trend || []).map(t => ({
              period: t.period,
              revenue: t.revenue,
              cost: t.cost,
              profit: t.profit,
              margin: t.margin,
            })),
            profitDistribution: (stats.profit_distribution || []).map(d => ({
              range: d.range,
              count: d.count,
              percentage: d.percentage,
            })),
            topCompanies: (stats.top_companies || []).map(c => ({
              companyName: c.company_name,
              employeeCount: c.employee_count,
              averageHourlyRate: c.average_hourly_rate,
              averageBillingRate: c.average_billing_rate,
              averageProfit: c.average_profit,
              averageMargin: c.average_margin,
              totalMonthlyProfit: c.total_monthly_profit,
              employees: [], // Backend doesn't provide employee details for summary
            })),
            recentPayrolls: payrollRecords.slice(0, 10),
          } : generateDashboardStats(employees, payrollRecords)

          set({
            employees,
            payrollRecords,
            availablePeriods: periods,
            selectedPeriod,
            dashboardStats,
            useBackend: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      refreshFromBackend: async () => {
        if (get().useBackend) {
          await get().loadDataFromBackend()
        } else {
          get().refreshDashboardStats()
        }
      },

      addPayrollRecords: (records) => {
        const currentRecords = get().payrollRecords
        const newRecords = [...currentRecords, ...records]
        const periods = Array.from(new Set(newRecords.map(r => r.period))).sort().reverse()

        set({
          payrollRecords: newRecords,
          availablePeriods: periods,
        })

        get().refreshDashboardStats()
      },

      updateEmployee: (employee) => {
        const employees = get().employees.map(e =>
          e.id === employee.id ? employee : e
        )
        set({ employees })
        get().refreshDashboardStats()
      },

      deleteEmployee: (id) => {
        const employees = get().employees.filter(e => e.id !== id)
        set({ employees })
        get().refreshDashboardStats()
      },

      calculateMonthlySummary: (period) => {
        const { employees, payrollRecords } = get()
        const periodRecords = payrollRecords.filter(r => r.period === period)

        if (periodRecords.length === 0) return null

        const summary: MonthlySummary = {
          period,
          year: parseInt(period.match(/(\d{4})年/)?.[1] || '2025'),
          month: parseInt(period.match(/(\d{1,2})月/)?.[1] || '1'),
          totalEmployees: periodRecords.length,
          totalRevenue: periodRecords.reduce((sum, r) => sum + r.billingAmount, 0),
          totalSalaryCost: periodRecords.reduce((sum, r) => sum + r.grossSalary, 0),
          totalSocialInsurance: periodRecords.reduce((sum, r) => sum + r.companySocialInsurance, 0),
          totalEmploymentInsurance: periodRecords.reduce((sum, r) => sum + r.companyEmploymentInsurance, 0),
          totalPaidLeaveCost: periodRecords.reduce((sum, r) => sum + (r.paidLeaveHours * (employees.find(e => e.employeeId === r.employeeId)?.hourlyRate || 0)), 0),
          totalTransportCost: periodRecords.reduce((sum, r) => sum + r.transportAllowance, 0),
          totalCompanyCost: periodRecords.reduce((sum, r) => sum + r.totalCompanyCost, 0),
          totalGrossProfit: periodRecords.reduce((sum, r) => sum + r.grossProfit, 0),
          averageMargin: periodRecords.reduce((sum, r) => sum + r.profitMargin, 0) / periodRecords.length,
          topProfitEmployees: periodRecords
            .sort((a, b) => b.grossProfit - a.grossProfit)
            .slice(0, 5)
            .map(r => ({
              employeeId: r.employeeId,
              name: employees.find(e => e.employeeId === r.employeeId)?.name || '',
              profit: r.grossProfit,
            })),
          bottomProfitEmployees: periodRecords
            .sort((a, b) => a.grossProfit - b.grossProfit)
            .slice(0, 5)
            .map(r => ({
              employeeId: r.employeeId,
              name: employees.find(e => e.employeeId === r.employeeId)?.name || '',
              profit: r.grossProfit,
            })),
        }

        return summary
      },

      refreshDashboardStats: () => {
        const { employees, payrollRecords } = get()
        const dashboardStats = generateDashboardStats(employees, payrollRecords)
        set({ dashboardStats })
      },
    }),
    {
      name: 'arari-pro-storage',
      partialize: (state) => ({
        theme: state.theme,
        employees: state.employees,
        payrollRecords: state.payrollRecords,
        selectedPeriod: state.selectedPeriod,
      }),
    }
  )
)
