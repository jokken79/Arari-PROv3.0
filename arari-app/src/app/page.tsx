'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
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
  Calendar,
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
import { useAppStore } from '@/store/appStore'
import { formatYen, formatPercent, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const {
    dashboardStats,
    employees,
    payrollRecords,
    selectedPeriod,
    availablePeriods,
    loadSampleData,
    refreshFromBackend
  } = useAppStore()

  const [targetMargin, setTargetMargin] = useState(15)

  useEffect(() => {
    if (employees.length === 0) {
      loadSampleData()
    }
  }, [employees.length, loadSampleData])

  // Fetch target margin setting
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/settings/target_margin')
        if (response.ok) {
          const data = await response.json()
          if (data.value) {
            setTargetMargin(Number(data.value))
          }
        }
      } catch (error) {
        console.error('Error fetching target margin:', error)
      }
    }
    fetchSettings()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshFromBackend()
    } finally {
      setIsRefreshing(false)
    }
  }

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
        name: employee?.name || r.employeeId,
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

    if (currentIndex > 0 && currentIndex < periods.length) {
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
    }
  }, [dashboardStats, payrollRecords, employees, selectedPeriod, availablePeriods])

  if (!dashboardStats) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">データを読み込み中...</p>
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

      <main className="md:pl-[280px] pt-16 transition-all duration-300 relative z-10">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                粗利ダッシュボード
              </h1>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {selectedPeriod || '期間を選択してください'}
                {hasData && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                    リアルデータ
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]",
                isRefreshing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              データ更新
            </button>
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
                  value={formatYen(dashboardStats.totalMonthlyProfit)}
                  icon={TrendingUp}
                  trend={{
                    value: chartData?.previousMargin
                      ? dashboardStats.averageMargin - chartData.previousMargin
                      : 0,
                    label: '前月比'
                  }}
                  variant="gradient"
                  delay={0}
                />
                <StatsCard
                  title="月間売上"
                  value={formatYen(dashboardStats.totalMonthlyRevenue)}
                  icon={DollarSign}
                  subtitle={`${payrollRecords.filter(r => r.period === selectedPeriod).length}名分`}
                  variant="success"
                  delay={1}
                />
                <StatsCard
                  title="平均マージン率"
                  value={formatPercent(dashboardStats.averageMargin)}
                  icon={Percent}
                  subtitle={dashboardStats.averageMargin >= targetMargin ? '目標達成' : `目標: ${targetMargin}%`}
                  variant={dashboardStats.averageMargin >= targetMargin ? 'success' : 'warning'}
                  delay={2}
                />
                <StatsCard
                  title="会社負担コスト"
                  value={formatYen(dashboardStats.totalMonthlyCost)}
                  icon={Wallet}
                  subtitle="社保・雇用保険・労災含む"
                  variant="default"
                  delay={3}
                />
              </div>

              {/* Secondary Stats */}
              <div className="grid gap-4 md:grid-cols-4 mb-8">
                <StatsCard
                  title="在職中"
                  value={`${employees.filter(e => e.status === 'active').length}名`}
                  icon={Users}
                  delay={4}
                />
                <StatsCard
                  title="派遣先企業数"
                  value={`${dashboardStats.totalCompanies}社`}
                  icon={Building2}
                  delay={5}
                />
                <StatsCard
                  title="平均粗利/人"
                  value={formatYen(dashboardStats.averageProfit)}
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

              {/* Margin Gauge + Hours Breakdown Row */}
              <div className="grid gap-6 lg:grid-cols-3 mb-6">
                <MarginGaugeChart
                  currentMargin={dashboardStats.averageMargin}
                  targetMargin={targetMargin}
                  previousMargin={chartData?.previousMargin}
                />
                {chartData && (
                  <HoursBreakdownChart data={chartData.hoursData} />
                )}
                <ProfitDistributionChart data={dashboardStats.profitDistribution} />
              </div>

              {/* Employee Ranking - Full Width */}
              {chartData && (
                <div className="mb-6">
                  <EmployeeRankingChart
                    topPerformers={chartData.topPerformers}
                    bottomPerformers={chartData.bottomPerformers}
                    averageProfit={dashboardStats.averageProfit}
                  />
                </div>
              )}

              {/* Factory Comparison - Full Width */}
              {chartData && chartData.factoryData.length > 0 && (
                <div className="mb-6">
                  <FactoryComparisonChart data={chartData.factoryData} />
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

              {/* Profit Trend + Company Profit */}
              <div className="grid gap-6 lg:grid-cols-2 mb-6">
                <ProfitTrendChart data={dashboardStats.profitTrend} />
                <CompanyProfitChart data={dashboardStats.topCompanies} />
              </div>

              {/* Recent Payrolls */}
              <RecentPayrolls
                payrolls={dashboardStats.recentPayrolls}
                employees={employees}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
