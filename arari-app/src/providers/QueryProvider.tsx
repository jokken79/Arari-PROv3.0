'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // データのキャッシュ時間（5分）
            staleTime: 5 * 60 * 1000,
            // バックグラウンドでの自動リフェッチを有効化
            refetchOnWindowFocus: true,
            // コンポーネントマウント時のリフェッチを無効化（不要なリクエスト削減）
            refetchOnMount: false,
            // リトライ回数を3回に設定（Railway cold start対策）
            retry: 3,
            // リトライ間隔を指数バックオフで設定（1秒、2秒、4秒）
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
          },
          mutations: {
            // ミューテーション失敗時のリトライなし
            retry: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
