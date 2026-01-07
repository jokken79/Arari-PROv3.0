'use client'

import { useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
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
 * Refined period selector with elegant, minimal design
 *
 * Features:
 * - Clean inline layout with subtle borders
 * - Chronological sorting (newest first)
 * - Previous/Next navigation
 * - Integrated period counter
 * - Keyboard shortcuts (Arrow Left/Right)
 * - Professional Japanese business aesthetic
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

  const handlePrevious = useCallback(() => {
    if (canGoPrevious) {
      onPeriodChange(sortedPeriods[currentIndex + 1])
    }
  }, [canGoPrevious, onPeriodChange, sortedPeriods, currentIndex])

  const handleNext = useCallback(() => {
    if (canGoNext) {
      onPeriodChange(sortedPeriods[currentIndex - 1])
    }
  }, [canGoNext, onPeriodChange, sortedPeriods, currentIndex])

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
  }, [canGoPrevious, canGoNext, handlePrevious, handleNext])

  // Empty state
  if (periods.length === 0) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-muted/50 border border-border/60">
          <Calendar className="h-[18px] w-[18px] text-muted-foreground/70" />
          <span className="text-sm font-medium text-muted-foreground">
            期間データなし
          </span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn("inline-flex items-center gap-0", className)}
    >
      {/* Navigation: Previous (Left Arrow) */}
      {showNavigation && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className={cn(
            "h-10 w-10 rounded-r-none border-y border-l transition-all duration-200",
            canGoPrevious
              ? "hover:bg-[#0052CC]/5 hover:border-[#0052CC]/20 hover:text-[#0052CC] border-border/60"
              : "opacity-30 cursor-not-allowed border-border/40",
            "focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2"
          )}
          aria-label="前の期間（古い月）"
          title={canGoPrevious ? "前の期間" : "これ以前の期間はありません"}
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Button>
      )}

      {/* Period Selector - Clean inline design */}
      <div className="relative group">
        <div className={cn(
          "relative flex items-center gap-2.5 px-4 py-2.5 bg-background border-y transition-all duration-200",
          showNavigation ? "border-r-0" : "border rounded-lg",
          "hover:bg-muted/30 hover:border-border/80 border-border/60"
        )}>
          <Calendar className="h-[18px] w-[18px] text-[#0052CC]/70 flex-shrink-0" strokeWidth={2} />

          <Select value={selectedPeriod || ''} onValueChange={onPeriodChange}>
            <SelectTrigger
              className="border-0 bg-transparent h-auto p-0 gap-2.5 font-semibold text-[15px] tracking-tight focus:ring-0 focus:ring-offset-0 min-w-[120px] shadow-none hover:text-foreground/90"
              aria-label="期間を選択"
            >
              <SelectValue placeholder="期間を選択" />
            </SelectTrigger>
            <SelectContent
              className="bg-background border-border/60 shadow-lg min-w-[200px]"
              align="start"
              position="popper"
              sideOffset={4}
            >
              {sortedPeriods.map((period, index) => (
                <SelectItem
                  key={period}
                  value={period}
                  className="cursor-pointer hover:bg-[#0052CC]/5 focus:bg-[#0052CC]/5 transition-colors py-2.5"
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="font-semibold text-[15px] tracking-tight">{period}</span>
                    {index === 0 && (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide">
                        最新
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period counter - integrated inline */}
          {sortedPeriods.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 ml-1 pl-2.5 border-l border-border/50">
              <span className="text-[13px] font-medium text-muted-foreground/60 tracking-tight">
                {currentIndex + 1}
              </span>
              <span className="text-[11px] text-muted-foreground/40 font-medium">/</span>
              <span className="text-[13px] font-medium text-muted-foreground/60 tracking-tight">
                {sortedPeriods.length}
              </span>
            </div>
          )}

          {/* Latest indicator - subtle dot */}
          {isLatest && (
            <div className="hidden lg:flex items-center gap-1.5 ml-1 pl-2.5 border-l border-border/50">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-500 tracking-wide">
                LATEST
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation: Next (Right Arrow) */}
      {showNavigation && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={!canGoNext}
          className={cn(
            "h-10 w-10 rounded-l-none border-y border-r transition-all duration-200",
            canGoNext
              ? "hover:bg-[#0052CC]/5 hover:border-[#0052CC]/20 hover:text-[#0052CC] border-border/60"
              : "opacity-30 cursor-not-allowed border-border/40",
            "focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2"
          )}
          aria-label="次の期間（新しい月）"
          title={canGoNext ? "次の期間" : "これ以降の期間はありません"}
        >
          <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Button>
      )}

      {/* Keyboard hints - minimal design */}
      {showKeyboardHints && sortedPeriods.length > 1 && (
        <div className="hidden xl:flex items-center gap-1.5 ml-4 text-xs text-muted-foreground/50">
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/60 border border-border/50 min-w-[20px] text-center font-medium">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/60 border border-border/50 min-w-[20px] text-center font-medium">→</kbd>
        </div>
      )}

      {/* Screen reader live region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {selectedPeriod && `選択中の期間: ${selectedPeriod}`}
      </div>
    </motion.div>
  )
}
