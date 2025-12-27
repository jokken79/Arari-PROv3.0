'use client'

import { formatYen } from '@/lib/utils'

/**
 * Helper Components for PayrollSlipModal
 * Extracted for better code organization and reusability
 *
 * NOTE: Marked as 'use client' for consistency with Next.js 'output: export' mode.
 * This file contains pure presentation components without hooks or state.
 */

// DetailRow - Used in 支給の部 section
interface DetailRowProps {
  label: string
  subLabel?: string
  value?: number
  highlight?: 'amber' | 'orange' | 'purple' | 'rose' | 'green'
  badge?: string
  badgeColor?: string
}

export function DetailRow({
  label,
  subLabel,
  value,
  highlight,
  badge,
  badgeColor
}: DetailRowProps) {
  const colors = {
    amber: 'bg-amber-500/10 border-amber-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    rose: 'bg-rose-500/10 border-rose-500/20',
    green: 'bg-emerald-500/10 border-emerald-500/20',
  }

  return (
    <div className={`flex justify-between items-center p-2 rounded ${highlight ? colors[highlight] + ' border' : 'hover:bg-white/5 transition-colors'}`}>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">{label}</span>
          {badge && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${badgeColor || 'bg-slate-700/50 text-slate-400 border-slate-600/50'}`}>
              {badge}
            </span>
          )}
        </div>
        {subLabel && (
          <p className="text-[10px] text-slate-500">{subLabel}</p>
        )}
      </div>
      <span className="font-mono font-bold text-slate-200">
        {formatYen(value || 0)}
      </span>
    </div>
  )
}

// DeductionRow - Used in 控除の部 section
interface DeductionRowProps {
  label: string
  value?: number
}

export function DeductionRow({ label, value }: DeductionRowProps) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-red-400/70 group-hover:text-red-400 transition-colors">{label}</span>
      <span className="text-red-400 font-mono">
        -{formatYen(value || 0)}
      </span>
    </div>
  )
}

// BillingRow - Used in 請求金額計算 section
interface BillingRowProps {
  label: string
  hours?: number
  rate: number
  multiplier: number
  value: number
  color?: 'amber' | 'orange' | 'purple' | 'rose'
  isExtra?: boolean
}

export function BillingRow({
  label,
  hours,
  rate,
  multiplier,
  value,
  color,
  isExtra
}: BillingRowProps) {
  const formatHours = (h: number | undefined) => {
    if (!h) return '0:00'
    const hr = Math.floor(h)
    const m = Math.round((h - hr) * 60)
    return `${hr}:${m.toString().padStart(2, '0')}`
  }

  const colorClasses = {
    amber: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    rose: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  }

  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors px-1 -mx-1 rounded">
      <div className="flex items-center gap-2">
        <span className="text-slate-300">{label}</span>
        <span className="text-xs text-slate-500">({formatHours(hours)}h)</span>
        {multiplier !== 1 && (
          <span className={`px-1.5 py-0.5 text-xs rounded ${color ? colorClasses[color] : 'bg-white/10 text-slate-300 border border-white/10'}`}>
            {isExtra ? '+' : '×'}{multiplier}
          </span>
        )}
      </div>
      <span className="font-mono font-medium text-slate-200">
        {formatYen(value)}
      </span>
    </div>
  )
}

// Shared utility functions
export function formatHours(hours: number | undefined): string {
  if (!hours) return '0:00'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

// Margin color helper - used across columns
export interface MarginColors {
  text: string
  bg: string
  border: string
  light: string
}

export function getMarginColors(margin: number, targetMargin: number = 12): MarginColors {
  // 4-tier system: >12% (emerald), 10-12% (green), 7-10% (orange), <7% (red)
  if (margin >= targetMargin) {
    return {
      text: 'text-emerald-500',
      bg: 'bg-emerald-500',
      border: 'border-emerald-500',
      light: 'bg-emerald-50 dark:bg-emerald-900/20'
    }
  }
  if (margin >= 10) {
    return {
      text: 'text-green-500',
      bg: 'bg-green-500',
      border: 'border-green-500',
      light: 'bg-green-50 dark:bg-green-900/20'
    }
  }
  if (margin >= 7) {
    return {
      text: 'text-orange-500',
      bg: 'bg-orange-500',
      border: 'border-orange-500',
      light: 'bg-orange-50 dark:bg-orange-900/20'
    }
  }
  return {
    text: 'text-red-500',
    bg: 'bg-red-500',
    border: 'border-red-500',
    light: 'bg-red-50 dark:bg-red-900/20'
  }
}
