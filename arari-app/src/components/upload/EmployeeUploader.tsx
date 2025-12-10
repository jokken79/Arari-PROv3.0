'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Users, Upload, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { uploadApi } from '@/lib/api'

interface UploadResponse {
  status: 'success' | 'error'
  employees_added?: number
  employees_updated?: number
  employees_skipped?: number
  total_employees?: number
  errors?: string[]
  message?: string
}

export function EmployeeUploader() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { refreshFromBackend } = useAppStore()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      handleUpload(file)
    }
  }

  const handleUpload = async (file: File) => {
    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xls', 'xlsm', 'xlsx'].includes(ext || '')) {
      setError('Solo se aceptan archivos .xls, .xlsx o .xlsm')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máximo 50MB)')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data, error } = await uploadApi.importEmployees(file)

      if (error) {
        setError(error)
        setResult(null)
      } else if (data) {
        const responseData = data as unknown as UploadResponse
        setResult(responseData)
        if (responseData.employees_added || responseData.employees_updated) {
          // Refresh employee data from backend
          await refreshFromBackend()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBrowse = () => {
    fileInputRef.current?.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            従業員データインポート
          </CardTitle>
          <CardDescription>
            Excel ファイルから従業員をインポート（DBGenzaiX シート）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input (Hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsm,.xlsx"
            onChange={handleFileSelect}
            disabled={isLoading}
            style={{ display: 'none' }}
          />

          {/* Browse Button Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ファイル選択</label>
            <div className="flex gap-2">
              <Button
                onClick={handleBrowse}
                disabled={isLoading}
                className="gap-2"
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Excel ファイルを選択
                  </>
                )}
              </Button>
              {fileName && (
                <div className="flex items-center flex-1 px-3 py-2 rounded-md bg-muted">
                  <span className="text-sm text-muted-foreground truncate">{fileName}</span>
                  {!isLoading && (
                    <button
                      onClick={() => {
                        setFileName(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="ml-auto p-1 hover:bg-white/20 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">エラー</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Success Result */}
          {result && result.status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            >
              <div className="flex gap-3 items-start">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-emerald-500">インポート完了</p>
                  <p className="text-sm text-emerald-600">
                    従業員データが正常にインポートされました
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {result.employees_added !== undefined && (
                  <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                    <p className="text-xs text-emerald-600/70">新規追加</p>
                    <p className="text-lg font-bold text-emerald-600">{result.employees_added}</p>
                  </div>
                )}
                {result.employees_updated !== undefined && (
                  <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                    <p className="text-xs text-blue-600/70">更新済み</p>
                    <p className="text-lg font-bold text-blue-600">{result.employees_updated}</p>
                  </div>
                )}
                {result.total_employees !== undefined && (
                  <div className="bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10">
                    <p className="text-xs text-indigo-600/70">合計</p>
                    <p className="text-lg font-bold text-indigo-600">{result.total_employees}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Error Result */}
          {result && result.status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500">エラー</p>
                <p className="text-sm text-amber-600">{result.message}</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.errors.slice(0, 3).map((err, i) => (
                      <p key={i} className="text-xs text-amber-600">
                        • {err}
                      </p>
                    ))}
                    {result.errors.length > 3 && (
                      <p className="text-xs text-amber-600">
                        ... と他 {result.errors.length - 3} 件のエラー
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/10 space-y-2">
            <p className="text-sm font-medium text-blue-600">使い方:</p>
            <ul className="text-sm text-blue-600/70 space-y-1 ml-4">
              <li>1. 「Excel ファイルを選択」をクリック</li>
              <li>2. DBGenzaiX シートを含むファイルを選択</li>
              <li>3. 従業員データが自動的にインポートされます</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
