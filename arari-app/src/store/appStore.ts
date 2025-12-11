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
// Sample data removed - always use backend
import { employeeApi, payrollApi, statisticsApi } from '@/lib/api'
import { sortPeriodsAscending, sortPeriodsDescending } from '@/lib/utils'

// Generate dashboard stats from local data (fallback)
function generateDashboardStats(employees: Employee[], payrollRecords: PayrollRecord[]): DashboardStats {
  if (payrollRecords.length === 0) {
    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'active').length,
      totalCompanies: new Set(employees.map(e => e.dispatchCompany)).size,
      averageProfit: 0,
      averageMargin: 0,
      totalMonthlyRevenue: 0,
      totalMonthlyCost: 0,
      totalMonthlyProfit: 0,
      profitTrend: [],
      profitDistribution: [],
      topCompanies: [],
      recentPayrolls: [],
    }
  }

  // Get latest period
  const periods = sortPeriodsDescending(Array.from(new Set(payrollRecords.map(r => r.period))))
  const latestPeriod = periods[0]
  const latestRecords = payrollRecords.filter(r => r.period === latestPeriod)

  // Calculate totals
  const totalRevenue = latestRecords.reduce((sum, r) => sum + r.billingAmount, 0)
  const totalCost = latestRecords.reduce((sum, r) => sum + r.totalCompanyCost, 0)
  const totalProfit = latestRecords.reduce((sum, r) => sum + r.grossProfit, 0)
  const avgMargin = latestRecords.length > 0
    ? latestRecords.reduce((sum, r) => sum + r.profitMargin, 0) / latestRecords.length
    : 0
  const avgProfit = latestRecords.length > 0 ? totalProfit / latestRecords.length : 0

  // Get unique companies
  const companies = Array.from(new Set(employees.map(e => e.dispatchCompany)))

  // Calculate company summaries
  const topCompanies: CompanySummary[] = companies.map(company => {
    const companyEmployees = employees.filter(e => e.dispatchCompany === company)
    const companyRecords = latestRecords.filter(r =>
      companyEmployees.some(e => e.employeeId === r.employeeId)
    )

    const companyProfit = companyRecords.reduce((sum, r) => sum + r.grossProfit, 0)
    const companyMargin = companyRecords.length > 0
      ? companyRecords.reduce((sum, r) => sum + r.profitMargin, 0) / companyRecords.length
      : 0

    return {
      companyName: company,
      employeeCount: companyEmployees.length,
      averageHourlyRate: companyEmployees.length > 0
        ? companyEmployees.reduce((sum, e) => sum + e.hourlyRate, 0) / companyEmployees.length
        : 0,
      averageBillingRate: companyEmployees.length > 0
        ? companyEmployees.reduce((sum, e) => sum + e.billingRate, 0) / companyEmployees.length
        : 0,
      averageProfit: companyRecords.length > 0 ? companyProfit / companyRecords.length : 0,
      averageMargin: companyMargin,
      totalMonthlyProfit: companyProfit,
      employees: companyEmployees,
    }
  }).sort((a, b) => b.totalMonthlyProfit - a.totalMonthlyProfit)

  // Calculate profit trend (last 6 months)
  const profitTrend = periods.slice(0, 6).map(period => {
    const periodRecords = payrollRecords.filter(r => r.period === period)
    const revenue = periodRecords.reduce((sum, r) => sum + r.billingAmount, 0)
    const cost = periodRecords.reduce((sum, r) => sum + r.totalCompanyCost, 0)
    const profit = periodRecords.reduce((sum, r) => sum + r.grossProfit, 0)
    const margin = periodRecords.length > 0
      ? periodRecords.reduce((sum, r) => sum + r.profitMargin, 0) / periodRecords.length
      : 0

    return { period, revenue, cost, profit, margin }
  }).reverse()

  // Calculate profit distribution
  const marginRanges = [
    { range: '<3%', min: -999, max: 3 },
    { range: '3-7%', min: 3, max: 7 },
    { range: '7-10%', min: 7, max: 10 },
    { range: '>10%', min: 10, max: 999 },
  ]

  const profitDistribution = marginRanges.map(range => {
    const count = latestRecords.filter(
      r => r.profitMargin >= range.min && r.profitMargin < range.max
    ).length
    return {
      range: range.range,
      count,
      percentage: latestRecords.length > 0 ? (count / latestRecords.length) * 100 : 0,
    }
  })

  return {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'active').length,
    totalCompanies: companies.length,
    averageProfit: avgProfit,
    averageMargin: avgMargin,
    totalMonthlyRevenue: totalRevenue,
    totalMonthlyCost: totalCost,
    totalMonthlyProfit: totalProfit,
    profitTrend,
    profitDistribution,
    topCompanies,
    recentPayrolls: latestRecords.slice(0, 10),
  }
}

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
      useBackend: true,

      // Actions
      loadSampleData: async () => {
        // Load from backend only - no sample data fallback
        try {
          await get().loadDataFromBackend()
        } catch (error) {
          console.error('Backend not available:', error)
          // Show empty state with error - NO sample data fallback
          set({
            employees: [],
            payrollRecords: [],
            availablePeriods: [],
            selectedPeriod: '',
            dashboardStats: {
              totalEmployees: 0,
              activeEmployees: 0,
              totalCompanies: 0,
              averageProfit: 0,
              averageMargin: 0,
              totalMonthlyRevenue: 0,
              totalMonthlyCost: 0,
              totalMonthlyProfit: 0,
              profitTrend: [],
              profitDistribution: [],
              topCompanies: [],
              recentPayrolls: [],
            },
            useBackend: false,
          })
        }
      },

      loadDataFromBackend: async () => {
        set({ isLoading: true })

        try {
          // Parallel fetch all data at once (4x faster than sequential)
          const [empResponse, payrollResponse, periodsResponse, statsResponse] = await Promise.all([
            employeeApi.getAll(),
            payrollApi.getAll(),
            payrollApi.getPeriods(),
            statisticsApi.getDashboard()
          ])

          // Check for errors
          if (empResponse.error) throw new Error(empResponse.error)
          if (payrollResponse.error) throw new Error(payrollResponse.error)
          if (periodsResponse.error) throw new Error(periodsResponse.error)
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
            employeeType: (emp.employee_type as 'haken' | 'ukeoi' | undefined) || 'haken',
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
            nightHours: rec.night_hours || 0,
            holidayHours: rec.holiday_hours || 0,
            overtimeOver60h: rec.overtime_over_60h || 0,
            paidLeaveHours: rec.paid_leave_hours,
            paidLeaveDays: rec.paid_leave_days,
            paidLeaveAmount: rec.paid_leave_amount || 0,
            baseSalary: rec.base_salary,
            overtimePay: rec.overtime_pay,
            nightPay: rec.night_pay || 0,
            holidayPay: rec.holiday_pay || 0,
            overtimeOver60hPay: rec.overtime_over_60h_pay || 0,
            transportAllowance: rec.transport_allowance,
            otherAllowances: rec.other_allowances,
            nonBillableAllowances: rec.non_billable_allowances || 0,  // 非請求手当
            grossSalary: rec.gross_salary,
            socialInsurance: rec.social_insurance,
            welfarePension: rec.welfare_pension || 0,  // 厚生年金
            employmentInsurance: rec.employment_insurance,
            incomeTax: rec.income_tax,
            residentTax: rec.resident_tax,
            rentDeduction: rec.rent_deduction || 0,
            utilitiesDeduction: rec.utilities_deduction || 0,
            mealDeduction: rec.meal_deduction || 0,
            advancePayment: rec.advance_payment || 0,
            yearEndAdjustment: rec.year_end_adjustment || 0,
            otherDeductions: rec.other_deductions,
            netSalary: rec.net_salary,
            billingAmount: rec.billing_amount,
            companySocialInsurance: rec.company_social_insurance,
            companyEmploymentInsurance: rec.company_employment_insurance,
            companyWorkersComp: rec.company_workers_comp || 0,
            totalCompanyCost: rec.total_company_cost,
            grossProfit: rec.gross_profit,
            profitMargin: rec.profit_margin,
          }))

          const periods = sortPeriodsAscending(periodsResponse.data || [])
          const selectedPeriod = periods[periods.length - 1] || '2025年1月' // Default to latest

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
        const periods = sortPeriodsAscending(Array.from(new Set(newRecords.map(r => r.period))))

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
          totalWorkersComp: periodRecords.reduce((sum, r) => sum + (r.companyWorkersComp || 0), 0),
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
      version: 5,
      partialize: (state) => ({
        theme: state.theme,
        useBackend: state.useBackend,
      }),
      migrate: (persistedState: any, version: number) => {
        // Always force reload of employees/payroll on version mismatch
        // This clears cached data that may be stale or corrupted
        if (version !== 5) {
          return {
            ...persistedState,
            employees: [],
            payrollRecords: [],
            availablePeriods: [],
            selectedPeriod: '',
            useBackend: true,
          }
        }
        return persistedState
      },
    }
  )
)
