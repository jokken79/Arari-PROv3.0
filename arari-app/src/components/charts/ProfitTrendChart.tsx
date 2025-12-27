import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatYen } from '@/lib/utils'
import { Maximize2, X, TrendingUp } from 'lucide-react'

interface ProfitTrendChartProps {
  data: {
    period: string
    revenue: number
    cost: number
    profit: number
  }[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-4 shadow-xl">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {entry.dataKey === 'margin'
                ? `${entry.value.toFixed(1)}%`
                : formatYen(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function ProfitTrendChart({ data }: ProfitTrendChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Add margin % calculation to data
  const dataWithMargin = data.map(d => ({
    ...d,
    margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
  }))

  const ChartContent = ({ height = "100%" }: { height?: string | number }) => (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={dataWithMargin}
          margin={{ top: 10, right: 60, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-white/10"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value}%`}
            domain={[0, 30]}
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#f59e0b' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            name="売上"
            stroke="#06b6d4"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="cost"
            name="コスト"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#colorCost)"
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="profit"
            name="粗利"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorProfit)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="margin"
            name="マージン率"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card className="glass-card overflow-hidden relative group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-200">
                <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                月別収益トレンド
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(true)}
                className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
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
                  <TrendingUp className="h-6 w-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold text-foreground">月別収益トレンド (詳細)</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
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
}
