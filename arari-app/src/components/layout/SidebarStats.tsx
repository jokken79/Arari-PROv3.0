'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProfitStats {
  currentProfit: number
  previousProfit: number
  changePercent: number
  period: string
}

interface SidebarStatsProps {
  collapsed: boolean
  profitStats: ProfitStats | null
  isLoading: boolean
}

export function SidebarStats({ collapsed, profitStats, isLoading }: SidebarStatsProps) {
  if (collapsed) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 overflow-hidden"
      >
        <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4 border border-black/5 dark:border-white/10 relative overflow-hidden group hover:border-neon-purple/30 transition-colors">
          <div className="absolute inset-0 bg-neon-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center gap-2 mb-3 relative">
            {profitStats && profitStats.changePercent >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm font-medium text-foreground">
              {profitStats?.period ? `${profitStats.period}の粗利` : '最新月の粗利'}
            </span>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">読込中...</span>
            </div>
          ) : profitStats ? (
            <>
              <p
                className={cn(
                  'text-2xl font-bold tracking-tight',
                  profitStats.currentProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                ¥{profitStats.currentProfit.toLocaleString()}
              </p>
              {profitStats.previousProfit > 0 && (
                <p
                  className={cn(
                    'text-xs mt-1',
                    profitStats.changePercent >= 0
                      ? 'text-emerald-500/80'
                      : 'text-red-500/80',
                  )}
                >
                  前月比 {profitStats.changePercent >= 0 ? '+' : ''}
                  {profitStats.changePercent.toFixed(1)}%
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">サーバー接続待ち</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
