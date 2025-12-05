'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatYen, formatPercent, cn } from '@/lib/utils'
import { Table, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface MonthlyData {
  period: string
  revenue: number
  cost: number
  profit: number
  margin: number
  employeeCount: number
}

interface MonthlySummaryTableProps {
  data: MonthlyData[]
}

export function MonthlySummaryTable({ data }: MonthlySummaryTableProps) {
  // Calculate month-over-month changes
  const dataWithChanges = data.map((item, index) => {
    const prevItem = data[index + 1] // Previous month (older)
    return {
      ...item,
      revenueChange: prevItem ? ((item.revenue - prevItem.revenue) / prevItem.revenue) * 100 : null,
      costChange: prevItem ? ((item.cost - prevItem.cost) / prevItem.cost) * 100 : null,
      profitChange: prevItem ? ((item.profit - prevItem.profit) / prevItem.profit) * 100 : null,
      marginChange: prevItem ? item.margin - prevItem.margin : null,
    }
  })

  const ChangeIndicator = ({ value, type = 'positive' }: { value: number | null, type?: 'positive' | 'negative' }) => {
    if (value === null) return <span className="text-muted-foreground text-xs">-</span>

    const isPositive = value > 0
    const isNegative = value < 0
    const isNeutral = value === 0

    // For costs, negative change is good
    const isGood = type === 'positive' ? isPositive : isNegative
    const isBad = type === 'positive' ? isNegative : isPositive

    return (
      <span className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isGood && "text-emerald-500",
        isBad && "text-red-500",
        isNeutral && "text-muted-foreground"
      )}>
        {isPositive && <ArrowUpRight className="h-3 w-3" />}
        {isNegative && <ArrowDownRight className="h-3 w-3" />}
        {isNeutral && <Minus className="h-3 w-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  const MarginBadge = ({ margin }: { margin: number }) => {
    const colorClass = margin >= 30
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
      : margin >= 25
        ? 'bg-green-500/10 text-green-500 border-green-500/30'
        : margin >= 20
          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
          : margin >= 15
            ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
            : 'bg-red-500/10 text-red-500 border-red-500/30'

    return (
      <span className={cn(
        "inline-flex px-2 py-0.5 rounded-full text-xs font-bold border",
        colorClass
      )}>
        {formatPercent(margin)}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5 text-blue-500" />
            月別サマリー
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            全期間の売上・コスト・粗利一覧（前月比付き）
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">期間</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">売上</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground w-16">変動</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">コスト</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground w-16">変動</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">粗利</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground w-16">変動</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">マージン</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">人数</th>
                </tr>
              </thead>
              <tbody>
                {dataWithChanges.map((item, index) => (
                  <motion.tr
                    key={item.period}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/50 transition-colors",
                      index === 0 && "bg-primary/5"
                    )}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <span className={cn(
                          "font-medium",
                          index === 0 && "text-primary"
                        )}>
                          {item.period}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-blue-500">
                      {formatYen(item.revenue)}
                    </td>
                    <td className="text-right py-3 px-2">
                      <ChangeIndicator value={item.revenueChange} type="positive" />
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-orange-500">
                      {formatYen(item.cost)}
                    </td>
                    <td className="text-right py-3 px-2">
                      <ChangeIndicator value={item.costChange} type="negative" />
                    </td>
                    <td className="text-right py-3 px-2 font-mono font-bold">
                      <span className={item.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {formatYen(item.profit)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2">
                      <ChangeIndicator value={item.profitChange} type="positive" />
                    </td>
                    <td className="text-center py-3 px-2">
                      <MarginBadge margin={item.margin} />
                    </td>
                    <td className="text-right py-3 px-2 text-muted-foreground">
                      {item.employeeCount}名
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-bold">
                  <td className="py-3 px-2">合計/平均</td>
                  <td className="text-right py-3 px-2 font-mono text-blue-500">
                    {formatYen(data.reduce((sum, d) => sum + d.revenue, 0))}
                  </td>
                  <td></td>
                  <td className="text-right py-3 px-2 font-mono text-orange-500">
                    {formatYen(data.reduce((sum, d) => sum + d.cost, 0))}
                  </td>
                  <td></td>
                  <td className="text-right py-3 px-2 font-mono text-emerald-500">
                    {formatYen(data.reduce((sum, d) => sum + d.profit, 0))}
                  </td>
                  <td></td>
                  <td className="text-center py-3 px-2">
                    <MarginBadge margin={data.length > 0
                      ? data.reduce((sum, d) => sum + d.margin, 0) / data.length
                      : 0
                    } />
                  </td>
                  <td className="text-right py-3 px-2 text-muted-foreground">
                    {data.length > 0
                      ? Math.round(data.reduce((sum, d) => sum + d.employeeCount, 0) / data.length)
                      : 0}名
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
