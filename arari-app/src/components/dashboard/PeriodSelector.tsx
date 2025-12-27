'use client'

import { useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { sortPeriodsDescending } from '@/lib/utils'

interface PeriodSelectorProps {
  periods: string[]
  selectedPeriod: string | null
  onPeriodChange: (period: string) => void
  className?: string
  showNavigation?: boolean
  /** Show keyboard shortcut hints */
  showKeyboardHints?: boolean
}

/**
 * Period selector with navigation controls
 *
 * Features:
 * - Chronological sorting (newest first)
 * - Previous/Next navigation
 * - Latest period badge
 * - Keyboard shortcuts (Arrow Left/Right)
 * - Responsive design
 *
 * @example
 * <PeriodSelector
 *   periods={['2025年1月', '2025年2月']}
 *   selectedPeriod="2025年2月"
 *   onPeriodChange={setPeriod}
 * />
 */
export function PeriodSelector({
  periods,
  selectedPeriod,
  onPeriodChange,
  className,
  showNavigation = true,
  showKeyboardHints = false,
}: PeriodSelectorProps) {
  // Sort periods chronologically (newest first)
  const sortedPeriods = useMemo(() => {
    return sortPeriodsDescending(periods)
  }, [periods])

  // Find current index
  const currentIndex = sortedPeriods.findIndex(p => p === selectedPeriod)
  const isLatest = currentIndex === 0
  const canGoPrevious = currentIndex < sortedPeriods.length - 1
  const canGoNext = currentIndex > 0

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPeriodChange(sortedPeriods[currentIndex + 1])
    }
  }

  const handleNext = () => {
    if (canGoNext) {
      onPeriodChange(sortedPeriods[currentIndex - 1])
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no input/textarea is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      if (e.key === 'ArrowLeft' && canGoPrevious) {
        e.preventDefault()
        handlePrevious()
      }
      if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canGoPrevious, canGoNext, currentIndex])

  // Empty state
  if (periods.length === 0) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border/50">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            期間データなし
          </span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-center gap-3 flex-wrap", className)}
    >
      {/* Period Selector */}
      <div className="relative group">
        {/* Enhanced hover glow - starts at 40% opacity instead of 0 */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 rounded-xl blur-xl opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
          <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />

          <Select value={selectedPeriod || ''} onValueChange={onPeriodChange}>
            <SelectTrigger
              className="border-0 bg-transparent h-auto p-0 gap-2 font-medium text-base focus:ring-0 focus:ring-offset-0 min-w-[140px] shadow-none"
              aria-label="期間を選択"
            >
              <SelectValue placeholder="期間を選択" />
            </SelectTrigger>
            <SelectContent
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-black/10 dark:border-white/20 shadow-2xl"
              align="start"
              position="popper"
              sideOffset={8}
              collisionPadding={16}
            >
              {sortedPeriods.map((period, index) => (
                <SelectItem
                  key={period}
                  value={period}
                  className="cursor-pointer hover:bg-blue-500/10 focus:bg-blue-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="font-medium">{period}</span>
                    {index === 0 && (
                      <span className="ml-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs px-2 py-0 rounded-full">
                        最新
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Latest badge - enhanced shadow for better visibility */}
          {isLatest && (
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.4)] hidden sm:inline-flex">
              最新
            </span>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      {showNavigation && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={cn(
              "h-11 w-11 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              canGoPrevious
                ? "hover:bg-blue-500/10 hover:text-blue-500 dark:hover:bg-blue-500/20"
                : "opacity-40 cursor-not-allowed"
            )}
            aria-label="前の期間（古い月）"
            title={canGoPrevious ? "前の期間" : "これ以前の期間はありません"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={!canGoNext}
            className={cn(
              "h-11 w-11 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              canGoNext
                ? "hover:bg-blue-500/10 hover:text-blue-500 dark:hover:bg-blue-500/20"
                : "opacity-40 cursor-not-allowed"
            )}
            aria-label="次の期間（新しい月）"
            title={canGoNext ? "次の期間" : "これ以降の期間はありません"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Period Info - improved Japanese wording */}
      {selectedPeriod && sortedPeriods.length > 1 && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            全{sortedPeriods.length}期中 {currentIndex + 1}期目
          </span>
        </div>
      )}

      {/* Keyboard hints - optional */}
      {showKeyboardHints && sortedPeriods.length > 1 && (
        <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-2 py-1 rounded bg-muted border border-border">←</kbd>
          <kbd className="px-2 py-1 rounded bg-muted border border-border">→</kbd>
          <span>で切替</span>
        </div>
      )}

      {/* Screen reader live region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {selectedPeriod && `選択中の期間: ${selectedPeriod}`}
      </div>
    </motion.div>
  )
}
