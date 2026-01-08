'use client'

import { motion } from 'framer-motion'
import {
  TrendingUp,
  DollarSign,
  Percent,
  Wallet,
  Users,
  Building2,
  BadgeJapaneseYen,
  Receipt,
} from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { formatYen, formatPercent } from '@/lib/utils'

interface DashboardStatsProps {
  stats: {
    total_monthly_profit: number
    total_monthly_revenue: number
    average_margin: number
    total_monthly_cost: number
    total_companies: number
    average_profit: number
  }
  previousMargin?: number
  targetMargin: number
  activeEmployeeCount: number
  totalPayrollCount: number
  currentPeriodCount: number
  isLoading?: boolean
}

export function DashboardStats({
  stats,
  previousMargin,
  targetMargin,
  activeEmployeeCount,
  totalPayrollCount,
  currentPeriodCount,
  isLoading = false,
}: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-6 rounded-xl animate-pulse">
              <div className="h-4 w-20 bg-muted/50 rounded mb-2" />
              <div className="h-8 w-16 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-6 rounded-xl animate-pulse">
              <div className="h-4 w-20 bg-muted/50 rounded mb-2" />
              <div className="h-8 w-16 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="月間粗利"
          value={formatYen(stats.total_monthly_profit)}
          icon={TrendingUp}
          trend={{
            value: previousMargin
              ? stats.average_margin - previousMargin
              : 0,
            label: '前月比'
          }}
          variant="gradient"
          delay={0}
        />
        <StatsCard
          title="月間売上"
          value={formatYen(stats.total_monthly_revenue)}
          icon={DollarSign}
          subtitle={`${currentPeriodCount}名分`}
          variant="success"
          delay={1}
        />
        <StatsCard
          title="平均マージン率"
          value={formatPercent(stats.average_margin)}
          icon={Percent}
          subtitle={stats.average_margin >= targetMargin ? '目標達成' : `目標: ${targetMargin}%`}
          variant={stats.average_margin >= targetMargin ? 'success' : 'warning'}
          delay={2}
        />
        <StatsCard
          title="会社負担コスト"
          value={formatYen(stats.total_monthly_cost)}
          icon={Wallet}
          subtitle="社保・雇用保険・労災含む"
          variant="default"
          delay={3}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <StatsCard
          title="在職中"
          value={`${activeEmployeeCount}名`}
          icon={Users}
          delay={4}
        />
        <StatsCard
          title="派遣先企業数"
          value={`${stats.total_companies}社`}
          icon={Building2}
          delay={5}
        />
        <StatsCard
          title="平均粗利/人"
          value={formatYen(stats.average_profit)}
          icon={BadgeJapaneseYen}
          delay={6}
        />
        <StatsCard
          title="処理済明細"
          value={`${totalPayrollCount}件`}
          icon={Receipt}
          delay={7}
        />
      </div>
    </div>
  )
}
