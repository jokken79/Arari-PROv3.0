'use client'

import { cn } from '@/lib/utils'
import { formatYen } from '@/lib/utils'

interface TooltipRow {
  label: string
  value: string | number
  color?: string
  isCurrency?: boolean
  isPercent?: boolean
}

interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  title?: string
  subtitle?: string
  rows?: TooltipRow[]
  children?: React.ReactNode
}

/**
 * Shared Chart Tooltip Component
 * Provides consistent styling across all Recharts visualizations
 *
 * Usage:
 * <Tooltip content={<ChartTooltip title="従業員" rows={[...]} />} />
 *
 * Or with custom content:
 * <ChartTooltip active={active} payload={payload}>
 *   <CustomContent />
 * </ChartTooltip>
 */
export function ChartTooltip({
  active,
  payload,
  title,
  subtitle,
  rows,
  children,
}: ChartTooltipProps) {
  if (!active || (!payload?.length && !children)) {
    return null
  }

  const data = payload?.[0]?.payload

  return (
    <div
      className="rounded-lg border border-border bg-background/95 backdrop-blur-sm p-4 shadow-xl min-w-[200px]"
      role="tooltip"
    >
      {/* Title */}
      {(title || data?.name) && (
        <p className="font-semibold mb-1 text-base text-foreground">
          {title || data?.name}
        </p>
      )}

      {/* Subtitle */}
      {(subtitle || data?.company) && (
        <p className="text-xs text-muted-foreground mb-3">
          {subtitle || data?.company}
        </p>
      )}

      {/* Custom Children */}
      {children}

      {/* Rows */}
      {rows && rows.length > 0 && (
        <div className="space-y-2 text-sm">
          {rows.map((row, index) => (
            <div key={index} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{row.label}:</span>
              <span
                className={cn(
                  'font-medium',
                  row.color || 'text-foreground'
                )}
              >
                {row.isCurrency
                  ? formatYen(Number(row.value))
                  : row.isPercent
                    ? `${Number(row.value).toFixed(1)}%`
                    : row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to get margin color based on percentage
 * Uses 製造派遣 (manufacturing dispatch) standards: target 15%
 * Thresholds: >15% (gold), 12-15% (blue), 10-12% (green), 7-10% (orange), <7% (red)
 */
export function getMarginColor(margin: number): string {
  if (margin >= 15) return 'text-amber-500'   // Gold - target achieved
  if (margin >= 12) return 'text-blue-500'    // Blue - close to target
  if (margin >= 10) return 'text-green-500'   // Green - improvement needed
  if (margin >= 7) return 'text-orange-500'   // Orange - warning
  return 'text-red-500'                       // Red - critical
}

/**
 * Helper function to get profit color
 */
export function getProfitColor(profit: number): string {
  return profit >= 0 ? 'text-emerald-500' : 'text-red-500'
}

/**
 * Pre-built tooltip for employee ranking charts
 */
export function EmployeeTooltipContent({ payload }: { payload?: any[] }) {
  if (!payload?.length) return null

  const data = payload[0].payload
  const isPositive = data.profit >= 0

  return (
    <ChartTooltip
      active={true}
      payload={payload}
      title={data.name}
      subtitle={data.company}
      rows={[
        {
          label: '粗利',
          value: data.profit,
          isCurrency: true,
          color: getProfitColor(data.profit),
        },
        {
          label: 'マージン率',
          value: data.margin,
          isPercent: true,
          color: getMarginColor(data.margin),
        },
        {
          label: '売上',
          value: data.revenue,
          isCurrency: true,
          color: 'text-blue-400',
        },
        {
          label: 'コスト',
          value: data.cost,
          isCurrency: true,
          color: 'text-orange-400',
        },
      ]}
    />
  )
}

/**
 * Pre-built tooltip for monthly trend charts
 */
export function MonthlyTrendTooltipContent({ payload }: { payload?: any[] }) {
  if (!payload?.length) return null

  const data = payload[0].payload

  return (
    <ChartTooltip
      active={true}
      payload={payload}
      title={data.period || data.name}
      rows={[
        {
          label: '粗利',
          value: data.profit,
          isCurrency: true,
          color: getProfitColor(data.profit),
        },
        {
          label: '売上',
          value: data.revenue,
          isCurrency: true,
          color: 'text-blue-400',
        },
        {
          label: 'コスト',
          value: data.cost,
          isCurrency: true,
          color: 'text-orange-400',
        },
        ...(data.margin !== undefined
          ? [
              {
                label: 'マージン率',
                value: data.margin,
                isPercent: true,
                color: getMarginColor(data.margin),
              },
            ]
          : []),
      ]}
    />
  )
}

/**
 * Pre-built tooltip for factory comparison charts
 */
export function FactoryTooltipContent({ payload }: { payload?: any[] }) {
  if (!payload?.length) return null

  const data = payload[0].payload

  return (
    <ChartTooltip
      active={true}
      payload={payload}
      title={data.name || data.factory}
      rows={[
        {
          label: '従業員数',
          value: `${data.employeeCount || data.count || 0}名`,
        },
        {
          label: '売上',
          value: data.revenue,
          isCurrency: true,
          color: 'text-blue-400',
        },
        {
          label: 'コスト',
          value: data.cost,
          isCurrency: true,
          color: 'text-orange-400',
        },
        {
          label: '粗利',
          value: data.profit,
          isCurrency: true,
          color: getProfitColor(data.profit),
        },
        {
          label: 'マージン率',
          value: data.margin,
          isPercent: true,
          color: getMarginColor(data.margin),
        },
      ]}
    />
  )
}
