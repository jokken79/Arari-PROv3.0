'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Download,
  FileSpreadsheet,
  FilePieChart,
  FileBarChart,
  Calendar,
  Users,
  Building2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/appStore'

// API base URL - FastAPI backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const reports = [
  {
    id: 'monthly-profit',
    title: '月次粗利レポート',
    description: '月別の粗利詳細と従業員別内訳',
    icon: FileBarChart,
    format: 'Excel',
    category: '粗利分析',
  },
  {
    id: 'employee-detail',
    title: '従業員別詳細レポート',
    description: '各従業員の給与・コスト・粗利の詳細',
    icon: Users,
    format: 'Excel',
    category: '従業員分析',
  },
  {
    id: 'company-analysis',
    title: '派遣先別分析レポート',
    description: '取引先ごとの収益性分析',
    icon: Building2,
    format: 'Excel',
    category: '企業分析',
  },
  {
    id: 'cost-breakdown',
    title: 'コスト内訳レポート',
    description: '社会保険・有給・通勤費の詳細内訳',
    icon: FilePieChart,
    format: 'PDF',
    category: 'コスト分析',
  },
  {
    id: 'period-comparison',
    title: '期間比較レポート',
    description: '任意の2期間の比較分析',
    icon: Calendar,
    format: 'PDF',
    category: '比較分析',
  },
  {
    id: 'summary-report',
    title: '経営サマリーレポート',
    description: '経営層向けの概要レポート',
    icon: FileText,
    format: 'PDF',
    category: 'サマリー',
  },
]

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<{success?: boolean, message?: string} | null>(null)
  const { availablePeriods, selectedPeriod } = useAppStore()

  const handleGenerate = async (reportId: string) => {
    setGenerating(reportId)
    setDownloadStatus(null)

    try {
      // Map report IDs to API report types
      const reportTypeMap: Record<string, string> = {
        'monthly-profit': 'monthly',
        'employee-detail': 'employee',
        'company-analysis': 'company',
        'cost-breakdown': 'monthly',  // Uses monthly data with cost focus
        'period-comparison': 'monthly',
        'summary-report': 'monthly',
      }

      const reportType = reportTypeMap[reportId] || 'monthly'
      const period = selectedPeriod || availablePeriods[0]

      if (!period) {
        setDownloadStatus({ success: false, message: 'データがありません。給与明細をアップロードしてください。' })
        setGenerating(null)
        return
      }

      // Build API URL
      let url = `${API_URL}/api/reports/download/${reportType}?format=excel`
      if (reportType === 'monthly') {
        url += `&period=${encodeURIComponent(period)}`
      }

      // Fetch the report
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`レポート生成に失敗しました: ${response.status}`)
      }

      // Get the blob and trigger download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // Extract filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `report_${reportId}_${new Date().toISOString().split('T')[0]}.xlsx`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      setDownloadStatus({ success: true, message: 'レポートをダウンロードしました' })
    } catch (error) {
      console.error('Report generation error:', error)
      setDownloadStatus({
        success: false,
        message: error instanceof Error ? error.message : 'レポート生成に失敗しました'
      })
    } finally {
      setGenerating(null)
    }
  }

  const handleExportAll = async () => {
    setGenerating('export-all')
    setDownloadStatus(null)

    try {
      const response = await fetch(`${API_URL}/api/export/all?format=excel`)

      if (!response.ok) {
        throw new Error(`エクスポートに失敗しました: ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `arari_pro_export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      setDownloadStatus({ success: true, message: '全データをエクスポートしました' })
    } catch (error) {
      console.error('Export error:', error)
      setDownloadStatus({
        success: false,
        message: error instanceof Error ? error.message : 'エクスポートに失敗しました'
      })
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:pl-[280px] transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              詳細レポート
            </h1>
            <p className="text-muted-foreground mt-1">
              各種分析レポートの出力
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report, index) => {
              const Icon = report.icon
              const isGenerating = generating === report.id

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant="secondary">{report.format}</Badge>
                      </div>
                      <CardTitle className="mt-4">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{report.category}</Badge>
                        <Button
                          onClick={() => handleGenerate(report.id)}
                          disabled={isGenerating}
                          size="sm"
                          aria-label={`${report.title}をダウンロード`}
                        >
                          {isGenerating ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              ダウンロード
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Quick Export Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-primary/20">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <FileSpreadsheet className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">全データ一括エクスポート</h3>
                      <p className="text-sm text-muted-foreground">
                        すべての従業員データと給与明細をExcelファイルで出力
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={handleExportAll}
                    disabled={generating === 'export-all'}
                    aria-label="全データをエクスポート"
                  >
                    {generating === 'export-all' ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        エクスポート中...
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5 mr-2" />
                        全データをエクスポート
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Download Status Message */}
          {downloadStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <div
                className={`flex items-center gap-3 p-4 rounded-lg ${
                  downloadStatus.success
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}
              >
                {downloadStatus.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span>{downloadStatus.message}</span>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
