'use client'

import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatYen, formatPercent } from '@/lib/utils'
import { Factory, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FactoryData {
  companyName: string
  revenue: number
  cost: number
  profit: number
  margin: number
  employeeCount: number
}

interface FactoryComparisonChartProps {
  data: FactoryData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const factoryData = payload[0]?.payload
    if (!factoryData) return null

    const isPositiveProfit = factoryData.profit >= 0
    const marginColor = factoryData.margin >= 10
      ? 'text-emerald-500'
      : factoryData.margin >= 7
        ? 'text-green-500'
        : factoryData.margin >= 3
          ? 'text-amber-500'
          : 'text-red-500'

    return (
      <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-2xl min-w-[260px]">
        <div className="flex items-center gap-2 mb-3">
          <Factory className="h-4 w-4 text-blue-500" />
          <p className="font-bold text-base">{label}</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/10 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">売上</p>
              <p className="text-sm font-bold text-blue-500">{formatYen(factoryData.revenue)}</p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">コスト</p>
              <p className="text-sm font-bold text-orange-500">{formatYen(factoryData.cost)}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">粗利</span>
              <div className="flex items-center gap-1">
                {isPositiveProfit ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span className={cn(
                  "font-bold",
                  isPositiveProfit ? "text-emerald-500" : "text-red-500"
                )}>
                  {formatYen(factoryData.profit)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">マージン率</span>
              <span className={cn("font-bold", marginColor)}>
                {formatPercent(factoryData.margin)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">従業員数</span>
              <span className="font-bold">{factoryData.employeeCount}名</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex justify-center gap-6 mt-2">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">
            {entry.value === 'revenue' ? '売上' : 'コスト'}
          </span>
        </div>
      ))}
    </div>
  )
}

export function FactoryComparisonChart({ data }: FactoryComparisonChartProps) {
  // Sort by profit for better visualization
  const sortedData = [...data].sort((a, b) => b.profit - a.profit)

  // Calculate totals
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalCost = data.reduce((sum, d) => sum + d.cost, 0)
  const totalProfit = data.reduce((sum, d) => sum + d.profit, 0)
  const avgMargin = data.length > 0
    ? data.reduce((sum, d) => sum + d.margin, 0) / data.length
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-500" />
                派遣先別 売上 vs コスト
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                各派遣先の収益性を一目で確認
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground">総粗利</p>
                <p className={cn(
                  "text-lg font-bold",
                  totalProfit >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {formatYen(totalProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平均マージン</p>
                <p className={cn(
                  "text-lg font-bold",
                  avgMargin >= 10 ? "text-emerald-500" : avgMargin >= 7 ? "text-green-500" : avgMargin >= 3 ? "text-amber-500" : "text-red-500"
                )}>
                  {formatPercent(avgMargin)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barGap={0}
                barCategoryGap="15%"
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted/20"
                  vertical={false}
                />
                <XAxis
                  dataKey="companyName"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
                <Legend content={<CustomLegend />} />
                <Bar
                  dataKey="revenue"
                  name="revenue"
                  fill="url(#revenueGradient)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                />
                <Bar
                  dataKey="cost"
                  name="cost"
                  fill="url(#costGradient)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                  animationBegin={200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
