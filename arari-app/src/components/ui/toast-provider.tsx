'use client'

import { Toaster } from 'react-hot-toast'

/**
 * Toast Provider Component
 * Provides toast notifications throughout the application
 *
 * Usage:
 * import toast from 'react-hot-toast'
 *
 * // Success
 * toast.success('保存しました')
 *
 * // Error
 * toast.error('エラーが発生しました')
 *
 * // Loading
 * toast.loading('処理中...')
 *
 * // Custom
 * toast('カスタムメッセージ', { icon: '👋' })
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerStyle={{
        top: 80, // Below header
      }}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },

        // Success toast
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
          style: {
            background: 'hsl(var(--background))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          },
        },

        // Error toast
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            background: 'hsl(var(--background))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          },
        },

        // Loading toast
        loading: {
          iconTheme: {
            primary: 'hsl(var(--primary))',
            secondary: 'hsl(var(--background))',
          },
        },
      }}
    />
  )
}

/**
 * Toast helper functions with Japanese messages
 */
export const toastMessages = {
  // Success messages
  saved: () => '保存しました',
  deleted: () => '削除しました',
  uploaded: (count: number) => `${count}件のファイルをアップロードしました`,
  updated: () => '更新しました',

  // Error messages
  saveFailed: () => '保存に失敗しました',
  deleteFailed: () => '削除に失敗しました',
  uploadFailed: () => 'アップロードに失敗しました',
  loadFailed: () => 'データの読み込みに失敗しました',
  networkError: () => 'ネットワークエラーが発生しました',
  serverError: () => 'サーバーエラーが発生しました',

  // Info messages
  loading: () => '読み込み中...',
  processing: () => '処理中...',
  noData: () => 'データがありません',
}
