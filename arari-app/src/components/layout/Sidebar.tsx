'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { mainNavigation, adminNavigation } from './navigation-config'
import { AnimatedNavItem, SidebarNavItem } from './SidebarNavItem'
import { SidebarStats, type ProfitStats } from './SidebarStats'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    }
    return false
  })
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    const fetchProfitStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/statistics`)
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
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-black/5 dark:border-white/10 glass bg-white/70 dark:bg-black/40 backdrop-blur-xl',
          'hidden md:flex flex-col',
        )}
      >
        <div className="flex flex-1 flex-col gap-2 p-4">
          {/* Navigation Items */}
          <nav className="flex flex-1 flex-col gap-1" aria-label="メインナビゲーション">
            {mainNavigation.map((item, index) => (
              <AnimatedNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                index={index}
                variant="main"
              />
            ))}

            {/* Stats Card */}
            <SidebarStats
              collapsed={collapsed}
              profitStats={profitStats}
              isLoading={isLoadingStats}
            />
          </nav>

          {/* Bottom Navigation - Admin Only */}
          <div className="border-t border-border pt-4 mt-auto">
            {isAdmin &&
              adminNavigation.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  variant="admin"
                />
              ))}

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
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
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-72 border-r border-border bg-background p-4 md:hidden"
            >
              <nav className="flex flex-col gap-1 h-full">
                {mainNavigation.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={false}
                    variant="main"
                    onMobileClick={onClose}
                  />
                ))}

                {/* Admin-only navigation for mobile */}
                {isAdmin && (
                  <div className="border-t border-border pt-4 mt-auto">
                    {adminNavigation.map((item) => (
                      <SidebarNavItem
                        key={item.href}
                        item={item}
                        collapsed={false}
                        variant="admin"
                        onMobileClick={onClose}
                      />
                    ))}
                  </div>
                )}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}
