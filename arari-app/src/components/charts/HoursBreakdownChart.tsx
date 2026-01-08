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
import { formatNumber } from '@/lib/utils'
import { Clock, Moon, Calendar, Timer } from 'lucide-react'

interface HoursData {
  workHours: number
  overtimeHours: number
  overtimeOver60h: number
  nightHours: number
  holidayHours: number
}

interface HoursBreakdownChartProps {
  data: HoursData
}

const COLORS = [
  '#3b82f6', // blue - 労働時間
  '#f59e0b', // amber - 残業
  '#ef4444', // red - 60H過残業
  '#8b5cf6', // purple - 深夜
  '#ec4899', // pink - 休日
]

const RADIAN = Math.PI / 180

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) => {
  if (percent < 0.05) return null // Don't show labels for small slices

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.payload.color }}
          />
          <p className="font-semibold">{data.payload.label}</p>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">時間:</span>
            <span className="font-bold">{formatNumber(data.value, 1)}H</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">割合:</span>
            <span className="font-medium">
              {((data.value / data.payload.total) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4 px-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground truncate">
            {entry.payload.label}: {formatNumber(entry.payload.value, 1)}H
          </span>
        </div>
      ))}
    </div>
  )
}

export const HoursBreakdownChart = React.memo(function HoursBreakdownChart({ data }: HoursBreakdownChartProps) {
  const totalHours =
    data.workHours +
    data.overtimeHours +
    data.overtimeOver60h +
    data.nightHours +
    data.holidayHours

  const chartData = [
    {
      name: 'workHours',
      label: '労働時間',
      value: data.workHours,
      color: COLORS[0],
      total: totalHours,
    },
    {
      name: 'overtimeHours',
      label: '残業 (≤60H)',
      value: data.overtimeHours,
      color: COLORS[1],
      total: totalHours,
    },
    {
      name: 'overtimeOver60h',
      label: '60H過残業',
      value: data.overtimeOver60h,
      color: COLORS[2],
      total: totalHours,
    },
    {
      name: 'nightHours',
      label: '深夜時間',
      value: data.nightHours,
      color: COLORS[3],
      total: totalHours,
    },
    {
      name: 'holidayHours',
      label: '休日時間',
      value: data.holidayHours,
      color: COLORS[4],
      total: totalHours,
    },
  ].filter(item => item.value > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            時間内訳
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            総時間: {formatNumber(totalHours, 1)}H
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {chartData.map((entry, index) => (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={`pieGradient-${index}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1200}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#pieGradient-${index})`}
                      stroke={entry.color}
                      strokeWidth={1}
                      className="transition-opacity duration-300 hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <CustomLegend payload={chartData.map(d => ({ color: d.color, payload: d }))} />
        </CardContent>
      </Card>
    </motion.div>
  )
})
