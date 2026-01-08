'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProfitDistributionChartProps {
  data: {
    range: string
    count: number
    percentage: number
  }[]
}

// Colors for margin ranges (4-tier system): <7% (red), 7-10% (orange), 10-12% (green), ≥12% (emerald)
// Target margin: 12%
const COLORS = ['#ef4444', '#f97316', '#22c55e', '#10b981']

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-white/10 bg-black/80 backdrop-blur-md p-4 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <p className="font-semibold text-foreground">{data.range}</p>
        <p className="text-sm text-slate-300">
          {data.count}名 ({data.percentage.toFixed(1)}%)
        </p>
      </div>
    )
  }
  return null
}

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold drop-shadow-md"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export const ProfitDistributionChart = React.memo(function ProfitDistributionChart({ data }: ProfitDistributionChartProps) {
  // Handle empty or undefined data
  const chartData = data || []

  if (chartData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card className="glass-card overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-200">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              粗利分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              データがありません
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      <Card className="glass-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-200">
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
            マージン率分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="h-[300px]"
            role="img"
            aria-label="利益分布: マージン率別の従業員分布"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="count"
                  animationBegin={0}
                  animationDuration={1000}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="transition-all duration-300 hover:opacity-80 hover:scale-[1.02]"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  formatter={(value, entry: any) => (
                    <span className="text-sm text-slate-300 font-medium">
                      {entry.payload.range}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})
