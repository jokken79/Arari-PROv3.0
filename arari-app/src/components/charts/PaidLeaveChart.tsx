'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
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
} from 'recharts'

interface PaidLeaveData {
  period: string
  totalDays: number
  totalHours: number
  totalAmount: number
  employeeCount: number
}

interface PaidLeaveChartProps {
  data: PaidLeaveData[]
}

export const PaidLeaveChart = React.memo(function PaidLeaveChart({ data }: PaidLeaveChartProps) {
  // Sort data by period
  const sortedData = [...data].sort((a, b) => {
    const [aYear, aMonth] = a.period.replace('年', '-').replace('月', '').split('-').map(Number)
    const [bYear, bMonth] = b.period.replace('年', '-').replace('月', '').split('-').map(Number)
    return aYear === bYear ? aMonth - bMonth : aYear - bYear
  })

  // Format for display
  const chartData = sortedData.map(d => ({
    ...d,
    displayPeriod: d.period.replace('年', '/').replace('月', ''),
    amountInMan: d.totalAmount / 10000, // 万円単位
  }))

  const totalAmount = data.reduce((sum, d) => sum + d.totalAmount, 0)
  const totalDays = data.reduce((sum, d) => sum + d.totalDays, 0)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
          <p className="font-semibold text-foreground mb-2">{data.period}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">有給金額:</span>
              <span className="font-medium text-amber-500">
                ¥{data.totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">有給日数:</span>
              <span className="font-medium text-blue-500">
                {data.totalDays.toFixed(1)}日
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">有給時間:</span>
              <span className="font-medium text-purple-500">
                {data.totalHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="text-muted-foreground">対象人数:</span>
              <span className="font-medium">{data.employeeCount}名</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            有給休暇コスト推移
          </div>
          <div className="flex gap-4 text-sm font-normal">
            <div className="text-right">
              <p className="text-muted-foreground text-xs">累計金額</p>
              <p className="font-semibold text-amber-500">¥{totalAmount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">累計日数</p>
              <p className="font-semibold text-blue-500">{totalDays.toFixed(1)}日</p>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            有給休暇データがありません
          </div>
        ) : (
          <div
            className="h-[300px]"
            role="img"
            aria-label="有給休暇チャート: 期間別の有給取得状況"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="displayPeriod"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                />
                <YAxis
                  yAxisId="amount"
                  orientation="left"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                  tickFormatter={(value) => `${value}万`}
                  label={{
                    value: '金額(万円)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: 'currentColor', opacity: 0.6 }
                  }}
                />
                <YAxis
                  yAxisId="days"
                  orientation="right"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                  tickFormatter={(value) => `${value}日`}
                  label={{
                    value: '日数',
                    angle: 90,
                    position: 'insideRight',
                    style: { fontSize: 11, fill: 'currentColor', opacity: 0.6 }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      amountInMan: '有給金額（万円）',
                      totalDays: '有給日数',
                    }
                    return <span className="text-sm">{labels[value] || value}</span>
                  }}
                />
                <Bar
                  yAxisId="amount"
                  dataKey="amountInMan"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  name="amountInMan"
                />
                <Line
                  yAxisId="days"
                  type="monotone"
                  dataKey="totalDays"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                  name="totalDays"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
