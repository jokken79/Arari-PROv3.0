'use client'

import { motion } from 'framer-motion'
import {
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Target,
} from 'lucide-react'

interface AlertsSummary {
  criticalCount: number
  underTargetCount: number
  negativeProfit: number
  lowRateRatio: number
}

interface DashboardAlertsProps {
  alertsSummary: AlertsSummary
  onAlertClick: (alertType: 'negative' | 'critical' | 'underTarget' | 'lowRate') => void
}

export function DashboardAlerts({ alertsSummary, onAlertClick }: DashboardAlertsProps) {
  const hasAlerts =
    alertsSummary.criticalCount > 0 ||
    alertsSummary.negativeProfit > 0 ||
    alertsSummary.underTargetCount > 0

  if (!hasAlerts) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-slate-800/30 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500/80" aria-hidden="true" />
        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">アラート通知</span>
        <span className="text-xs text-muted-foreground">（クリックで詳細表示）</span>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {alertsSummary.negativeProfit > 0 && (
          <button
            onClick={() => onAlertClick('negative')}
            className="flex items-center gap-2 text-sm hover:bg-red-500/20 p-2 rounded-lg transition-colors cursor-pointer text-left"
          >
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
            <span className="text-red-600 dark:text-red-400">赤字: {alertsSummary.negativeProfit}名</span>
          </button>
        )}
        {alertsSummary.criticalCount > 0 && (
          <button
            onClick={() => onAlertClick('critical')}
            className="flex items-center gap-2 text-sm hover:bg-orange-500/20 p-2 rounded-lg transition-colors cursor-pointer text-left"
          >
            <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400">マージン&lt;7%: {alertsSummary.criticalCount}名</span>
          </button>
        )}
        {alertsSummary.underTargetCount > 0 && (
          <button
            onClick={() => onAlertClick('underTarget')}
            className="flex items-center gap-2 text-sm hover:bg-amber-500/20 p-2 rounded-lg transition-colors cursor-pointer text-left"
          >
            <Target className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400">目標未達(7-12%): {alertsSummary.underTargetCount}名</span>
          </button>
        )}
        {alertsSummary.lowRateRatio > 0 && (
          <button
            onClick={() => onAlertClick('lowRate')}
            className="flex items-center gap-2 text-sm hover:bg-orange-500/20 p-2 rounded-lg transition-colors cursor-pointer text-left"
          >
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400">単価率&lt;20%: {alertsSummary.lowRateRatio}名</span>
          </button>
        )}
      </div>
    </motion.div>
  )
}
