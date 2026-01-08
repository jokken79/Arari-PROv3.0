'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, TrendingUp, DollarSign, Wallet, Percent, RefreshCw } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MonthlyComparison } from '@/components/monthly/MonthlyComparison'
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart'
import { MonthlySummaryTable } from '@/components/charts/MonthlySummaryTable'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { useAppStore } from '@/store/appStore'
import { formatYen, formatPercent, cn } from '@/lib/utils'

export default function MonthlyPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const {
    employees,
    payrollRecords,
    availablePeriods,
    loadSampleData,
    refreshFromBackend
  } = useAppStore()

  useEffect(() => {
    if (employees.length === 0) {
      loadSampleData()
    }
  }, [employees.length, loadSampleData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshFromBackend()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Calculate monthly data for all periods
  const monthlyData = useMemo(() => {
    if (payrollRecords.length === 0 || availablePeriods.length === 0) return []

    return availablePeriods.map(period => {
      const records = payrollRecords.filter(r => r.period === period)

      const revenue = records.reduce((sum, r) => sum + r.billingAmount, 0)
      const cost = records.reduce((sum, r) => sum + r.totalCompanyCost, 0)
      const profit = records.reduce((sum, r) => sum + r.grossProfit, 0)
      const margin = records.length > 0
        ? records.reduce((sum, r) => sum + r.profitMargin, 0) / records.length
        : 0

      return {
        period,
        revenue,
        cost,
        profit,
        margin,
        employeeCount: records.length,
      }
    })
  }, [payrollRecords, availablePeriods])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (monthlyData.length === 0) {
      return {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        avgMargin: 0,
        bestMonth: null as string | null,
        worstMonth: null as string | null,
      }
    }

    const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0)
    const totalCost = monthlyData.reduce((sum, d) => sum + d.cost, 0)
    const totalProfit = monthlyData.reduce((sum, d) => sum + d.profit, 0)
    const avgMargin = monthlyData.reduce((sum, d) => sum + d.margin, 0) / monthlyData.length

    const sortedByProfit = [...monthlyData].sort((a, b) => b.profit - a.profit)
    const bestMonth = sortedByProfit[0]?.period || null
    const worstMonth = sortedByProfit[sortedByProfit.length - 1]?.period || null

    return { totalRevenue, totalCost, totalProfit, avgMargin, bestMonth, worstMonth }
  }, [monthlyData])

  const hasData = payrollRecords.length > 0

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main id="main-content" className="md:pl-[280px] pt-16 transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                月次分析
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {availablePeriods.length}ヶ月分のデータ
                {hasData && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                    リアルデータ
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="月次データを更新"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20",
                isRefreshing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} aria-hidden="true" />
              データ更新
            </button>
          </motion.div>

          {!hasData ? (
            // Empty state
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <CalendarDays className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">月次データがありません</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                給与明細Excelファイルをアップロードすると、
                月次の売上・コスト・粗利が表示されます。
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
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="累計売上"
                  value={formatYen(summaryStats.totalRevenue)}
                  icon={DollarSign}
                  subtitle={`${monthlyData.length}ヶ月合計`}
                  variant="success"
                  delay={0}
                />
                <StatsCard
                  title="累計コスト"
                  value={formatYen(summaryStats.totalCost)}
                  icon={Wallet}
                  subtitle="会社負担総額"
                  variant="warning"
                  delay={1}
                />
                <StatsCard
                  title="累計粗利"
                  value={formatYen(summaryStats.totalProfit)}
                  icon={TrendingUp}
                  subtitle={summaryStats.bestMonth ? `最高: ${summaryStats.bestMonth}` : undefined}
                  variant="gradient"
                  delay={2}
                />
                <StatsCard
                  title="平均マージン"
                  value={formatPercent(summaryStats.avgMargin)}
                  icon={Percent}
                  subtitle={summaryStats.avgMargin >= 12 ? '目標達成' : '目標: 12%'}
                  variant={summaryStats.avgMargin >= 12 ? 'success' : 'default'}
                  delay={3}
                />
              </div>

              {/* Monthly Trend Chart - Full Width */}
              <MonthlyTrendChart data={monthlyData} />

              {/* Monthly Summary Table - Full Width */}
              <MonthlySummaryTable data={monthlyData} />

              {/* Period Comparison */}
              <MonthlyComparison
                payrollRecords={payrollRecords}
                employees={employees}
                availablePeriods={availablePeriods}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
