'use client'

import React, { useMemo } from 'react'
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
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatYen } from '@/lib/utils'
import { TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmployeeRanking {
  employeeId: string
  name: string
  company: string
  profit: number
  margin: number
  revenue: number
  cost: number
}

interface EmployeeRankingChartProps {
  topPerformers: EmployeeRanking[]
  bottomPerformers: EmployeeRanking[]
  averageProfit: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const isPositive = data.profit >= 0
    return (
      <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-4 shadow-xl min-w-[220px]">
        <p className="font-semibold mb-2 text-base">{data.name}</p>
        <p className="text-xs text-muted-foreground mb-3">{data.company}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">粗利:</span>
            <span className={cn(
              "font-bold",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {formatYen(data.profit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">マージン率:</span>
            <span className={cn(
              "font-medium",
              data.margin >= 12 ? "text-emerald-500" :
                data.margin >= 10 ? "text-green-500" :
                  data.margin >= 7 ? "text-orange-500" : "text-red-500"
            )}>
              {data.margin.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">売上:</span>
            <span className="font-medium text-blue-400">{formatYen(data.revenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">コスト:</span>
            <span className="font-medium text-orange-400">{formatYen(data.cost)}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

import { useRouter } from 'next/navigation'



export const EmployeeRankingChart = React.memo(function EmployeeRankingChart({
  topPerformers,
  bottomPerformers,
  averageProfit
}: EmployeeRankingChartProps) {
  const router = useRouter()

  // Memoize sorted data to prevent recalculation on every render
  const topData = useMemo(() =>
    [...topPerformers].sort((a, b) => b.profit - a.profit).slice(0, 5),
    [topPerformers]
  )

  const bottomData = useMemo(() =>
    [...bottomPerformers].sort((a, b) => a.profit - b.profit).slice(0, 5),
    [bottomPerformers]
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Top Performers */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card
          className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent cursor-pointer hover:bg-emerald-500/10 transition-colors"
          onClick={() => router.push('/employees?sort=profit&order=desc')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-emerald-500">
              <Award className="h-5 w-5" />
              <span>トップパフォーマー</span>
              <TrendingUp className="h-4 w-4 ml-auto animate-bounce" />
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              月間粗利上位5名
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="h-[280px]"
              role="img"
              aria-label="従業員ランキング: 粗利上位従業員"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="topGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/20"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
                  <ReferenceLine
                    x={averageProfit}
                    stroke="#6366f1"
                    strokeDasharray="5 5"
                    label={{ value: '平均', fill: '#6366f1', fontSize: 10 }}
                  />
                  <Bar
                    dataKey="profit"
                    fill="url(#topGradient)"
                    radius={[0, 6, 6, 0]}
                    animationDuration={1200}
                  >
                    {topData.map((entry, index) => (
                      <Cell
                        key={`top-cell-${index}`}
                        className="transition-opacity duration-300 hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Performers / Attention Needed */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card
          className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent cursor-pointer hover:bg-amber-500/10 transition-colors"
          onClick={() => router.push('/employees?sort=profit&order=asc')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <span>要改善リスト</span>
              <TrendingDown className="h-4 w-4 ml-auto" />
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              粗利改善が必要な5名
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="h-[280px]"
              role="img"
              aria-label="従業員ランキング: 粗利下位従業員"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bottomData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="bottomGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="negativeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/20"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
                  <ReferenceLine
                    x={0}
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                  <Bar
                    dataKey="profit"
                    radius={[0, 6, 6, 0]}
                    animationDuration={1200}
                  >
                    {bottomData.map((entry, index) => (
                      <Cell
                        key={`bottom-cell-${index}`}
                        fill={entry.profit < 0 ? 'url(#negativeGradient)' : 'url(#bottomGradient)'}
                        className="transition-opacity duration-300 hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
})
