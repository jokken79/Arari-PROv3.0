'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { ProfitTrendChart } from '@/components/charts/ProfitTrendChart'
import { ProfitDistributionChart } from '@/components/charts/ProfitDistributionChart'
import { CompanyProfitChart } from '@/components/charts/CompanyProfitChart'
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart'
import { RecentPayrolls } from '@/components/dashboard/RecentPayrolls'
import { useAppStore } from '@/store/appStore'
import { formatYen, formatPercent } from '@/lib/utils'

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { dashboardStats, employees, payrollRecords, loadSampleData } = useAppStore()

  useEffect(() => {
    if (employees.length === 0) {
      loadSampleData()
    }
  }, [employees.length, loadSampleData])

  if (!dashboardStats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  // Prepare cost breakdown data
  const costBreakdownData = [
    {
      category: '直近月',
      salary: dashboardStats.totalMonthlyCost * 0.65,
      socialInsurance: dashboardStats.totalMonthlyCost * 0.20,
      employmentInsurance: dashboardStats.totalMonthlyCost * 0.02,
      paidLeave: dashboardStats.totalMonthlyCost * 0.05,
      transport: dashboardStats.totalMonthlyCost * 0.08,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:pl-[280px] transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ダッシュボード
            </h1>
            <p className="text-muted-foreground mt-1">
              粗利分析の概要とリアルタイム統計
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatsCard
              title="月間粗利"
              value={formatYen(dashboardStats.totalMonthlyProfit)}
              icon={TrendingUp}
              trend={{ value: 12.5, label: '前月比' }}
              variant="gradient"
              delay={0}
            />
            <StatsCard
              title="月間売上"
              value={formatYen(dashboardStats.totalMonthlyRevenue)}
              icon={DollarSign}
              trend={{ value: 8.2, label: '前月比' }}
              variant="success"
              delay={1}
            />
            <StatsCard
              title="平均マージン率"
              value={formatPercent(dashboardStats.averageMargin)}
              icon={Percent}
              subtitle="目標: 25%"
              variant="default"
              delay={2}
            />
            <StatsCard
              title="会社負担コスト"
              value={formatYen(dashboardStats.totalMonthlyCost)}
              icon={Wallet}
              subtitle="社保・有給含む"
              variant="warning"
              delay={3}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <StatsCard
              title="総従業員数"
              value={`${dashboardStats.totalEmployees}名`}
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

          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <ProfitTrendChart data={dashboardStats.profitTrend} />
            <ProfitDistributionChart data={dashboardStats.profitDistribution} />
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <CompanyProfitChart data={dashboardStats.topCompanies} />
            <CostBreakdownChart data={costBreakdownData} />
          </div>

          {/* Recent Payrolls */}
          <RecentPayrolls
            payrolls={dashboardStats.recentPayrolls}
            employees={employees}
          />
        </div>
      </main>
    </div>
  )
}
