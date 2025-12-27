'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { EmployeeUploader } from '@/components/upload/EmployeeUploader'
import { FileUploader } from '@/components/upload/FileUploader'
import { FolderSync } from '@/components/upload/FolderSync'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Button } from '@/components/ui/button'

export default function UploadPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen message="認証情報を確認中..." />
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="md:pl-[280px] pt-16 transition-all duration-300">
          <div className="container py-6 px-4 md:px-6 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6">
                <ShieldAlert className="h-10 w-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
                アクセス権限がありません
              </h2>
              <p className="text-muted-foreground max-w-md mb-6">
                このページは管理者専用です。アップロード機能を使用するには管理者アカウントでログインしてください。
              </p>
              <Button onClick={() => router.push('/')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ダッシュボードに戻る
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:pl-[280px] pt-16 transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              給与明細アップロード
            </h1>
            <p className="text-muted-foreground mt-1">
              給与データをインポートして粗利を自動計算
            </p>
          </motion.div>

          <div className="space-y-6">
            <EmployeeUploader />
            <FolderSync />
            <FileUploader />
          </div>
        </div>
      </main>
    </div>
  )
}
