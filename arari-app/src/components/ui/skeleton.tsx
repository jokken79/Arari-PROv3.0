import { cn } from '@/lib/utils'
import { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className
      )}
      style={style}
    />
  )
}

// Skeleton for stats cards on dashboard
export function StatsCardSkeleton() {
  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

// Skeleton for dashboard stats grid
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Skeleton for employee table rows
export function EmployeeTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg bg-muted/20"
        >
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      ))}
    </div>
  )
}

// Skeleton for chart containers
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className={`w-full rounded-lg`} style={{ height }} />
    </div>
  )
}

// Skeleton for dashboard charts section
export function DashboardChartsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ChartSkeleton height={250} />
      <ChartSkeleton height={250} />
      <ChartSkeleton height={250} />
    </div>
  )
}

// Skeleton for full dashboard
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <DashboardStatsSkeleton />
      <DashboardChartsSkeleton />
    </div>
  )
}

// Skeleton for payroll modal
export function PayrollModalSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((col) => (
        <div key={col} className="space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Skeleton for single card content
export function CardContentSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  )
}
