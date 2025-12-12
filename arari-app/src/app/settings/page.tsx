'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  Shield,
  Database,
  Palette,
  RefreshCw,
  Check,
  AlertCircle,
  Percent,
  Save,
  Calendar,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/components/ui/theme-provider'
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/api'

// API base URL - FastAPI backend (port 8000)
import { useAppStore } from '@/store/appStore'
const API_URL = 'http://localhost:8000'

interface InsuranceSettings {
  employment_insurance_rate: string
  workers_comp_rate: string
  fiscal_year: string
  target_margin: string
}

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{
    success?: boolean
    message?: string
    stats?: any
  } | null>(null)

  // Insurance settings state
  const [insuranceSettings, setInsuranceSettings] = useState<InsuranceSettings>({
    employment_insurance_rate: '0.0090',
    workers_comp_rate: '0.003',
    fiscal_year: '2025',
    target_margin: '15',
  })
  const [isSavingInsurance, setIsSavingInsurance] = useState(false)
  const [insuranceSaveStatus, setInsuranceSaveStatus] = useState<{
    success?: boolean
    message?: string
  } | null>(null)

  // Load insurance settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/settings`)
        if (response.ok) {
          const data = await response.json()
          const settings: InsuranceSettings = {
            employment_insurance_rate: '0.0090',
            workers_comp_rate: '0.003',
            fiscal_year: '2025',
            target_margin: '15',
          }
          data.forEach((item: { key: string; value: string }) => {
            if (item.key in settings) {
              settings[item.key as keyof InsuranceSettings] = item.value
            }
          })
          setInsuranceSettings(settings)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Save insurance settings
  const handleSaveInsurance = async () => {
    setIsSavingInsurance(true)
    setInsuranceSaveStatus(null)

    try {
      const updates = [
        { key: 'employment_insurance_rate', value: insuranceSettings.employment_insurance_rate, description: `雇用保険（会社負担）- ${insuranceSettings.fiscal_year}年度` },
        { key: 'workers_comp_rate', value: insuranceSettings.workers_comp_rate, description: '労災保険 - 製造業' },
        { key: 'fiscal_year', value: insuranceSettings.fiscal_year, description: '適用年度' },
        { key: 'target_margin', value: insuranceSettings.target_margin, description: '目標マージン率 (%) - 製造派遣' },
      ]

      for (const update of updates) {
        await fetch(`${API_URL}/api/settings/${update.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: update.value, description: update.description }),
        })
      }

      setInsuranceSaveStatus({ success: true, message: '設定を保存しました' })

      // Refresh global store settings
      useAppStore.getState().loadSettings()

      setTimeout(() => setInsuranceSaveStatus(null), 3000)
    } catch (error) {
      setInsuranceSaveStatus({ success: false, message: '保存に失敗しました' })
    } finally {
      setIsSavingInsurance(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus(null)

    const { data, error } = await syncApi.syncEmployees()

    if (error) {
      setSyncStatus({
        success: false,
        message: error,
      })
    } else if (data) {
      setSyncStatus({
        success: data.success,
        message: data.message,
        stats: data.stats,
      })
      // Auto-clear success message after 5 seconds
      if (data.success) {
        setTimeout(() => setSyncStatus(null), 5000)
      }
    }

    setIsSyncing(false)
  }

  const themeOptions = [
    { value: 'light', label: 'ライト', icon: Sun },
    { value: 'dark', label: 'ダーク', icon: Moon },
    { value: 'system', label: 'システム', icon: Monitor },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:pl-[280px] transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              設定
            </h1>
            <p className="text-muted-foreground mt-1">
              アプリケーションの設定を管理
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* Theme Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    <CardTitle>テーマ設定</CardTitle>
                  </div>
                  <CardDescription>
                    アプリケーションの外観を設定します
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {themeOptions.map((option) => {
                      const Icon = option.icon
                      const isActive = theme === option.value

                      return (
                        <motion.button
                          key={option.value}
                          onClick={() => setTheme(option.value as any)}
                          aria-label={`テーマを${option.label}に変更`}
                          aria-pressed={isActive}
                          className={cn(
                            'flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all',
                            isActive
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-muted hover:border-muted-foreground/20'
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={cn(
                            'p-3 rounded-full',
                            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/10'
                          )}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="font-medium">{option.label}</span>
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              選択中
                            </Badge>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notification Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle>通知設定</CardTitle>
                  </div>
                  <CardDescription>
                    通知の受信設定を管理します
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                      <div>
                        <p className="font-medium">低マージン警告</p>
                        <p className="text-sm text-muted-foreground">
                          マージン率が20%を下回った場合に通知
                        </p>
                      </div>
                      <Badge variant="success">有効</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                      <div>
                        <p className="font-medium">月次レポート完了</p>
                        <p className="text-sm text-muted-foreground">
                          月次データの集計完了時に通知
                        </p>
                      </div>
                      <Badge variant="success">有効</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                      <div>
                        <p className="font-medium">データインポート完了</p>
                        <p className="text-sm text-muted-foreground">
                          ファイルのインポート完了時に通知
                        </p>
                      </div>
                      <Badge variant="secondary">無効</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Insurance Rates Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-primary" />
                    <CardTitle>保険料率設定</CardTitle>
                  </div>
                  <CardDescription>
                    雇用保険・労災保険の料率を設定（毎年4月に更新）
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Fiscal Year */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">適用年度</label>
                        <p className="text-xs text-muted-foreground">保険料率が適用される年度</p>
                      </div>
                      <Input
                        type="number"
                        value={insuranceSettings.fiscal_year}
                        onChange={(e) => setInsuranceSettings(prev => ({
                          ...prev,
                          fiscal_year: e.target.value
                        }))}
                        className="w-24 text-center"
                        aria-label="適用年度"
                      />
                      <span className="text-sm text-muted-foreground">年度</span>
                    </div>

                    {/* Employment Insurance */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          雇用保険（会社負担）
                        </label>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          2025年度: 0.90% / 2024年度: 0.95%
                        </p>
                      </div>
                      <Input
                        type="number"
                        step="0.0001"
                        value={insuranceSettings.employment_insurance_rate}
                        onChange={(e) => setInsuranceSettings(prev => ({
                          ...prev,
                          employment_insurance_rate: e.target.value
                        }))}
                        className="w-28 text-center"
                        aria-label="雇用保険率（会社負担）"
                      />
                      <span className="text-sm text-muted-foreground">
                        ({(parseFloat(insuranceSettings.employment_insurance_rate) * 100).toFixed(2)}%)
                      </span>
                    </div>

                    {/* Workers Comp */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          労災保険（会社負担）
                        </label>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          製造業: 0.3% (業種により異なる)
                        </p>
                      </div>
                      <Input
                        type="number"
                        step="0.0001"
                        value={insuranceSettings.workers_comp_rate}
                        onChange={(e) => setInsuranceSettings(prev => ({
                          ...prev,
                          workers_comp_rate: e.target.value
                        }))}
                        className="w-28 text-center"
                        aria-label="労災保険率（会社負担）"
                      />
                      <span className="text-sm text-muted-foreground">
                        ({(parseFloat(insuranceSettings.workers_comp_rate) * 100).toFixed(2)}%)
                      </span>
                    </div>

                    {/* Target Margin */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                          目標マージン率
                        </label>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          製造派遣の標準: 15%
                        </p>
                      </div>
                      <Input
                        type="number"
                        step="1"
                        value={insuranceSettings.target_margin}
                        onChange={(e) => setInsuranceSettings(prev => ({
                          ...prev,
                          target_margin: e.target.value
                        }))}
                        className="w-20 text-center"
                        aria-label="目標マージン率（パーセント）"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        ※ 変更は新規データ登録時に適用されます
                      </p>
                      <Button
                        onClick={handleSaveInsurance}
                        disabled={isSavingInsurance}
                        className="gap-2"
                        aria-label="保険料率設定を保存"
                      >
                        <Save className={cn("h-4 w-4", isSavingInsurance && "animate-spin")} aria-hidden="true" />
                        {isSavingInsurance ? '保存中...' : '設定を保存'}
                      </Button>
                    </div>

                    {/* Save Status */}
                    {insuranceSaveStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-3 rounded-md text-sm flex items-center gap-2",
                          insuranceSaveStatus.success
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                        )}
                      >
                        {insuranceSaveStatus.success ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        {insuranceSaveStatus.message}
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <CardTitle>データ管理</CardTitle>
                  </div>
                  <CardDescription>
                    社員データの同期とバックアップ
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                      <div className="flex items-center gap-3">
                        <RefreshCw className={cn(
                          "h-5 w-5 text-blue-600 dark:text-blue-400",
                          isSyncing && "animate-spin"
                        )} />
                        <div className="flex-1">
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            ChinginGeneratorから同期
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            最新の社員情報を自動インポート
                          </p>
                        </div>
                        <Button
                          onClick={handleSync}
                          disabled={isSyncing}
                          className="gap-2"
                        >
                          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                          {isSyncing ? '同期中...' : '同期する'}
                        </Button>
                      </div>

                      {syncStatus && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "mt-3 p-3 rounded-md text-sm",
                            syncStatus.success
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                              : "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300 border border-red-300 dark:border-red-700"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {syncStatus.success ? (
                              <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{syncStatus.message}</p>
                              {syncStatus.stats && (
                                <div className="mt-2 space-y-1 text-xs">
                                  <p>• 派遣社員 (haken): {syncStatus.stats.haken_added} 件</p>
                                  <p>• 請負社員 (ukeoi): {syncStatus.stats.ukeoi_added} 件</p>
                                  {syncStatus.stats.total_errors > 0 && (
                                    <p>• エラー: {syncStatus.stats.total_errors} 件</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">その他のオプション</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" disabled>
                        データをバックアップ
                      </Button>
                      <Button variant="outline" disabled>
                        バックアップから復元
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label="すべてのデータを削除"
                        onClick={async () => {
                          if (!confirm('本当にすべてのデータを削除しますか？\nこの操作は取り消せません。\n\nAre you sure you want to delete ALL data? This cannot be undone.')) {
                            return
                          }

                          try {
                            const res = await fetch(`${API_URL}/api/reset-db`, { method: 'DELETE' })
                            if (res.ok) {
                              alert('データを削除しました。\nData deleted successfully.')
                              // Reload to refresh UI state if needed
                              window.location.reload()
                            } else {
                              alert('削除に失敗しました。\nFailed to delete data.')
                            }
                          } catch (e) {
                            console.error(e)
                            alert('エラーが発生しました。\nAn error occurred.')
                          }
                        }}
                      >
                        すべてのデータを削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* About */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      粗利 PRO
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      利益管理システム v2.0.0
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                      派遣社員の粗利分析・管理システム<br />
                      社会保険、有給休暇を含めた正確な利益計算
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      © 2025 Internal Use Only
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
