'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Upload,
  Eye,
  Copy,
  Download,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// API base URL - FastAPI backend
const API_URL = 'http://localhost:8000'

interface Template {
  id: number
  factory_identifier: string
  template_name: string
  field_count: number
  detection_confidence: number
  sample_employee_id: string | null
  sample_period: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface TemplateDetail {
  id: number
  factory_identifier: string
  template_name: string
  field_positions: Record<string, number>
  column_offsets: Record<string, number>
  detected_allowances: Record<string, number>
  non_billable_allowances: string[]
  employee_column_width: number
  detection_confidence: number
  sample_employee_id: string | null
  sample_period: string | null
  created_at: string
  updated_at: string
  notes: string | null
}

interface TemplateStats {
  total_templates: number
  active_templates: number
  average_confidence: number
  last_updated: string | null
}

export default function TemplatesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<TemplateStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [templateDetails, setTemplateDetails] = useState<Record<string, TemplateDetail>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<{
    success: boolean
    message: string
    templates_created?: string[]
  } | null>(null)

  // Fetch templates
  const fetchTemplates = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/templates`)
      if (!response.ok) throw new Error('Failed to fetch templates')
      const data = await response.json()
      setTemplates(data.templates || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Fetch template details
  const fetchTemplateDetail = async (factoryId: string) => {
    if (templateDetails[factoryId]) return // Already loaded

    try {
      const response = await fetch(`${API_URL}/api/templates/${encodeURIComponent(factoryId)}`)
      if (!response.ok) throw new Error('Failed to fetch template details')
      const data = await response.json()
      setTemplateDetails(prev => ({ ...prev, [factoryId]: data }))
    } catch (err) {
      console.error('Error fetching template details:', err)
    }
  }

  // Toggle template expansion
  const toggleTemplate = async (factoryId: string) => {
    if (expandedTemplate === factoryId) {
      setExpandedTemplate(null)
    } else {
      setExpandedTemplate(factoryId)
      await fetchTemplateDetail(factoryId)
    }
  }

  // Delete template
  const handleDelete = async (factoryId: string) => {
    if (!confirm(`テンプレート「${factoryId}」を削除しますか？`)) return

    try {
      const response = await fetch(`${API_URL}/api/templates/${encodeURIComponent(factoryId)}?hard_delete=true`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete template')
      await fetchTemplates()
    } catch (err) {
      alert('削除に失敗しました: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Handle file upload for analysis
  const handleAnalyzeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)
    setAnalyzeResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/api/templates/analyze`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setAnalyzeResult({
          success: false,
          message: data.detail || 'Analysis failed',
        })
      } else {
        setAnalyzeResult({
          success: true,
          message: `${data.templates_created?.length || 0} templates created`,
          templates_created: data.templates_created,
        })
        // Refresh templates list
        await fetchTemplates()
      }
    } catch (err) {
      setAnalyzeResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsAnalyzing(false)
      // Reset file input
      e.target.value = ''
    }
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30'
    if (confidence >= 0.6) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
    return 'text-red-600 bg-red-100 dark:bg-red-900/30'
  }

  // Field name translations
  const fieldNames: Record<string, string> = {
    employee_id: '社員番号',
    period: '期間',
    work_days: '出勤日数',
    work_hours: '労働時間',
    overtime_hours: '残業時間',
    night_hours: '深夜時間',
    holiday_hours: '休日時間',
    overtime_over_60h: '60H超',
    paid_leave_days: '有給日数',
    base_salary: '基本給',
    overtime_pay: '残業手当',
    night_pay: '深夜手当',
    holiday_pay: '休日手当',
    overtime_over_60h_pay: '60H超手当',
    transport_allowance: '通勤費',
    paid_leave_amount: '有給金額',
    social_insurance: '社会保険',
    employment_insurance: '雇用保険',
    income_tax: '所得税',
    resident_tax: '住民税',
    gross_salary: '総支給額',
    net_salary: '差引支給額',
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:pl-[280px] transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  テンプレート管理
                </h1>
                <p className="text-muted-foreground mt-1">
                  派遣先ごとのExcel解析テンプレートを管理
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchTemplates} disabled={isLoading} aria-label="テンプレート一覧を更新">
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} aria-hidden="true" />
                  更新
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".xlsx,.xlsm,.xls"
                    onChange={handleAnalyzeFile}
                    className="hidden"
                    disabled={isAnalyzing}
                    aria-label="Excelファイルを選択してテンプレートを生成"
                  />
                  <Button asChild disabled={isAnalyzing}>
                    <span>
                      <Upload className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
                      {isAnalyzing ? '解析中...' : 'Excelから生成'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Analysis Result */}
          <AnimatePresence>
            {analyzeResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "mb-6 p-4 rounded-lg flex items-start gap-3",
                  analyzeResult.success
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
                    : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                )}
              >
                {analyzeResult.success ? (
                  <Check className="h-5 w-5 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{analyzeResult.message}</p>
                  {analyzeResult.templates_created && analyzeResult.templates_created.length > 0 && (
                    <p className="text-sm mt-1">
                      生成: {analyzeResult.templates_created.join(', ')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setAnalyzeResult(null)}
                >
                  閉じる
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
            >
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{stats.total_templates}</div>
                  <div className="text-sm text-muted-foreground">総テンプレート数</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-emerald-600">{stats.active_templates}</div>
                  <div className="text-sm text-muted-foreground">アクティブ</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {(stats.average_confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">平均検出精度</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium truncate">
                    {stats.last_updated ? new Date(stats.last_updated).toLocaleDateString('ja-JP') : '-'}
                  </div>
                  <div className="text-sm text-muted-foreground">最終更新</div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
              <p className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {error}
              </p>
            </div>
          )}

          {/* Templates List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">読み込み中...</p>
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">テンプレートがありません</h3>
                  <p className="text-muted-foreground mb-4">
                    Excelファイルをアップロードすると自動的にテンプレートが生成されます
                  </p>
                  <label>
                    <input
                      type="file"
                      accept=".xlsx,.xlsm,.xls"
                      onChange={handleAnalyzeFile}
                      className="hidden"
                    />
                    <Button asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Excelファイルを解析
                      </span>
                    </Button>
                  </label>
                </CardContent>
              </Card>
            ) : (
              templates.map((template, index) => (
                <motion.div
                  key={template.factory_identifier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "transition-all",
                    expandedTemplate === template.factory_identifier && "ring-2 ring-primary"
                  )}>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => toggleTemplate(template.factory_identifier)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedTemplate === template.factory_identifier ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <CardTitle className="text-lg">
                              {template.template_name || template.factory_identifier}
                            </CardTitle>
                            <CardDescription>
                              {template.sample_period && `${template.sample_period} | `}
                              {template.field_count} フィールド
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getConfidenceColor(template.detection_confidence)}>
                            {(template.detection_confidence * 100).toFixed(0)}%
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(template.factory_identifier)
                            }}
                            aria-label={`${template.template_name}テンプレートを削除`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedTemplate === template.factory_identifier && templateDetails[template.factory_identifier] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <CardContent className="border-t pt-4">
                            {(() => {
                              const detail = templateDetails[template.factory_identifier]
                              return (
                                <div className="space-y-6">
                                  {/* Info */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">サンプル社員ID:</span>
                                      <p className="font-mono">{detail.sample_employee_id || '-'}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">サンプル期間:</span>
                                      <p>{detail.sample_period || '-'}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">列幅:</span>
                                      <p>{detail.employee_column_width} columns</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">作成日:</span>
                                      <p>{new Date(detail.created_at).toLocaleDateString('ja-JP')}</p>
                                    </div>
                                  </div>

                                  {/* Field Positions */}
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <Eye className="h-4 w-4" />
                                      フィールド位置 (行番号)
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {Object.entries(detail.field_positions).map(([field, row]) => (
                                        <div
                                          key={field}
                                          className="flex justify-between p-2 bg-muted rounded text-sm"
                                        >
                                          <span className="text-muted-foreground">
                                            {fieldNames[field] || field}
                                          </span>
                                          <span className="font-mono">{row}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Column Offsets */}
                                  <div>
                                    <h4 className="font-medium mb-2">列オフセット</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                      {Object.entries(detail.column_offsets).map(([key, offset]) => (
                                        <div
                                          key={key}
                                          className="flex justify-between p-2 bg-muted rounded text-sm"
                                        >
                                          <span className="text-muted-foreground">{key}</span>
                                          <span className="font-mono">{offset}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Detected Allowances */}
                                  {Object.keys(detail.detected_allowances).length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">検出された手当</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(detail.detected_allowances).map(([name, row]) => (
                                          <Badge key={name} variant="secondary">
                                            {name} (Row {row})
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Non-billable Allowances */}
                                  {detail.non_billable_allowances.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2 text-amber-600">非請求手当 (会社負担のみ)</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {detail.non_billable_allowances.map((name) => (
                                          <Badge key={name} variant="outline" className="border-amber-500 text-amber-600">
                                            {name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Notes */}
                                  {detail.notes && (
                                    <div className="text-sm text-muted-foreground">
                                      <span className="font-medium">メモ:</span> {detail.notes}
                                    </div>
                                  )}

                                  {/* Actions */}
                                  <div className="flex gap-2 pt-4 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(detail, null, 2))
                                        alert('JSONをコピーしました')
                                      }}
                                      aria-label="テンプレートJSONをクリップボードにコピー"
                                    >
                                      <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
                                      JSONをコピー
                                    </Button>
                                  </div>
                                </div>
                              )
                            })()}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {/* Help */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">テンプレートの仕組み</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. 初めてExcelをアップロードすると、システムが自動的にフィールド位置を検出</li>
                  <li>2. 検出が成功すると、派遣先ごとにテンプレートとして保存</li>
                  <li>3. 次回以降、同じ派遣先のExcelは保存されたテンプレートで高速解析</li>
                  <li>4. テンプレートが合わない場合は削除して再生成可能</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
