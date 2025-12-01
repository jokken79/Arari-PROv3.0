'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  DollarSign,
  Users,
  Percent,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatYen, formatPercent } from '@/lib/utils'
import type { PayrollRecord, Employee } from '@/types'

interface MonthlyComparisonProps {
  payrollRecords: PayrollRecord[]
  employees: Employee[]
  availablePeriods: string[]
}

interface PeriodSummary {
  period: string
  totalRevenue: number
  totalCost: number
  totalProfit: number
  averageMargin: number
  employeeCount: number
  totalSocialInsurance: number
  totalPaidLeaveCost: number
}

export function MonthlyComparison({
  payrollRecords,
  employees,
  availablePeriods,
}: MonthlyComparisonProps) {
  const [period1, setPeriod1] = useState(availablePeriods[0] || '')
  const [period2, setPeriod2] = useState(availablePeriods[1] || '')

  const calculatePeriodSummary = (period: string): PeriodSummary => {
    const records = payrollRecords.filter(r => r.period === period)

    return {
      period,
      totalRevenue: records.reduce((sum, r) => sum + r.billingAmount, 0),
      totalCost: records.reduce((sum, r) => sum + r.totalCompanyCost, 0),
      totalProfit: records.reduce((sum, r) => sum + r.grossProfit, 0),
      averageMargin: records.length > 0
        ? records.reduce((sum, r) => sum + r.profitMargin, 0) / records.length
        : 0,
      employeeCount: records.length,
      totalSocialInsurance: records.reduce((sum, r) => sum + r.companySocialInsurance, 0),
      totalPaidLeaveCost: records.reduce((sum, r) => sum + (r.paidLeaveHours * (employees.find(e => e.employeeId === r.employeeId)?.hourlyRate || 0)), 0),
    }
  }

  const summary1 = calculatePeriodSummary(period1)
  const summary2 = calculatePeriodSummary(period2)

  const calculateChange = (value1: number, value2: number) => {
    if (value2 === 0) return 0
    return ((value1 - value2) / value2) * 100
  }

  const ComparisonRow = ({
    label,
    value1,
    value2,
    format = 'yen',
    icon: Icon,
  }: {
    label: string
    value1: number
    value2: number
    format?: 'yen' | 'percent' | 'number'
    icon: React.ElementType
  }) => {
    const change = calculateChange(value1, value2)
    const isPositive = change > 0
    const isNeutral = change === 0

    const formatValue = (val: number) => {
      switch (format) {
        case 'percent':
          return formatPercent(val)
        case 'number':
          return val.toString()
        default:
          return formatYen(val)
      }
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-4 gap-4 items-center py-4 border-b last:border-0"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="font-medium">{label}</span>
        </div>
        <div className="text-right font-mono">{formatValue(value2)}</div>
        <div className="text-right font-mono">{formatValue(value1)}</div>
        <div className="flex items-center justify-end gap-2">
          {!isNeutral && (
            <>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={isPositive ? 'success' : 'danger'}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </Badge>
            </>
          )}
          {isNeutral && (
            <Badge variant="secondary">変化なし</Badge>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            月次比較
          </CardTitle>
          <CardDescription>
            2つの期間を選択して粗利やコストを比較
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">比較元（古い月）</label>
              <Select value={period2} onValueChange={setPeriod2}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="期間を選択" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map(period => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />

            <div className="space-y-2">
              <label className="text-sm font-medium">比較先（新しい月）</label>
              <Select value={period1} onValueChange={setPeriod1}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="期間を選択" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map(period => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
            <div>項目</div>
            <div className="text-right">{period2}</div>
            <div className="text-right">{period1}</div>
            <div className="text-right">変化</div>
          </div>
        </CardHeader>
        <CardContent>
          <ComparisonRow
            label="売上合計"
            value1={summary1.totalRevenue}
            value2={summary2.totalRevenue}
            icon={DollarSign}
          />
          <ComparisonRow
            label="コスト合計"
            value1={summary1.totalCost}
            value2={summary2.totalCost}
            icon={DollarSign}
          />
          <ComparisonRow
            label="粗利合計"
            value1={summary1.totalProfit}
            value2={summary2.totalProfit}
            icon={TrendingUp}
          />
          <ComparisonRow
            label="平均マージン"
            value1={summary1.averageMargin}
            value2={summary2.averageMargin}
            format="percent"
            icon={Percent}
          />
          <ComparisonRow
            label="従業員数"
            value1={summary1.employeeCount}
            value2={summary2.employeeCount}
            format="number"
            icon={Users}
          />
          <ComparisonRow
            label="社会保険（会社負担）"
            value1={summary1.totalSocialInsurance}
            value2={summary2.totalSocialInsurance}
            icon={Building2}
          />
          <ComparisonRow
            label="有給コスト"
            value1={summary1.totalPaidLeaveCost}
            value2={summary2.totalPaidLeaveCost}
            icon={Calendar}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">粗利の変化</p>
                  <p className="text-3xl font-bold text-emerald-500">
                    {formatYen(summary1.totalProfit - summary2.totalProfit)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-emerald-500/10">
                  {summary1.totalProfit >= summary2.totalProfit ? (
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">売上の変化</p>
                  <p className="text-3xl font-bold text-blue-500">
                    {formatYen(summary1.totalRevenue - summary2.totalRevenue)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <DollarSign className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">コストの変化</p>
                  <p className="text-3xl font-bold text-amber-500">
                    {formatYen(summary1.totalCost - summary2.totalCost)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Building2 className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
