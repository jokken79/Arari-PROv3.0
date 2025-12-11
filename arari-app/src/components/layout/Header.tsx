'use client'

import { motion } from 'framer-motion'
import { Moon, Sun, TrendingUp, Bell, Settings, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/ui/theme-provider'
import { useAppStore } from '@/store/appStore'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { payrollRecords } = useAppStore()

  // Count unread/pending notifications - 0 if no payroll records
  const notificationCount = payrollRecords.length > 0 ? 0 : 0

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <TooltipProvider>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border glass"
      >
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left side - Logo & Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </Button>

            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="relative">
                <img
                  src="/logo-uns-corto-negro.png"
                  alt="UNS Logo"
                  className="h-10 w-auto dark:invert"
                />
              </div>

              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gradient">
                  粗利 PRO
                </h1>
                <p className="text-xs text-muted-foreground">
                  利益管理システム v2.0
                </p>
              </div>
            </motion.div>
          </div>

          {/* Center - Date Display */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border">
            <span className="text-sm text-muted-foreground">現在</span>
            <span className="text-sm font-medium text-foreground">
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </span>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label={notificationCount > 0 ? `${notificationCount}件の通知` : '通知なし'}
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold shadow-lg shadow-red-500/50" aria-hidden="true">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {notificationCount > 0 ? `${notificationCount}件の通知` : '通知なし'}
              </TooltipContent>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label={resolvedTheme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: resolvedTheme === 'dark' ? 0 : 180 }}
                    transition={{ duration: 0.3, type: 'spring' }}
                  >
                    {resolvedTheme === 'dark' ? (
                      <Moon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Sun className="h-5 w-5" aria-hidden="true" />
                    )}
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {resolvedTheme === 'dark' ? 'ライトモード' : 'ダークモード'}
              </TooltipContent>
            </Tooltip>

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="設定を開く"
                >
                  <Settings className="h-5 w-5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>設定</TooltipContent>
            </Tooltip>

            {/* User */}
            <div className="hidden md:flex items-center gap-3 pl-3 ml-2 border-l border-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 shadow-md shadow-primary/20">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-foreground">管理者</p>
                <p className="text-xs text-muted-foreground">admin@arari.jp</p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>
    </TooltipProvider>
  )
}

