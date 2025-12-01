import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ui/theme-provider'

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
        <ThemeProvider defaultTheme="dark" storageKey="arari-pro-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
