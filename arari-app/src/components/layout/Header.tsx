'use client'

import { motion } from 'framer-motion'
import { Moon, Sun, TrendingUp, Bell, Settings, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/ui/theme-provider'
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

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <TooltipProvider>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl"
      >
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left side - Logo & Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <motion.div
                  className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>

              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  粗利 PRO
                </h1>
                <p className="text-xs text-muted-foreground">
                  利益管理システム v2.0
                </p>
              </div>
            </motion.div>
          </div>

          {/* Center - Date Display */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">現在</span>
            <span className="text-sm font-medium">
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
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                    3
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>通知</TooltipContent>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  <motion.div
                    initial={false}
                    animate={{ rotate: resolvedTheme === 'dark' ? 0 : 180 }}
                    transition={{ duration: 0.3, type: 'spring' }}
                  >
                    {resolvedTheme === 'dark' ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
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
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>設定</TooltipContent>
            </Tooltip>

            {/* User */}
            <div className="hidden md:flex items-center gap-3 pl-3 ml-2 border-l">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium">管理者</p>
                <p className="text-xs text-muted-foreground">admin@arari.jp</p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>
    </TooltipProvider>
  )
}
