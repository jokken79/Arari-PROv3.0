'use client'

import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { formatYen } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface EmployeeRanking {
  employeeId: string
  name: string
  company: string
  profit: number
  margin: number
  revenue: number
  cost: number
  hourlyRate: number
  billingRate: number
  rateGap: number
  rateRatio: number
  isUnderTarget: boolean
  isCritical: boolean
}

interface EmployeeRankingTableProps {
  employees: EmployeeRanking[]
  targetMargin: number
  onEmployeeClick?: (employeeId: string) => void
}

export function EmployeeRankingTable({
  employees,
  targetMargin,
  onEmployeeClick,
}: EmployeeRankingTableProps) {
  if (employees.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mb-6"
    >
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-sm overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            従業員別収益分析（全{employees.length}名）
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            単価率 = (請求単価 - 時給) / 時給 × 100 | 目標マージン: {targetMargin}%
          </p>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900/95 backdrop-blur-sm">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="text-left p-2 sm:p-3 text-muted-foreground font-medium">#</th>
                <th className="text-left p-2 sm:p-3 text-muted-foreground font-medium">氏名</th>
                <th className="text-left p-2 sm:p-3 text-muted-foreground font-medium">派遣先</th>
                <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">時給</th>
                <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">単価</th>
                <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">単価率</th>
                <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">粗利</th>
                <th className="text-right p-2 sm:p-3 text-muted-foreground font-medium">マージン</th>
                <th className="text-center p-2 sm:p-3 text-muted-foreground font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr
                  key={emp.employeeId}
                  className={cn(
                    "border-b border-white/5 transition-colors",
                    onEmployeeClick && "hover:bg-white/5 cursor-pointer",
                    emp.profit < 0 && "bg-red-500/10",
                    emp.isCritical && emp.profit >= 0 && "bg-orange-500/5"
                  )}
                  onClick={() => onEmployeeClick?.(emp.employeeId)}
                >
                  <td className="p-2 sm:p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-2 sm:p-3 font-medium text-slate-200">{emp.name}</td>
                  <td className="p-2 sm:p-3 text-muted-foreground">{emp.company}</td>
                  <td className="p-2 sm:p-3 text-right font-mono">¥{emp.hourlyRate.toLocaleString()}</td>
                  <td className="p-2 sm:p-3 text-right font-mono">¥{emp.billingRate.toLocaleString()}</td>
                  <td className={cn(
                    "p-2 sm:p-3 text-right font-mono",
                    emp.rateRatio >= 30 ? "text-amber-400" :
                    emp.rateRatio >= 20 ? "text-green-400" :
                    emp.rateRatio >= 10 ? "text-blue-400" : "text-red-400"
                  )}>
                    {emp.rateRatio.toFixed(1)}%
                  </td>
                  <td className={cn(
                    "p-2 sm:p-3 text-right font-mono font-semibold",
                    emp.profit >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatYen(emp.profit)}
                  </td>
                  <td className={cn(
                    "p-2 sm:p-3 text-right font-mono",
                    emp.margin >= 12 ? "text-emerald-400" :
                    emp.margin >= 10 ? "text-green-400" :
                    emp.margin >= 7 ? "text-orange-400" : "text-red-400"
                  )}>
                    {emp.margin.toFixed(1)}%
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    {emp.profit < 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">赤字</span>
                    ) : emp.isCritical ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">要注意</span>
                    ) : emp.isUnderTarget ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">目標近い</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">目標達成</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
