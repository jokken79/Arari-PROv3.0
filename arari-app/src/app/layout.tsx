import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { ToastProvider } from '@/components/ui/toast-provider'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthGuard } from '@/components/auth/AuthGuard'

export const metadata: Metadata = {
  title: '粗利 PRO v2.0 - 利益管理システム',
  description: '派遣社員の粗利分析・管理システム。社会保険、有給休暇を含めた正確な利益計算。',
  keywords: ['粗利', '派遣', '利益管理', '給与計算', '社会保険'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          メインコンテンツへスキップ
        </a>
        <ThemeProvider defaultTheme="dark" storageKey="arari-pro-theme">
          <QueryProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
            <ToastProvider />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
