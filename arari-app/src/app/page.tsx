'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Percent,
  Wallet,
  Receipt,
  BadgeJapaneseYen,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Target,
  X,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { ProfitTrendChart } from '@/components/charts/ProfitTrendChart'
import { ProfitDistributionChart } from '@/components/charts/ProfitDistributionChart'
import { CompanyProfitChart } from '@/components/charts/CompanyProfitChart'
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart'
import { EmployeeRankingChart } from '@/components/charts/EmployeeRankingChart'
import { FactoryComparisonChart } from '@/components/charts/FactoryComparisonChart'
import { MarginGaugeChart } from '@/components/charts/MarginGaugeChart'
import { HoursBreakdownChart } from '@/components/charts/HoursBreakdownChart'
import { OvertimeByFactoryChart } from '@/components/charts/OvertimeByFactoryChart'
import { PaidLeaveChart } from '@/components/charts/PaidLeaveChart'
import { RecentPayrolls } from '@/components/dashboard/RecentPayrolls'
import { PeriodSelector } from '@/components/dashboard/PeriodSelector'
import { PayrollSlipModal } from '@/components/payroll/PayrollSlipModal'
import { useAppStore } from '@/store/appStore'
import { useDashboardStats, useEmployees, usePayrollRecords, usePayrollPeriods } from '@/hooks'
import { useQuery } from '@tanstack/react-query'
import { formatYen, formatPercent, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/lib/api'
import { NeonButton } from '@/components/ui/NeonButton'
import { DashboardStatsSkeleton, DashboardChartsSkeleton } from '@/components/ui/skeleton'

type AlertType = 'negative' | 'critical' | 'underTarget' | 'lowRate' | null

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertModal, setAlertModal] = useState<AlertType>(null)
  const [factoryChartPeriod, setFactoryChartPeriod] = useState<string | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const selectedPeriod = useAppStore(state => state.selectedPeriod)
  const setSelectedPeriod = useAppStore(state => state.setSelectedPeriod)

  // Fetch data using TanStack Query hooks
  const { data: rawEmployees = [] } = useEmployees()
  const { data: rawPayrollRecords = [] } = usePayrollRecords()
  const { data: availablePeriods = [] } = usePayrollPeriods()

  // Auto-select latest period when periods are loaded
  useEffect(() => {
    if (availablePeriods.length > 0 && !selectedPeriod) {
      // Sort periods chronologically and select the latest
      const sortedPeriods = [...availablePeriods].sort((a, b) => {
        const parseDate = (p: string) => {
          const match = p.match(/(\d+)年(\d+)月/)
          if (match) return parseInt(match[1]) * 100 + parseInt(match[2])
          return 0
        }
        return parseDate(b) - parseDate(a)
      })
      setSelectedPeriod(sortedPeriods[0])
    }
  }, [availablePeriods, selectedPeriod, setSelectedPeriod])

  // Sync factoryChartPeriod with selectedPeriod when it changes
  useEffect(() => {
    if (selectedPeriod && !factoryChartPeriod) {
      setFactoryChartPeriod(selectedPeriod)
    }
  }, [selectedPeriod, factoryChartPeriod])

  // Map to internal types (snake_case -> camelCase)
  const employees = useMemo(() => {
    if (!rawEmployees) return []
    return rawEmployees.map(e => ({
      id: e.id?.toString() || '',
      employeeId: e.employee_id,
      name: e.name,
      nameKana: e.name_kana || '',
      dispatchCompany: e.dispatch_company,
      department: e.department || '',
      hourlyRate: e.hourly_rate,
      billingRate: e.billing_rate,
      status: (e.status as any) || 'active',
      hireDate: e.hire_date || '',
      createdAt: e.created_at || '',
      updatedAt: e.updated_at || '',
    }))
  }, [rawEmployees])

  const payrollRecords = useMemo(() => {
    if (!rawPayrollRecords) return []
    return rawPayrollRecords.map(r => ({
      id: r.id?.toString() || '',
      employeeId: r.employee_id,
      period: r.period,
      workDays: r.work_days,
      workHours: r.work_hours,
      overtimeHours: r.overtime_hours,
      nightHours: r.night_hours || 0,
      holidayHours: r.holiday_hours || 0,
      overtimeOver60h: r.overtime_over_60h || 0,
      paidLeaveHours: r.paid_leave_hours,
      paidLeaveDays: r.paid_leave_days,
      paidLeaveAmount: r.paid_leave_amount || 0,
      baseSalary: r.base_salary,
      overtimePay: r.overtime_pay,
      nightPay: r.night_pay || 0,
      holidayPay: r.holiday_pay || 0,
      overtimeOver60hPay: r.overtime_over_60h_pay || 0,
      transportAllowance: r.transport_allowance,
      otherAllowances: r.other_allowances,
      nonBillableAllowances: r.non_billable_allowances || 0,
      grossSalary: r.gross_salary,
      socialInsurance: r.social_insurance,
      welfarePension: r.welfare_pension || 0,
      employmentInsurance: r.employment_insurance,
      incomeTax: r.income_tax,
      residentTax: r.resident_tax,
      rentDeduction: r.rent_deduction || 0,
      utilitiesDeduction: r.utilities_deduction || 0,
      mealDeduction: r.meal_deduction || 0,
      advancePayment: r.advance_payment || 0,
      yearEndAdjustment: r.year_end_adjustment || 0,
      otherDeductions: r.other_deductions,
      netSalary: r.net_salary,
      billingAmount: r.billing_amount,
      companySocialInsurance: r.company_social_insurance,
      companyEmploymentInsurance: r.company_employment_insurance,
      companyWorkersComp: r.company_workers_comp || 0,
      totalCompanyCost: r.total_company_cost,
      grossProfit: r.gross_profit,
      profitMargin: r.profit_margin,
    }))
  }, [rawPayrollRecords])

  // Fetch dashboard stats using TanStack Query
  const { data: dashboardStats, isLoading, error, refetch, dataUpdatedAt } = useDashboardStats(selectedPeriod)

  // Fetch target margin setting using TanStack Query
  const { data: targetMarginData } = useQuery({
    queryKey: ['settings', 'target_margin'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/settings/target_margin`)
      if (!response.ok) throw new Error('Failed to fetch target margin')
      const data = await response.json()
      return data.value ? Number(data.value) : 12
    },
    initialData: 12,
  })

  const targetMargin = targetMarginData || 12

  const handleRefresh = async () => {
    await refetch()
  }

  // Transform API data (snake_case) to component data (camelCase)
  const companySummaries = useMemo(() => {
    if (!dashboardStats?.top_companies) return []
    return dashboardStats.top_companies.map(company => ({
      companyName: company.company_name,
      employeeCount: company.employee_count,
      averageHourlyRate: company.average_hourly_rate,
      averageBillingRate: company.average_billing_rate,
      averageProfit: company.average_profit,
      averageMargin: company.average_margin,
      totalMonthlyProfit: company.total_monthly_profit,
      employees: [],
    }))
  }, [dashboardStats])

  // Calculate derived data for new charts
  const chartData = useMemo(() => {
    if (!dashboardStats || payrollRecords.length === 0) return null

    // Get current period records
    const currentPeriodRecords = payrollRecords.filter(r => r.period === selectedPeriod)

    // Top and bottom performers
    const recordsWithNames = currentPeriodRecords.map(r => {
      const employee = employees.find(e => e.employeeId === r.employeeId)
      return {
        employeeId: r.employeeId,
        name: employee?.nameKana || employee?.name || r.employeeId,  // Prefer katakana
        company: employee?.dispatchCompany || '',
        profit: r.grossProfit,
        margin: r.profitMargin,
        revenue: r.billingAmount,
        cost: r.totalCompanyCost,
        status: employee?.status,
        hourlyRate: employee?.hourlyRate || 0,
        billingRate: employee?.billingRate || 0,
      }
    }).filter(r => {
      // Filter out:
      // 1. Non-active employees (resigned, etc.)
      if (r.status !== 'active') return false
      // 2. Invalid hourly rate (0)
      if (r.hourlyRate <= 0) return false
      // 3. Invalid billing rate (0)
      if (r.billingRate <= 0) return false

      return true
    })

    const sortedByProfit = [...recordsWithNames].sort((a, b) => b.profit - a.profit)
    const topPerformers = sortedByProfit.slice(0, 5)
    const bottomPerformers = sortedByProfit.slice(-5).reverse()

    // Factory comparison data
    const companyMap = new Map<string, {
      revenue: number
      cost: number
      profit: number
      margin: number
      count: number
      overtimeHours: number
      overtimeOver60h: number
      nightHours: number
      holidayHours: number
    }>()

    currentPeriodRecords.forEach(r => {
      const employee = employees.find(e => e.employeeId === r.employeeId)
      const company = employee?.dispatchCompany || 'Unknown'

      if (!companyMap.has(company)) {
        companyMap.set(company, {
          revenue: 0, cost: 0, profit: 0, margin: 0, count: 0,
          overtimeHours: 0, overtimeOver60h: 0, nightHours: 0, holidayHours: 0
        })
      }

      const data = companyMap.get(company)!
      data.revenue += r.billingAmount
      data.cost += r.totalCompanyCost
      data.profit += r.grossProfit
      data.margin += r.profitMargin
      data.count += 1
      data.overtimeHours += r.overtimeHours || 0
      data.overtimeOver60h += r.overtimeOver60h || 0
      data.nightHours += r.nightHours || 0
      data.holidayHours += r.holidayHours || 0
    })

    const factoryData = Array.from(companyMap.entries()).map(([name, data]) => ({
      companyName: name,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.profit,
      margin: data.count > 0 ? data.margin / data.count : 0,
      employeeCount: data.count,
    })).sort((a, b) => b.profit - a.profit)

    // Overtime by factory data
    const overtimeByFactoryData = Array.from(companyMap.entries()).map(([name, data]) => ({
      companyName: name,
      overtimeHours: data.overtimeHours,
      overtimeOver60h: data.overtimeOver60h,
      nightHours: data.nightHours,
      holidayHours: data.holidayHours,
      totalOvertime: data.overtimeHours + data.overtimeOver60h + data.nightHours + data.holidayHours,
      employeeCount: data.count,
    })).sort((a, b) => b.totalOvertime - a.totalOvertime)

    // Hours breakdown
    const totalWorkHours = currentPeriodRecords.reduce((sum, r) => sum + r.workHours, 0)
    const totalOvertimeHours = currentPeriodRecords.reduce((sum, r) => sum + r.overtimeHours, 0)
    const totalOvertimeOver60h = currentPeriodRecords.reduce((sum, r) => sum + (r.overtimeOver60h || 0), 0)
    const totalNightHours = currentPeriodRecords.reduce((sum, r) => sum + (r.nightHours || 0), 0)
    const totalHolidayHours = currentPeriodRecords.reduce((sum, r) => sum + (r.holidayHours || 0), 0)

    // Previous period margin for gauge
    const periods = [...availablePeriods].sort().reverse()
    const currentIndex = periods.indexOf(selectedPeriod)
    let previousMargin: number | undefined

    // Fix: Changed from currentIndex > 0 to currentIndex >= 0
    // When currentIndex = 0 (newest month), we need to look at index 1 (previous month)
    if (currentIndex >= 0 && currentIndex < periods.length - 1) {
      const prevPeriod = periods[currentIndex + 1]
      const prevRecords = payrollRecords.filter(r => r.period === prevPeriod)
      if (prevRecords.length > 0) {
        previousMargin = prevRecords.reduce((sum, r) => sum + r.profitMargin, 0) / prevRecords.length
      }
    }

    // Paid leave data by period (all periods)
    const paidLeaveByPeriod = new Map<string, {
      totalDays: number
      totalHours: number
      totalAmount: number
      employeeCount: number
    }>()

    payrollRecords.forEach(r => {
      if (!paidLeaveByPeriod.has(r.period)) {
        paidLeaveByPeriod.set(r.period, {
          totalDays: 0,
          totalHours: 0,
          totalAmount: 0,
          employeeCount: 0,
        })
      }
      const data = paidLeaveByPeriod.get(r.period)!

      // Calculate paid leave days effectively
      let days = r.paidLeaveDays || 0

      // Only calculate if days is missing but amount exists (fallback)
      if (days === 0 && (r.paidLeaveAmount || 0) > 0) {
        const employee = employees.find(e => e.employeeId === r.employeeId)
        if (employee && employee.hourlyRate > 0) {
          const dailyHrs = (r.workDays && r.workHours) ? r.workHours / r.workDays : 8
          const leaveHrs = r.paidLeaveAmount / employee.hourlyRate
          const rawDays = dailyHrs > 0 ? leaveHrs / dailyHrs : 0
          days = Math.round(rawDays * 2) / 2
        }
      }

      data.totalDays += days
      data.totalHours += r.paidLeaveHours || 0
      data.totalAmount += r.paidLeaveAmount || 0
      if (days > 0 || (r.paidLeaveAmount || 0) > 0) {
        data.employeeCount += 1
      }
    })

    const paidLeaveData = Array.from(paidLeaveByPeriod.entries()).map(([period, data]) => ({
      period,
      ...data,
    }))

    // Cost breakdown data by company
    const costBreakdownData = Array.from(companyMap.entries()).slice(0, 8).map(([name, data]) => {
      // Calculate cost breakdown from current period records for this company
      const companyRecords = currentPeriodRecords.filter(r => {
        const employee = employees.find(e => e.employeeId === r.employeeId)
        return employee?.dispatchCompany === name
      })

      const totalSalary = companyRecords.reduce((sum, r) => sum + r.grossSalary, 0)
      const totalSocialIns = companyRecords.reduce((sum, r) => sum + (r.socialInsurance || 0) + (r.welfarePension || 0), 0)
      const totalEmploymentIns = companyRecords.reduce((sum, r) => sum + (r.employmentInsurance || 0), 0)
      const totalPaidLeave = companyRecords.reduce((sum, r) => sum + (r.paidLeaveAmount || 0), 0)
      const totalTransport = companyRecords.reduce((sum, r) => sum + (r.transportAllowance || 0), 0)

      return {
        category: name.length > 8 ? name.substring(0, 8) + '...' : name,
        salary: totalSalary,
        socialInsurance: totalSocialIns,
        employmentInsurance: totalEmploymentIns,
        paidLeave: totalPaidLeave,
        transport: totalTransport,
      }
    })

    // Full employee ranking with rate analysis
    // 4-tier system: <7% (critical), 7-10% (warning), 10-12% (close), ≥12% (target)
    const allEmployeesRanking = recordsWithNames.map(r => ({
      ...r,
      rateGap: r.billingRate - r.hourlyRate,
      rateRatio: r.hourlyRate > 0 ? ((r.billingRate / r.hourlyRate) - 1) * 100 : 0,
      isUnderTarget: r.margin < 12,  // Below 12% target
      isCritical: r.margin < 7,      // Critical: below 7%
    })).sort((a, b) => b.profit - a.profit)

    // Alerts summary
    const alertsSummary = {
      criticalCount: allEmployeesRanking.filter(e => e.isCritical).length,
      underTargetCount: allEmployeesRanking.filter(e => e.isUnderTarget && !e.isCritical).length,
      negativeProfit: allEmployeesRanking.filter(e => e.profit < 0).length,
      lowRateRatio: allEmployeesRanking.filter(e => e.rateRatio < 20).length,
    }

    return {
      topPerformers,
      bottomPerformers,
      factoryData,
      overtimeByFactoryData,
      hoursData: {
        workHours: totalWorkHours,
        overtimeHours: totalOvertimeHours,
        overtimeOver60h: totalOvertimeOver60h,
        nightHours: totalNightHours,
        holidayHours: totalHolidayHours,
      },
      previousMargin,
      paidLeaveData,
      costBreakdownData,
      allEmployeesRanking,
      alertsSummary,
    }
  }, [dashboardStats, payrollRecords, employees, selectedPeriod, availablePeriods])

  // Calculate factory data for the selected factory chart period
  const factoryChartData = useMemo(() => {
    const periodToUse = factoryChartPeriod || selectedPeriod
    if (!periodToUse || payrollRecords.length === 0) return []

    const periodRecords = payrollRecords.filter(r => r.period === periodToUse)

    const companyMap = new Map<string, {
      revenue: number
      cost: number
      profit: number
      margin: number
      count: number
    }>()

    periodRecords.forEach(r => {
      const employee = employees.find(e => e.employeeId === r.employeeId)
      const company = employee?.dispatchCompany || 'Unknown'

      if (!companyMap.has(company)) {
        companyMap.set(company, { revenue: 0, cost: 0, profit: 0, margin: 0, count: 0 })
      }

      const data = companyMap.get(company)!
      data.revenue += r.billingAmount
      data.cost += r.totalCompanyCost
      data.profit += r.grossProfit
      data.margin += r.profitMargin
      data.count += 1
    })

    return Array.from(companyMap.entries()).map(([name, data]) => ({
      companyName: name,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.profit,
      margin: data.count > 0 ? data.margin / data.count : 0,
      employeeCount: data.count,
    })).sort((a, b) => b.profit - a.profit)
  }, [factoryChartPeriod, selectedPeriod, payrollRecords, employees])

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        {/* Ambient Background Glows */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px]" />
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]" />
        </div>
        <Header onMenuClick={() => {}} />
        <Sidebar isOpen={false} onClose={() => {}} />
        <main className="md:pl-[280px] pt-16 transition-all duration-300 relative z-10">
          <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                粗利ダッシュボード
              </h1>
              <p className="text-slate-400 mt-1">データを読み込み中...</p>
            </div>
            <div className="space-y-6">
              <DashboardStatsSkeleton />
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass-card p-6 rounded-xl animate-pulse">
                    <div className="h-4 w-20 bg-muted/50 rounded mb-2" />
                    <div className="h-8 w-16 bg-muted/50 rounded" />
                  </div>
                ))}
              </div>
              <DashboardChartsSkeleton />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">接続エラー</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {error.message || 'サーバーに接続できませんでした。'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              サーバーが起動中の可能性があります。数秒後に再試行してください。
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            再接続
          </button>
        </div>
      </div>
    )
  }

  if (!dashboardStats) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">ダッシュボードデータがありません</p>
        </div>
      </div>
    )
  }

  // Check if we have real data
  const hasData = payrollRecords.length > 0

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Ambient Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main id="main-content" className="md:pl-[280px] pt-16 transition-all duration-300 relative z-10">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 space-y-4"
          >
            {/* Header Row */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                  粗利ダッシュボード
                </h1>
                <p className="text-slate-400 mt-1 text-sm">
                  リアルタイムで収益性を分析
                </p>
              </div>
              <div className="flex items-center gap-4">
                {dataUpdatedAt > 0 && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    最終更新: {new Date(dataUpdatedAt).toLocaleString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
                <NeonButton
                  onClick={handleRefresh}
                  disabled={isLoading}
                  glowColor="blue"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} aria-hidden="true" />
                  データ更新
                </NeonButton>
              </div>
            </div>

            {/* Period Selector Row */}
            <div className="flex items-center gap-4 flex-wrap">
              <PeriodSelector
                periods={availablePeriods}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                showNavigation={true}
              />
              {hasData && selectedPeriod && (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                  📊 {payrollRecords.filter(r => r.period === selectedPeriod).length}件のデータ
                </span>
              )}
            </div>
          </motion.div>

          {!hasData ? (
            // Empty state when no data
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Receipt className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">データがありません</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                給与明細Excelファイルをアップロードすると、
                自動で粗利計算・分析結果が表示されます。
              </p>
              <a
                href="/upload"
                aria-label="給与明細ファイルをアップロード"
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                ファイルをアップロード
              </a>
            </motion.div>
          ) : (
            <>
              {/* Main Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <StatsCard
                  title="月間粗利"
                  value={formatYen(dashboardStats.total_monthly_profit)}
                  icon={TrendingUp}
                  trend={{
                    value: chartData?.previousMargin
                      ? dashboardStats.average_margin - chartData.previousMargin
                      : 0,
                    label: '前月比'
                  }}
                  variant="gradient"
                  delay={0}
                />
                <StatsCard
                  title="月間売上"
                  value={formatYen(dashboardStats.total_monthly_revenue)}
                  icon={DollarSign}
                  subtitle={`${payrollRecords.filter(r => r.period === selectedPeriod).length}名分`}
                  variant="success"
                  delay={1}
                />
                <StatsCard
                  title="平均マージン率"
                  value={formatPercent(dashboardStats.average_margin)}
                  icon={Percent}
                  subtitle={dashboardStats.average_margin >= targetMargin ? '目標達成' : `目標: ${targetMargin}%`}
                  variant={dashboardStats.average_margin >= targetMargin ? 'success' : 'warning'}
                  delay={2}
                />
                <StatsCard
                  title="会社負担コスト"
                  value={formatYen(dashboardStats.total_monthly_cost)}
                  icon={Wallet}
                  subtitle="社保・雇用保険・労災含む"
                  variant="default"
                  delay={3}
                />
              </div>

              {/* Secondary Stats */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-8">
                <StatsCard
                  title="在職中"
                  value={`${employees.filter(e => e.status === 'active').length}名`}
                  icon={Users}
                  delay={4}
                />
                <StatsCard
                  title="派遣先企業数"
                  value={`${dashboardStats.total_companies}社`}
                  icon={Building2}
                  delay={5}
                />
                <StatsCard
                  title="平均粗利/人"
                  value={formatYen(dashboardStats.average_profit)}
                  icon={BadgeJapaneseYen}
                  delay={6}
                />
                <StatsCard
                  title="処理済明細"
                  value={`${payrollRecords.length}件`}
                  icon={Receipt}
                  delay={7}
                />
              </div>

              {/* Alerts Panel */}
              {chartData && chartData.alertsSummary && (
                (chartData.alertsSummary.criticalCount > 0 ||
                 chartData.alertsSummary.negativeProfit > 0 ||
                 chartData.alertsSummary.underTargetCount > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-slate-800/30 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500/80" aria-hidden="true" />
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">アラート通知</span>
                      <span className="text-xs text-muted-foreground">（クリックで詳細表示）</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      {chartData.alertsSummary.negativeProfit > 0 && (
                        <button
                          onClick={() => setAlertModal('negative')}
                          className="flex items-center gap-2 text-sm hover:bg-red-500/20 p-2 rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                          <span className="text-red-600 dark:text-red-400">赤字: {chartData.alertsSummary.negativeProfit}名</span>
                        </button>
                      )}
                      {chartData.alertsSummary.criticalCount > 0 && (
                        <button
                          onClick={() => setAlertModal('critical')}
                          className="flex items-center gap-2 text-sm hover:bg-orange-500/20 p-2 rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-500" />
                          <span className="text-orange-600 dark:text-orange-400">マージン&lt;7%: {chartData.alertsSummary.criticalCount}名</span>
                        </button>
                      )}
                      {chartData.alertsSummary.underTargetCount > 0 && (
                        <button
                          onClick={() => setAlertModal('underTarget')}
                          className="flex items-center gap-2 text-sm hover:bg-amber-500/20 p-2 rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <Target className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                          <span className="text-amber-600 dark:text-amber-400">目標未達(7-12%): {chartData.alertsSummary.underTargetCount}名</span>
                        </button>
                      )}
                      {chartData.alertsSummary.lowRateRatio > 0 && (
                        <button
                          onClick={() => setAlertModal('lowRate')}
                          className="flex items-center gap-2 text-sm hover:bg-orange-500/20 p-2 rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
                          <span className="text-orange-600 dark:text-orange-400">単価率&lt;20%: {chartData.alertsSummary.lowRateRatio}名</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              )}

              {/* Alert Detail Modal */}
              <AnimatePresence>
                {alertModal && chartData && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setAlertModal(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="w-full max-w-4xl max-h-[80vh] bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                          {alertModal === 'negative' && (
                            <>
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              赤字従業員一覧
                            </>
                          )}
                          {alertModal === 'critical' && (
                            <>
                              <TrendingDown className="h-5 w-5 text-orange-500" />
                              マージン7%未満の従業員
                            </>
                          )}
                          {alertModal === 'underTarget' && (
                            <>
                              <Target className="h-5 w-5 text-amber-500" />
                              目標未達（7-12%）の従業員
                            </>
                          )}
                          {alertModal === 'lowRate' && (
                            <>
                              <AlertTriangle className="h-5 w-5 text-orange-500" />
                              単価率20%未満の従業員
                            </>
                          )}
                        </h3>
                        <button
                          onClick={() => setAlertModal(null)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <X className="h-5 w-5 text-slate-400" />
                        </button>
                      </div>
                      <div className="overflow-auto max-h-[60vh]">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-800">
                            <tr className="border-b border-white/10">
                              <th className="text-left p-2 sm:p-3 text-muted-foreground">#</th>
                              <th className="text-left p-2 sm:p-3 text-muted-foreground">氏名</th>
                              <th className="text-left p-2 sm:p-3 text-muted-foreground">派遣先</th>
                              <th className="text-right p-2 sm:p-3 text-muted-foreground">時給</th>
                              <th className="text-right p-2 sm:p-3 text-muted-foreground">単価</th>
                              <th className="text-right p-2 sm:p-3 text-muted-foreground">単価率</th>
                              <th className="text-right p-2 sm:p-3 text-muted-foreground">粗利</th>
                              <th className="text-right p-2 sm:p-3 text-muted-foreground">マージン</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chartData.allEmployeesRanking
                              .filter(emp => {
                                if (alertModal === 'negative') return emp.profit < 0
                                if (alertModal === 'critical') return emp.margin < 7  // <7% is critical
                                if (alertModal === 'underTarget') return emp.margin >= 7 && emp.margin < 12  // 7-12% under target
                                if (alertModal === 'lowRate') return emp.rateRatio < 20
                                return false
                              })
                              .sort((a, b) => {
                                if (alertModal === 'negative') return a.profit - b.profit
                                if (alertModal === 'critical') return a.margin - b.margin
                                if (alertModal === 'underTarget') return a.margin - b.margin
                                if (alertModal === 'lowRate') return a.rateRatio - b.rateRatio
                                return 0
                              })
                              .map((emp, idx) => (
                                <tr
                                  key={emp.employeeId}
                                  className="border-b border-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                                  onClick={() => {
                                    setSelectedEmployeeId(emp.employeeId)
                                    setAlertModal(null)
                                  }}
                                >
                                  <td className="p-2 sm:p-3 text-muted-foreground">{idx + 1}</td>
                                  <td className="p-2 sm:p-3 font-medium text-slate-200">{emp.name}</td>
                                  <td className="p-2 sm:p-3 text-muted-foreground">{emp.company}</td>
                                  <td className="p-2 sm:p-3 text-right font-mono">¥{emp.hourlyRate.toLocaleString()}</td>
                                  <td className="p-2 sm:p-3 text-right font-mono">¥{emp.billingRate.toLocaleString()}</td>
                                  <td className={cn(
                                    "p-2 sm:p-3 text-right font-mono",
                                    emp.rateRatio >= 30 ? "text-amber-400" :
                                    emp.rateRatio >= 20 ? "text-green-400" : "text-red-400"
                                  )}>
                                    {emp.rateRatio.toFixed(1)}%
                                  </td>
                                  <td className={cn(
                                    "p-2 sm:p-3 text-right font-mono font-semibold",
                                    emp.profit >= 0 ? "text-emerald-400" : "text-red-400"
                                  )}>
                                    {formatYen(emp.profit)}
                                  </td>
                                  <td className={cn(
                                    "p-2 sm:p-3 text-right font-mono",
                                    emp.margin >= 12 ? "text-emerald-400" :
                                    emp.margin >= 10 ? "text-green-400" :
                                    emp.margin >= 7 ? "text-orange-400" : "text-red-400"
                                  )}>
                                    {emp.margin.toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Margin Gauge + Hours Breakdown Row */}
              <div className="grid gap-6 lg:grid-cols-3 mb-6">
                <MarginGaugeChart
                  currentMargin={dashboardStats.average_margin}
                  targetMargin={targetMargin}
                  previousMargin={chartData?.previousMargin}
                />
                {chartData && (
                  <HoursBreakdownChart data={chartData.hoursData} />
                )}
                <ProfitDistributionChart data={dashboardStats.profit_distribution} />
              </div>

              {/* Employee Ranking - Full Width */}
              {chartData && (
                <div className="mb-6">
                  <EmployeeRankingChart
                    topPerformers={chartData.topPerformers}
                    bottomPerformers={chartData.bottomPerformers}
                    averageProfit={dashboardStats.average_profit}
                  />
                </div>
              )}

              {/* Factory Comparison - Full Width */}
              {factoryChartData.length > 0 && (
                <div className="mb-6">
                  <FactoryComparisonChart
                    data={factoryChartData}
                    availablePeriods={availablePeriods}
                    selectedPeriod={factoryChartPeriod || selectedPeriod}
                    onPeriodChange={setFactoryChartPeriod}
                  />
                </div>
              )}

              {/* Overtime by Factory - Full Width */}
              {chartData && chartData.overtimeByFactoryData.length > 0 && (
                <div className="mb-6">
                  <OvertimeByFactoryChart data={chartData.overtimeByFactoryData} />
                </div>
              )}

              {/* Paid Leave Chart - Full Width */}
              {chartData && chartData.paidLeaveData.length > 0 && (
                <div className="mb-6">
                  <PaidLeaveChart data={chartData.paidLeaveData} />
                </div>
              )}

              {/* Cost Breakdown Chart */}
              {chartData && chartData.costBreakdownData.length > 0 && (
                <div className="mb-6">
                  <CostBreakdownChart data={chartData.costBreakdownData} />
                </div>
              )}

              {/* Profit Trend + Company Profit */}
              <div className="grid gap-6 lg:grid-cols-2 mb-6">
                <ProfitTrendChart data={dashboardStats.profit_trend} />
                <CompanyProfitChart data={companySummaries} />
              </div>

              {/* Full Employee Ranking with Rate Analysis */}
              {chartData && chartData.allEmployeesRanking.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-sm overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        従業員別収益分析（全{chartData.allEmployeesRanking.length}名）
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        単価率 = (請求単価 - 時給) / 時給 × 100 | 目標マージン: {targetMargin}%
                      </p>
                    </div>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900/95 backdrop-blur-sm">
                          <tr className="border-b border-slate-200 dark:border-white/10">
                            <th className="text-left p-2 sm:p-3 text-muted-foreground font-medium">#</th>
                            <th className="text-left p-2 sm:p-3 text-muted-foreground font-medium">氏名</th>
                            <th className="text-left p-2 sm:p-3 text-muted-foreground font-medium">派遣先</th>
                            <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">時給</th>
                            <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">単価</th>
                            <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">単価率</th>
                            <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">粗利</th>
                            <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">マージン</th>
                            <th className="text-center p-2 sm:p-3 text-muted-foreground font-medium">状態</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.allEmployeesRanking.map((emp, idx) => (
                            <tr
                              key={emp.employeeId}
                              className={cn(
                                "border-b border-white/5 hover:bg-white/5 transition-colors",
                                emp.profit < 0 && "bg-red-500/10",
                                emp.isCritical && emp.profit >= 0 && "bg-orange-500/5"
                              )}
                            >
                              <td className="p-2 sm:p-3 text-muted-foreground">{idx + 1}</td>
                              <td className="p-2 sm:p-3 font-medium text-slate-200">{emp.name}</td>
                              <td className="p-2 sm:p-3 text-muted-foreground">{emp.company}</td>
                              <td className="p-2 sm:p-3 text-right font-mono">¥{emp.hourlyRate.toLocaleString()}</td>
                              <td className="p-2 sm:p-3 text-right font-mono">¥{emp.billingRate.toLocaleString()}</td>
                              <td className={cn(
                                "p-2 sm:p-3 text-right font-mono",
                                emp.rateRatio >= 30 ? "text-amber-400" :
                                emp.rateRatio >= 20 ? "text-green-400" :
                                emp.rateRatio >= 10 ? "text-blue-400" : "text-red-400"
                              )}>
                                {emp.rateRatio.toFixed(1)}%
                              </td>
                              <td className={cn(
                                "p-2 sm:p-3 text-right font-mono font-semibold",
                                emp.profit >= 0 ? "text-emerald-400" : "text-red-400"
                              )}>
                                {formatYen(emp.profit)}
                              </td>
                              <td className={cn(
                                "p-2 sm:p-3 text-right font-mono",
                                emp.margin >= 12 ? "text-emerald-400" :
                                emp.margin >= 10 ? "text-green-400" :
                                emp.margin >= 7 ? "text-orange-400" : "text-red-400"
                              )}>
                                {emp.margin.toFixed(1)}%
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                {emp.profit < 0 ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">赤字</span>
                                ) : emp.isCritical ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">要注意</span>
                                ) : emp.isUnderTarget ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">目標近い</span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">目標達成</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Recent Payrolls */}
              <RecentPayrolls
                payrolls={dashboardStats.recent_payrolls}
                employees={employees}
              />
            </>
          )}
        </div>
      </main>

      {/* Payroll Slip Modal */}
      {selectedEmployeeId && (() => {
        const record = payrollRecords.find(
          r => r.employeeId === selectedEmployeeId && r.period === selectedPeriod
        )
        const employee = employees.find(e => e.employeeId === selectedEmployeeId)

        if (!record || !employee) return null

        return (
          <PayrollSlipModal
            isOpen={!!selectedEmployeeId}
            onClose={() => setSelectedEmployeeId(null)}
            record={record}
            employee={employee}
          />
        )
      })()}
    </div>
  )
}
