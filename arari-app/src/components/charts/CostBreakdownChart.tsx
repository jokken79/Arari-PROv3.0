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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatYen } from '@/lib/utils'

interface CostBreakdownChartProps {
  data: {
    category: string
    salary: number
    socialInsurance: number
    employmentInsurance: number
    paidLeave: number
    transport: number
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
            <span className="font-medium">{formatYen(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            コスト内訳
          </CardTitle>
          <CardDescription>
            会社負担のコスト詳細（社会保険は従業員と同額を会社が負担）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="salary"
                  name="給与"
                  stackId="a"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="socialInsurance"
                  name="社会保険（会社負担）"
                  stackId="a"
                  fill="#f59e0b"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="employmentInsurance"
                  name="雇用保険"
                  stackId="a"
                  fill="#8b5cf6"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="paidLeave"
                  name="有給コスト"
                  stackId="a"
                  fill="#ec4899"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="transport"
                  name="通勤費"
                  stackId="a"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
