'use client'

import { useState, useEffect, useMemo } from 'react'
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
  ChevronDown,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePayrollPeriods } from '@/hooks/usePayroll'
import { API_BASE_URL } from '@/lib/api'
import { sortPeriodsDescending } from '@/lib/utils'

// API base URL - FastAPI backend
const API_URL = API_BASE_URL

type ReportFormat = 'excel' | 'pdf'

interface Report {
  id: string
  title: string
  description: string
  icon: typeof FileBarChart
  formats: ReportFormat[]
  category: string
  recommended?: ReportFormat
}

const reports: Report[] = [
  {
    id: 'monthly-profit',
    title: '月次粗利レポート',
    description: '月別の粗利詳細と従業員別内訳',
    icon: FileBarChart,
    formats: ['excel', 'pdf'],
    category: '粗利分析',
  },
  {
    id: 'employee-detail',
    title: '従業員別詳細レポート',
    description: '全従業員の給与・コスト・粗利の詳細',
    icon: Users,
    formats: ['excel'],
    category: '従業員分析',
  },
  {
    id: 'company-analysis',
    title: '派遣先別分析レポート',
    description: '全派遣先の収益性分析',
    icon: Building2,
    formats: ['excel', 'pdf'],
    category: '企業分析',
  },
  {
    id: 'cost-breakdown',
    title: 'コスト内訳レポート',
    description: '社会保険・有給・通勤費の詳細内訳',
    icon: FilePieChart,
    formats: ['excel'],
    category: 'コスト分析',
  },
  {
    id: 'summary-report',
    title: '経営サマリーレポート',
    description: '経営層向けの概要レポート',
    icon: FileText,
    formats: ['excel', 'pdf'],
    category: 'サマリー',
    recommended: 'pdf',
  },
]

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<{success?: boolean, message?: string} | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')

  // Fetch available periods from API
  const { data: availablePeriods = [] } = usePayrollPeriods()

  // Sort periods descending (newest first) and auto-select latest
  const sortedPeriods = useMemo(() => {
    return sortPeriodsDescending(availablePeriods)
  }, [availablePeriods])

  // Auto-select latest period when data loads
  useEffect(() => {
    if (sortedPeriods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(sortedPeriods[0])
    }
  }, [sortedPeriods, selectedPeriod])

  const handleGenerate = async (reportId: string, format: 'excel' | 'pdf' = 'excel') => {
    const generatingKey = `${reportId}-${format}`
    setGenerating(generatingKey)
    setDownloadStatus(null)

    try {
      // Map report IDs to API report types
      const reportTypeMap: Record<string, string> = {
        'monthly-profit': 'monthly',
        'employee-detail': 'all-employees',
        'company-analysis': 'all-companies',
        'cost-breakdown': 'cost-breakdown',
        'summary-report': 'summary',
      }

      const reportType = reportTypeMap[reportId] || 'monthly'

      if (!selectedPeriod) {
        setDownloadStatus({ success: false, message: 'データがありません。給与明細をアップロードしてください。' })
        setGenerating(null)
        return
      }

      // Build API URL with format parameter
      const url = `${API_URL}/api/reports/download/${reportType}?format=${format}&period=${encodeURIComponent(selectedPeriod)}`

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
      const extension = format === 'pdf' ? 'pdf' : 'xlsx'
      let filename = `report_${reportId}_${new Date().toISOString().split('T')[0]}.${extension}`
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

      const formatLabel = format === 'pdf' ? 'PDF' : 'Excel'
      setDownloadStatus({ success: true, message: `${formatLabel}レポートをダウンロードしました` })
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

      <main className="md:pl-[280px] pt-16 transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  詳細レポート
                </h1>
                <p className="text-muted-foreground mt-1">
                  各種分析レポートの出力
                </p>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger className="w-[180px]" aria-label="期間を選択">
                    <SelectValue placeholder="期間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedPeriods.map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report, index) => {
              const Icon = report.icon
              const hasPdf = report.formats.includes('pdf')
              const hasExcel = report.formats.includes('excel')
              const isRecommendedPdf = 'recommended' in report && report.recommended === 'pdf'

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
                        <div className="flex gap-1">
                          {hasExcel && <Badge variant="secondary">Excel</Badge>}
                          {hasPdf && <Badge variant="default" className="bg-red-500">PDF</Badge>}
                        </div>
                      </div>
                      <CardTitle className="mt-4">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{report.category}</Badge>
                        <div className="flex gap-2">
                          {hasExcel && (
                            <Button
                              onClick={() => handleGenerate(report.id, 'excel')}
                              disabled={generating === `${report.id}-excel`}
                              size="sm"
                              variant={isRecommendedPdf ? "outline" : "default"}
                              aria-label={`${report.title}をExcelでダウンロード`}
                            >
                              {generating === `${report.id}-excel` ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                  生成中
                                </>
                              ) : (
                                <>
                                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                                  Excel
                                </>
                              )}
                            </Button>
                          )}
                          {hasPdf && (
                            <Button
                              onClick={() => handleGenerate(report.id, 'pdf')}
                              disabled={generating === `${report.id}-pdf`}
                              size="sm"
                              variant={isRecommendedPdf ? "default" : "outline"}
                              className={isRecommendedPdf ? "bg-red-500 hover:bg-red-600" : "border-red-500 text-red-500 hover:bg-red-50"}
                              aria-label={`${report.title}をPDFでダウンロード`}
                            >
                              {generating === `${report.id}-pdf` ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                  生成中
                                </>
                              ) : (
                                <>
                                  <FileText className="h-4 w-4 mr-1" />
                                  PDF
                                </>
                              )}
                            </Button>
                          )}
                        </div>
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
