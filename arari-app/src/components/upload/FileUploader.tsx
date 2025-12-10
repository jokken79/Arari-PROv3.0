'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { uploadApi } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

interface UploadedFileInfo {
  id: string
  name: string
  size: number
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  records?: number
  skipped?: number
  errorCount?: number
  error?: string
  file?: File
}

export function FileUploader() {
  const [files, setFiles] = useState<UploadedFileInfo[]>([])
  const { refreshFromBackend } = useAppStore()

  const [isUploading, setIsUploading] = useState(false)

  // Process queue effect
  useEffect(() => {
    const processQueue = async () => {
      if (isUploading) return

      // Find next pending file
      const nextFile = files.find(f => f.status === 'pending')
      if (!nextFile) return

      setIsUploading(true)
      try {
        await processFile(nextFile)
      } finally {
        setIsUploading(false)
      }
    }
    processQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, isUploading])

  const processFile = async (fileInfo: UploadedFileInfo) => {
    if (!fileInfo.file) return

    // Update status to uploading
    setFiles(prev => prev.map(f => f.id === fileInfo.id ? { ...f, status: 'uploading', progress: 0 } : f))

    try {
      const result = await uploadApi.uploadFile(fileInfo.file)

      if (result.data) {
        setFiles(prev => prev.map(f =>
          f.id === fileInfo.id
            ? {
              ...f,
              status: 'success',
              progress: 100,
              records: result.data!.saved_records,
              skipped: result.data!.skipped_count || 0,
              errorCount: result.data!.error_count || 0,
            }
            : f
        ))
        await refreshFromBackend()
      } else {
        throw new Error(result.error || 'アップロードに失敗しました')
      }
    } catch (err) {
      setFiles(prev => prev.map(f =>
        f.id === fileInfo.id
          ? {
            ...f,
            status: 'error',
            progress: 100,
            error: err instanceof Error ? err.message : 'Unknown error',
          }
          : f
      ))
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [
      ...prev,
      ...acceptedFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        status: 'pending' as const,
        progress: 0,
        file: file
      }))
    ])
  }, [])

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: true,
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            給与明細アップロード
          </CardTitle>
          <CardDescription>
            Excel (.xlsx, .xls) または CSV ファイルをドラッグ＆ドロップ、またはクリックして選択
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]',
              isDragActive
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <input {...getInputProps()} />

            <motion.div
              animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="flex flex-col items-center gap-4"
            >
              <div className={cn(
                'p-4 rounded-full transition-colors',
                isDragActive ? 'bg-primary/10' : 'bg-muted'
              )}>
                <FileSpreadsheet className={cn(
                  'h-12 w-12 transition-colors',
                  isDragActive ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>

              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragActive
                    ? 'ここにドロップしてください'
                    : 'ファイルをドラッグ＆ドロップ'}
                </p>
                <p className="text-sm text-muted-foreground">
                  または <span className="text-primary font-medium">クリックして選択</span>
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>対応形式:</span>
                <span className="px-2 py-1 rounded bg-muted">.xlsx</span>
                <span className="px-2 py-1 rounded bg-muted">.xlsm</span>
                <span className="px-2 py-1 rounded bg-muted">.xls</span>
                <span className="px-2 py-1 rounded bg-muted">.csv</span>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">アップロードしたファイル</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        file.status === 'success' && 'bg-emerald-500/10',
                        file.status === 'error' && 'bg-red-500/10',
                        (file.status === 'uploading' || file.status === 'processing') && 'bg-primary/10'
                      )}>
                        {file.status === 'success' && (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        )}
                        {file.status === 'error' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">{file.name}</p>
                          <span className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>

                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <div className="space-y-1">
                            <Progress value={file.progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {file.status === 'uploading'
                                ? `アップロード中... ${file.progress.toFixed(0)}%`
                                : 'データを処理中...'}
                            </p>
                          </div>
                        )}

                        {file.status === 'success' && (
                          <div className="space-y-1">
                            <p className="text-sm text-emerald-500">
                              ✓ {file.records}件のレコードをデータベースに保存しました
                            </p>
                            {(file.skipped || 0) > 0 && (
                              <p className="text-xs text-amber-500">
                                ⚠ {file.skipped}件をスキップ (従業員が見つかりません)
                              </p>
                            )}
                            {(file.errorCount || 0) > 0 && (
                              <p className="text-xs text-red-500">
                                ✕ {file.errorCount}件のエラー
                              </p>
                            )}
                          </div>
                        )}

                        {file.status === 'error' && (
                          <p className="text-sm text-red-500">{file.error}</p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ファイル形式について</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">必須項目</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  社員番号 (従業員番号, ID)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  対象期間 (期間, 月) - 例: 2025年1月
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">認識される項目</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  基本給, 残業時間, 残業代
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  社会保険料, 雇用保険料
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  有給日数, 有給時間
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  通勤費, 請求金額, 売上
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
