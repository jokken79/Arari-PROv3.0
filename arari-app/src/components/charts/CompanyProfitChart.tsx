'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatYen } from '@/lib/utils'
import { Users, Wallet } from 'lucide-react'
import type { CompanySummary } from '@/types'

interface CompanyProfitChartProps {
  data: CompanySummary[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const profitPerEmployee = data.employeeCount > 0
      ? data.totalMonthlyProfit / data.employeeCount
      : 0
    return (
      <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-4 shadow-xl min-w-[220px]">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">月間粗利:</span>
            <span className="font-medium text-emerald-500">
              {formatYen(data.totalMonthlyProfit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">従業員数:</span>
            <span className="font-medium">{data.employeeCount}名</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-muted-foreground">一人当たり:</span>
            <span className="font-medium text-amber-500">
              {formatYen(profitPerEmployee)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">平均マージン:</span>
            <span className="font-medium">{data.averageMargin.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const GRADIENT_COLORS = [
  ['#3b82f6', '#1d4ed8'],
  ['#8b5cf6', '#6d28d9'],
  ['#10b981', '#047857'],
  ['#f59e0b', '#d97706'],
  ['#ec4899', '#be185d'],
]

export function CompanyProfitChart({ data }: CompanyProfitChartProps) {
  const [viewMode, setViewMode] = useState<'total' | 'perEmployee'>('total')

  // Add profitPerEmployee to each data point
  const chartData = data.map(d => ({
    ...d,
    profitPerEmployee: d.employeeCount > 0 ? d.totalMonthlyProfit / d.employeeCount : 0,
  }))

  // Sort by selected metric
  const sortedData = [...chartData].sort((a, b) =>
    viewMode === 'total'
      ? b.totalMonthlyProfit - a.totalMonthlyProfit
      : b.profitPerEmployee - a.profitPerEmployee
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              派遣先別月間粗利
            </CardTitle>
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={viewMode === 'total' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('total')}
                className="h-7 px-2 text-xs"
              >
                <Wallet className="h-3 w-3 mr-1" />
                合計
              </Button>
              <Button
                variant={viewMode === 'perEmployee' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('perEmployee')}
                className="h-7 px-2 text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                一人当たり
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  {sortedData.map((_, index) => (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={`barGradient-${index}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stopColor={GRADIENT_COLORS[index % GRADIENT_COLORS.length][0]}
                      />
                      <stop
                        offset="100%"
                        stopColor={GRADIENT_COLORS[index % GRADIENT_COLORS.length][1]}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted/30"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="companyName"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
                <Bar
                  dataKey={viewMode === 'total' ? 'totalMonthlyProfit' : 'profitPerEmployee'}
                  radius={[0, 8, 8, 0]}
                  animationDuration={1500}
                >
                  {sortedData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#barGradient-${index})`}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
