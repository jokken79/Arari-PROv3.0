'use client'

import { motion } from 'framer-motion'
import { LucideIcon, FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-4">
          {description}
        </p>
      )}
      {action}
    </motion.div>
  )
}

// Preset empty states for common use cases
export function NoDataEmptyState({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      title="データがありません"
      description="表示するデータがまだありません"
      action={action}
    />
  )
}

export function NoEmployeesEmptyState({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      title="従業員がいません"
      description="従業員データをアップロードしてください"
      action={action}
    />
  )
}

export function NoPayrollEmptyState({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      title="給与明細がありません"
      description="給与明細Excelをアップロードしてください"
      action={action}
    />
  )
}

export function SearchEmptyState({ query }: { query?: string }) {
  return (
    <EmptyState
      title="検索結果がありません"
      description={query ? `「${query}」に一致する結果はありません` : '検索条件に一致する結果がありません'}
    />
  )
}

export function ErrorEmptyState({
  message,
  onRetry
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      title="エラーが発生しました"
      description={message || 'データの取得に失敗しました'}
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            もう一度試す
          </button>
        )
      }
    />
  )
}
