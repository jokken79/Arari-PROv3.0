'use client'

import { MarginGaugeChart } from '@/components/charts/MarginGaugeChart'
import { HoursBreakdownChart } from '@/components/charts/HoursBreakdownChart'
import { ProfitDistributionChart } from '@/components/charts/ProfitDistributionChart'
import { EmployeeRankingChart } from '@/components/charts/EmployeeRankingChart'
import { FactoryComparisonChart } from '@/components/charts/FactoryComparisonChart'
import { OvertimeByFactoryChart } from '@/components/charts/OvertimeByFactoryChart'
import { PaidLeaveChart } from '@/components/charts/PaidLeaveChart'
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart'
import { ProfitTrendChart } from '@/components/charts/ProfitTrendChart'
import { CompanyProfitChart } from '@/components/charts/CompanyProfitChart'
import type { CompanySummary } from '@/types'

interface HoursData {
  workHours: number
  overtimeHours: number
  overtimeOver60h: number
  nightHours: number
  holidayHours: number
}

interface ProfitDistribution {
  range: string
  count: number
  percentage: number
}

interface PerformerData {
  employeeId: string
  name: string
  company: string
  profit: number
  margin: number
  revenue: number
  cost: number
}

interface FactoryData {
  companyName: string
  revenue: number
  cost: number
  profit: number
  margin: number
  employeeCount: number
}

interface OvertimeData {
  companyName: string
  overtimeHours: number
  overtimeOver60h: number
  nightHours: number
  holidayHours: number
  totalOvertime: number
  employeeCount: number
}

interface PaidLeaveData {
  period: string
  totalDays: number
  totalHours: number
  totalAmount: number
  employeeCount: number
}

interface CostBreakdownData {
  category: string
  salary: number
  socialInsurance: number
  employmentInsurance: number
  paidLeave: number
  transport: number
}

interface ProfitTrendData {
  period: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

// CompanySummary imported from @/types

interface DashboardChartsProps {
  chartData: {
    hoursData: HoursData
    topPerformers: PerformerData[]
    bottomPerformers: PerformerData[]
    overtimeByFactoryData: OvertimeData[]
    paidLeaveData: PaidLeaveData[]
    costBreakdownData: CostBreakdownData[]
    previousMargin?: number
  }
  factoryChartData: FactoryData[]
  settings: {
    currentMargin: number
    targetMargin: number
    profitDistribution: ProfitDistribution[]
    profitTrend: ProfitTrendData[]
    averageProfit: number
  }
  companySummaries: CompanySummary[]
  availablePeriods: string[]
  factoryChartPeriod: string | null
  selectedPeriod: string
  onFactoryPeriodChange: (period: string | null) => void
}

export function DashboardCharts({
  chartData,
  factoryChartData,
  settings,
  companySummaries,
  availablePeriods,
  factoryChartPeriod,
  selectedPeriod,
  onFactoryPeriodChange,
}: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* Margin Gauge + Hours Breakdown Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <MarginGaugeChart
          currentMargin={settings.currentMargin}
          targetMargin={settings.targetMargin}
          previousMargin={chartData.previousMargin}
        />
        <HoursBreakdownChart data={chartData.hoursData} />
        <ProfitDistributionChart data={settings.profitDistribution} />
      </div>

      {/* Employee Ranking - Full Width */}
      <div>
        <EmployeeRankingChart
          topPerformers={chartData.topPerformers}
          bottomPerformers={chartData.bottomPerformers}
          averageProfit={settings.averageProfit}
        />
      </div>

      {/* Factory Comparison - Full Width */}
      {factoryChartData.length > 0 && (
        <div>
          <FactoryComparisonChart
            data={factoryChartData}
            availablePeriods={availablePeriods}
            selectedPeriod={factoryChartPeriod || selectedPeriod}
            onPeriodChange={onFactoryPeriodChange}
          />
        </div>
      )}

      {/* Overtime by Factory - Full Width */}
      {chartData.overtimeByFactoryData.length > 0 && (
        <div>
          <OvertimeByFactoryChart data={chartData.overtimeByFactoryData} />
        </div>
      )}

      {/* Paid Leave Chart - Full Width */}
      {chartData.paidLeaveData.length > 0 && (
        <div>
          <PaidLeaveChart data={chartData.paidLeaveData} />
        </div>
      )}

      {/* Cost Breakdown Chart */}
      {chartData.costBreakdownData.length > 0 && (
        <div>
          <CostBreakdownChart data={chartData.costBreakdownData} />
        </div>
      )}

      {/* Profit Trend + Company Profit */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitTrendChart data={settings.profitTrend} />
        <CompanyProfitChart data={companySummaries} />
      </div>
    </div>
  )
}
