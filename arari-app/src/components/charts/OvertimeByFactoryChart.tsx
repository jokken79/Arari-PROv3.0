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
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, AlertTriangle, Moon, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OvertimeFactoryData {
  companyName: string
  overtimeHours: number       // 残業 (≤60H)
  overtimeOver60h: number     // 60H過残業
  nightHours: number          // 深夜時間
  holidayHours: number        // 休日時間
  totalOvertime: number       // 合計残業
  employeeCount: number
}

interface OvertimeByFactoryChartProps {
  data: OvertimeFactoryData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const factoryData = payload[0]?.payload
    if (!factoryData) return null

    const hasExcessiveOvertime = factoryData.overtimeOver60h > 0
    const avgOvertimePerEmployee = factoryData.employeeCount > 0
      ? factoryData.totalOvertime / factoryData.employeeCount
      : 0

    return (
      <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-2xl min-w-[280px]">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-amber-500" />
          <p className="font-bold text-base">{label}</p>
          {hasExcessiveOvertime && (
            <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              60H超過あり
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-amber-500/10 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">残業 (≤60H)</p>
              <p className="text-sm font-bold text-amber-500">{factoryData.overtimeHours.toFixed(1)}h</p>
            </div>
            <div className={cn(
              "rounded-lg p-2 text-center",
              factoryData.overtimeOver60h > 0 ? "bg-red-500/10" : "bg-muted/50"
            )}>
              <p className="text-xs text-muted-foreground">60H過残業</p>
              <p className={cn(
                "text-sm font-bold",
                factoryData.overtimeOver60h > 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {factoryData.overtimeOver60h.toFixed(1)}h
              </p>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">深夜時間</p>
              <p className="text-sm font-bold text-purple-500">{factoryData.nightHours.toFixed(1)}h</p>
            </div>
            <div className="bg-pink-500/10 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">休日時間</p>
              <p className="text-sm font-bold text-pink-500">{factoryData.holidayHours.toFixed(1)}h</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">合計残業時間</span>
              <span className="font-bold text-amber-500">
                {factoryData.totalOvertime.toFixed(1)}h
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">従業員数</span>
              <span className="font-bold">{factoryData.employeeCount}名</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">平均残業/人</span>
              <span className={cn(
                "font-bold",
                avgOvertimePerEmployee > 45 ? "text-red-500" :
                avgOvertimePerEmployee > 30 ? "text-amber-500" : "text-emerald-500"
              )}>
                {avgOvertimePerEmployee.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: any) => {
  const labels: Record<string, { label: string; color: string }> = {
    overtimeHours: { label: '残業 (≤60H)', color: '#f59e0b' },
    overtimeOver60h: { label: '60H過残業', color: '#ef4444' },
    nightHours: { label: '深夜時間', color: '#8b5cf6' },
    holidayHours: { label: '休日時間', color: '#ec4899' },
  }

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-2">
      {payload?.map((entry: any, index: number) => {
        const config = labels[entry.dataKey] || { label: entry.value, color: entry.color }
        return (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-sm text-muted-foreground">
              {config.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function OvertimeByFactoryChart({ data }: OvertimeByFactoryChartProps) {
  // Sort by total overtime for better visualization
  const sortedData = [...data].sort((a, b) => b.totalOvertime - a.totalOvertime)

  // Calculate totals
  const totalOvertime = data.reduce((sum, d) => sum + d.overtimeHours, 0)
  const totalOver60h = data.reduce((sum, d) => sum + d.overtimeOver60h, 0)
  const totalNight = data.reduce((sum, d) => sum + d.nightHours, 0)
  const totalHoliday = data.reduce((sum, d) => sum + d.holidayHours, 0)
  const grandTotal = totalOvertime + totalOver60h + totalNight + totalHoliday

  // Find factory with most overtime
  const topOvertimeFactory = sortedData[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                派遣先別 残業分析
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                各派遣先の残業・深夜・休日時間を比較
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-right">
              <div className="bg-amber-500/10 rounded-lg px-3 py-1.5">
                <p className="text-xs text-muted-foreground">残業合計</p>
                <p className="text-sm font-bold text-amber-500">
                  {totalOvertime.toFixed(1)}h
                </p>
              </div>
              {totalOver60h > 0 && (
                <div className="bg-red-500/10 rounded-lg px-3 py-1.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    60H超過
                  </p>
                  <p className="text-sm font-bold text-red-500">
                    {totalOver60h.toFixed(1)}h
                  </p>
                </div>
              )}
              <div className="bg-purple-500/10 rounded-lg px-3 py-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Moon className="h-3 w-3" />
                  深夜
                </p>
                <p className="text-sm font-bold text-purple-500">
                  {totalNight.toFixed(1)}h
                </p>
              </div>
              <div className="bg-pink-500/10 rounded-lg px-3 py-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  休日
                </p>
                <p className="text-sm font-bold text-pink-500">
                  {totalHoliday.toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          {/* Top overtime factory highlight */}
          {topOvertimeFactory && topOvertimeFactory.totalOvertime > 0 && (
            <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-600 font-medium">
                最多残業: <span className="font-bold">{topOvertimeFactory.companyName}</span>
                {' '}— 合計 {topOvertimeFactory.totalOvertime.toFixed(1)}h
                ({topOvertimeFactory.employeeCount}名, 平均 {(topOvertimeFactory.totalOvertime / topOvertimeFactory.employeeCount).toFixed(1)}h/人)
              </p>
            </div>
          )}
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
                  <linearGradient id="overtimeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="over60hGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                  <linearGradient id="nightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                  <linearGradient id="holidayGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#db2777" />
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
                  tickFormatter={(value) => `${value}h`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
                <Legend content={<CustomLegend />} />
                <Bar
                  dataKey="overtimeHours"
                  name="残業 (≤60H)"
                  stackId="overtime"
                  fill="url(#overtimeGradient)"
                  radius={[0, 0, 0, 0]}
                  animationDuration={1000}
                />
                <Bar
                  dataKey="overtimeOver60h"
                  name="60H過残業"
                  stackId="overtime"
                  fill="url(#over60hGradient)"
                  radius={[0, 0, 0, 0]}
                  animationDuration={1000}
                  animationBegin={200}
                />
                <Bar
                  dataKey="nightHours"
                  name="深夜時間"
                  stackId="overtime"
                  fill="url(#nightGradient)"
                  radius={[0, 0, 0, 0]}
                  animationDuration={1000}
                  animationBegin={400}
                />
                <Bar
                  dataKey="holidayHours"
                  name="休日時間"
                  stackId="overtime"
                  fill="url(#holidayGradient)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                  animationBegin={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
