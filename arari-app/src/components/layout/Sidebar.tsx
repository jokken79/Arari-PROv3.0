'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Building2,
  Upload,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navigation = [
  {
    name: 'ダッシュボード',
    href: '/',
    icon: LayoutDashboard,
    description: '概要と統計',
  },
  {
    name: '従業員一覧',
    href: '/employees',
    icon: Users,
    description: '派遣社員管理',
  },
  {
    name: '派遣先企業',
    href: '/companies',
    icon: Building2,
    description: '取引先別分析',
  },
  {
    name: '月次分析',
    href: '/monthly',
    icon: Calendar,
    description: '月別比較',
  },
  {
    name: '給与明細アップロード',
    href: '/upload',
    icon: Upload,
    description: 'データ取込',
  },
  {
    name: '給与明細データ',
    href: '/payroll',
    icon: BarChart3,
    description: 'データ検証',
  },
  {
    name: '詳細レポート',
    href: '/reports',
    icon: FileText,
    description: '帳票出力',
  },
]

const bottomNavigation = [
  {
    name: '設定',
    href: '/settings',
    icon: Settings,
  },
  {
    name: 'ヘルプ',
    href: '/help',
    icon: HelpCircle,
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

interface ProfitStats {
  currentProfit: number
  previousProfit: number
  changePercent: number
  period: string
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    const fetchProfitStats = async () => {
      try {
        const response = await fetch('/api/statistics')
        if (response.ok) {
          const data = await response.json()

          // Get the latest two periods from profit_trend to calculate change
          const profitTrend = data.profit_trend || []
          if (profitTrend.length >= 1) {
            const current = profitTrend[profitTrend.length - 1]
            const previous = profitTrend.length >= 2 ? profitTrend[profitTrend.length - 2] : null

            const currentProfit = current?.profit || 0
            const previousProfit = previous?.profit || 0
            const changePercent = previousProfit > 0
              ? ((currentProfit - previousProfit) / previousProfit) * 100
              : 0

            setProfitStats({
              currentProfit,
              previousProfit,
              changePercent,
              period: current?.period || ''
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch profit stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchProfitStats()
  }, [])

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-background/80 backdrop-blur-xl',
          'hidden md:flex flex-col',
        )}
      >
        <div className="flex flex-1 flex-col gap-2 p-4">
          {/* Navigation Items */}
          <nav className="flex flex-1 flex-col gap-1">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Tooltip delayDuration={collapsed ? 0 : 1000}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 shrink-0 transition-transform duration-200',
                            !isActive && 'group-hover:scale-110',
                          )}
                        />
                        <AnimatePresence mode="wait">
                          {!collapsed && (
                            <motion.div
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="flex flex-col overflow-hidden"
                            >
                              <span className="whitespace-nowrap">{item.name}</span>
                              {!isActive && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {item.description}
                                </span>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {isActive && !collapsed && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="ml-auto h-2 w-2 rounded-full bg-white"
                          />
                        )}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </motion.div>
              )
            })}

            {/* Stats Card (collapsed = hidden) */}
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-4 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      {profitStats && profitStats.changePercent >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {profitStats?.period ? `${profitStats.period}の粗利` : '今月の粗利'}
                      </span>
                    </div>
                    {isLoadingStats ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">読込中...</span>
                      </div>
                    ) : profitStats ? (
                      <>
                        <p className={cn(
                          "text-2xl font-bold",
                          profitStats.currentProfit >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                          ¥{profitStats.currentProfit.toLocaleString()}
                        </p>
                        {profitStats.previousProfit > 0 && (
                          <p className={cn(
                            "text-xs mt-1",
                            profitStats.changePercent >= 0 ? "text-emerald-600" : "text-red-500"
                          )}>
                            前月比 {profitStats.changePercent >= 0 ? '+' : ''}{profitStats.changePercent.toFixed(1)}%
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">データなし</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>

          {/* Bottom Navigation */}
          <div className="border-t pt-4 mt-auto">
            {bottomNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Tooltip key={item.href} delayDuration={collapsed ? 0 : 1000}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  )}
                </Tooltip>
              )
            })}

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 justify-center"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>折りたたむ</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-72 border-r bg-background p-4 md:hidden"
            >
              <nav className="flex flex-col gap-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}
