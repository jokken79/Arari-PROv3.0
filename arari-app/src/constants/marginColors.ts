/**
 * Centralized Margin Color System
 *
 * Business Rule: Manufacturing dispatch target margin is 12% with 4-tier system
 * - <7%: RED (#ef4444) - Critical
 * - 7-10%: ORANGE (#f97316) - Needs Improvement
 * - 10-12%: GREEN (#22c55e) - Good
 * - ≥12%: EMERALD (#10b981) - Excellent/Target Achieved
 *
 * DO NOT CHANGE THESE VALUES unless explicitly requested by business
 */

export const MARGIN_THRESHOLDS = {
  CRITICAL_MAX: 7,
  WARNING_MAX: 10,
  GOOD_MAX: 12,
  TARGET: 12,
} as const

export const MARGIN_COLORS = {
  critical: { bg: 'bg-red-500', text: 'text-red-500', hex: '#ef4444' },
  warning: { bg: 'bg-orange-500', text: 'text-orange-500', hex: '#f97316' },
  good: { bg: 'bg-green-500', text: 'text-green-500', hex: '#22c55e' },
  excellent: { bg: 'bg-emerald-500', text: 'text-emerald-500', hex: '#10b981' },
} as const

export type MarginTier = 'critical' | 'warning' | 'good' | 'excellent'

/**
 * Get the tier classification for a given margin percentage
 */
export function getMarginTier(margin: number): MarginTier {
  if (margin < MARGIN_THRESHOLDS.CRITICAL_MAX) return 'critical'
  if (margin < MARGIN_THRESHOLDS.WARNING_MAX) return 'warning'
  if (margin < MARGIN_THRESHOLDS.GOOD_MAX) return 'good'
  return 'excellent'
}

/**
 * Get hex color for a given margin percentage
 */
export function getMarginColor(margin: number): string {
  const tier = getMarginTier(margin)
  return MARGIN_COLORS[tier].hex
}

/**
 * Get Tailwind background class for a given margin percentage
 */
export function getMarginBgClass(margin: number): string {
  const tier = getMarginTier(margin)
  return MARGIN_COLORS[tier].bg
}

/**
 * Get Tailwind text color class for a given margin percentage
 */
export function getMarginTextClass(margin: number): string {
  const tier = getMarginTier(margin)
  return MARGIN_COLORS[tier].text
}

/**
 * Get human-readable label for a margin tier
 */
export function getMarginTierLabel(tier: MarginTier): string {
  switch (tier) {
    case 'critical':
      return '要改善'
    case 'warning':
      return '注意'
    case 'good':
      return '良好'
    case 'excellent':
      return '目標達成'
  }
}
