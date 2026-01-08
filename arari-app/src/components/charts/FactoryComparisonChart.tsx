import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { Button } from '@/components/ui/button'
import { formatYen, formatPercent, comparePeriods } from '@/lib/utils'
import { Factory, TrendingUp, ArrowUpRight, ArrowDownRight, Maximize2, X, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

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
  availablePeriods?: string[]
  selectedPeriod?: string
  onPeriodChange?: (period: string) => void
}

const CustomTooltip = ({ active, payload, label, targetMargin }: any) => {
  if (active && payload && payload.length) {
    const factoryData = payload[0]?.payload
    if (!factoryData) return null

    const target = targetMargin || 12
    const isPositiveProfit = factoryData.profit >= 0
    const marginColor = factoryData.margin >= target
      ? 'text-emerald-500'
      : factoryData.margin >= target - 3
        ? 'text-green-500'
        : factoryData.margin >= target - 7
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

export const FactoryComparisonChart = React.memo(function FactoryComparisonChart({
  data,
  availablePeriods = [],
  selectedPeriod,
  onPeriodChange
}: FactoryComparisonChartProps) {
  const settings = useAppStore(state => state.settings)
  const target = settings.target_margin || 12

  const [isExpanded, setIsExpanded] = useState(false)

  // Sort periods chronologically (newest first)
  const sortedPeriods = useMemo(() => {
    return [...availablePeriods].sort((a, b) => comparePeriods(b, a))
  }, [availablePeriods])

  // Memoize sorted data and calculations
  const { sortedData, totalRevenue, totalCost, totalProfit, avgMargin } = useMemo(() => {
    // Sort by profit for better visualization
    const sortedData = [...data].sort((a, b) => b.profit - a.profit)

    // Calculate totals
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
    const totalCost = data.reduce((sum, d) => sum + d.cost, 0)
    const totalProfit = data.reduce((sum, d) => sum + d.profit, 0)
    const avgMargin = data.length > 0
      ? data.reduce((sum, d) => sum + d.margin, 0) / data.length
      : 0

    return { sortedData, totalRevenue, totalCost, totalProfit, avgMargin }
  }, [data])

  const ChartContent = ({ height = "100%" }: { height?: string | number }) => (
    <div style={{ height }} className="w-full">
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
            angle={-35}
            textAnchor="end"
            height={70}
            tickFormatter={(value: string) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
            interval={0}
          />
          <YAxis
            tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip targetMargin={target} />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
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
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <Card className="overflow-hidden relative group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5 text-blue-500" />
                    派遣先別 売上 vs コスト
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    各派遣先の収益性を一目で確認
                  </p>
                </div>
                {sortedPeriods.length > 0 && onPeriodChange && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={selectedPeriod || ''}
                      onChange={(e) => onPeriodChange(e.target.value)}
                      className="px-3 py-1.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {sortedPeriods.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-right items-center">
                <div className="hidden sm:block">
                  <p className="text-xs text-muted-foreground">総粗利</p>
                  <p className={cn(
                    "text-lg font-bold",
                    totalProfit >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {formatYen(totalProfit)}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs text-muted-foreground">平均マージン</p>
                  <p className={cn(
                    "text-lg font-bold",
                    avgMargin >= target ? "text-emerald-500" : avgMargin >= target - 3 ? "text-green-500" : avgMargin >= target - 7 ? "text-amber-500" : "text-red-500"
                  )}>
                    {formatPercent(avgMargin)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(true)}
                  className="ml-2 text-muted-foreground hover:text-foreground"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ChartContent />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Expanded View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-7xl h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4">
                  <Factory className="h-6 w-6 text-blue-500" />
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">派遣先別 売上 vs コスト (詳細)</h2>
                    <div className="flex gap-4 mt-1">
                      <span className="text-sm text-slate-400">総粗利: <span className="text-emerald-500 font-bold">{formatYen(totalProfit)}</span></span>
                      <span className="text-sm text-slate-400">平均マージン: <span className={cn("font-bold", avgMargin >= target ? "text-emerald-500" : "text-amber-500")}>{formatPercent(avgMargin)}</span></span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="flex-1 p-6 min-h-0 bg-gradient-to-br from-[#0a0a0a] to-[#111]">
                <ChartContent height="100%" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})

