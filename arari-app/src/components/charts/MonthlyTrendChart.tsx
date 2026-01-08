'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatYen, formatPercent } from '@/lib/utils'
import { CalendarDays, TrendingUp } from 'lucide-react'

interface MonthlyData {
  period: string
  revenue: number
  cost: number
  profit: number
  margin: number
  employeeCount: number
}

interface MonthlyTrendChartProps {
  data: MonthlyData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload
    if (!data) return null

    return (
      <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-2xl min-w-[240px]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <p className="font-bold text-base">{label}</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">売上</span>
            </div>
            <span className="font-bold text-blue-500">{formatYen(data.revenue)}</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm text-muted-foreground">コスト</span>
            </div>
            <span className="font-bold text-orange-500">{formatYen(data.cost)}</span>
          </div>

          <div className="flex justify-between items-center border-t pt-2 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-muted-foreground">粗利</span>
            </div>
            <span className="font-bold text-emerald-500">{formatYen(data.profit)}</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-muted-foreground">マージン</span>
            </div>
            <span className="font-bold text-purple-500">{formatPercent(data.margin)}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
            <span>従業員数</span>
            <span>{data.employeeCount}名</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CustomLegend = () => {
  return (
    <div className="flex justify-center gap-6 mt-4">
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
        <span className="text-sm text-muted-foreground">売上</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 rounded bg-gradient-to-r from-orange-500 to-orange-600" />
        <span className="text-sm text-muted-foreground">コスト</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 rounded bg-gradient-to-r from-emerald-500 to-emerald-600" />
        <span className="text-sm text-muted-foreground">粗利</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-purple-500" />
        <span className="text-sm text-muted-foreground">マージン率</span>
      </div>
    </div>
  )
}

export const MonthlyTrendChart = React.memo(function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  // Memoize all calculations to prevent recalculation on every render
  const { chartData, totalRevenue, totalCost, totalProfit, avgMargin } = useMemo(() => {
    // Sort data chronologically (Oldest -> Newest) for the chart
    const sortedData = [...data].sort((a, b) => {
      // Parse period string "YYYY年M月" -> YYYY, M
      const [aYear, aMonth] = a.period.replace('年', '-').replace('月', '').split('-').map(Number)
      const [bYear, bMonth] = b.period.replace('年', '-').replace('月', '').split('-').map(Number)

      if (aYear !== bYear) return aYear - bYear
      return aMonth - bMonth
    })

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
    const totalCost = data.reduce((sum, d) => sum + d.cost, 0)
    const totalProfit = data.reduce((sum, d) => sum + d.profit, 0)
    const avgMargin = data.length > 0
      ? data.reduce((sum, d) => sum + d.margin, 0) / data.length
      : 0

    // Format period for display (2025年1月 -> 1月)
    const chartData = sortedData.map(d => ({
      ...d,
      displayPeriod: d.period.replace(/\d{4}年/, ''),
    }))

    return { chartData, totalRevenue, totalCost, totalProfit, avgMargin }
  }, [data])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-500" />
                月次推移
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                売上・コスト・粗利の月別推移
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground">総粗利</p>
                <p className="text-lg font-bold text-emerald-500">{formatYen(totalProfit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平均マージン</p>
                <p className="text-lg font-bold text-purple-500">{formatPercent(avgMargin)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                    <stop offset="100%" stopColor="#c2410c" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted/20"
                  vertical={false}
                />
                <XAxis
                  dataKey="displayPeriod"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 50]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="売上"
                  fill="url(#revenueGrad)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  animationDuration={1000}
                />
                <Bar
                  yAxisId="left"
                  dataKey="cost"
                  name="コスト"
                  fill="url(#costGrad)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  animationDuration={1000}
                  animationBegin={200}
                />
                <Bar
                  yAxisId="left"
                  dataKey="profit"
                  name="粗利"
                  fill="url(#profitGrad)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  animationDuration={1000}
                  animationBegin={400}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin"
                  name="マージン"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#a855f7' }}
                  animationDuration={1500}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <CustomLegend />
        </CardContent>
      </Card>
    </motion.div>
  )
})
