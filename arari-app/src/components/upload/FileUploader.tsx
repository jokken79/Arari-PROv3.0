'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Terminal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
// import { uploadApi } from '@/lib/api' // Bypassing for streaming support
import { API_BASE_URL } from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import toast from 'react-hot-toast'

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

type LogEntry = {
  type: 'info' | 'success' | 'error' | 'progress' | 'complete'
  message: string
  current?: number
  total?: number
  stats?: any
  timestamp: string
}

export function FileUploader() {
  const [files, setFiles] = useState<UploadedFileInfo[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  const { refreshFromBackend } = useAppStore()

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (entry: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, { ...entry, timestamp: new Date().toLocaleTimeString() }])
  }

  // Process queue effect
  useEffect(() => {
    const processQueue = async () => {
      if (isUploading) return

      // Find next pending file
      const nextFile = files.find(f => f.status === 'pending')
      if (!nextFile) return

      setIsUploading(true)
      // Clear logs only if it's the first file of a batch?
      // Or keep appending? Let's keep appending with a separator for clarity.
      const completedCount = files.filter(f => f.status === 'success' || f.status === 'error').length
      if (completedCount === 0) {
        setLogs([])
      } else {
        // Add a small delay between uploads to prevent connection issues
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

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
    addLog({ type: 'info', message: `Starting upload for: ${fileInfo.name}` })

    // Retry logic for unreliable connections (especially mobile)
    const maxRetries = 2
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          addLog({ type: 'info', message: `Retrying upload (attempt ${attempt + 1}/${maxRetries + 1})...` })
          setFiles(prev => prev.map(f => f.id === fileInfo.id ? { ...f, status: 'uploading', progress: 0 } : f))
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2s before retry
        }

        const formData = new FormData()
        formData.append('file', fileInfo.file)

        addLog({ type: 'info', message: `Uploading ${(fileInfo.size / 1024 / 1024).toFixed(1)}MB to server...` })

        // Add abort controller for timeout handling
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        addLog({ type: 'info', message: `Server responded with status: ${response.status}` })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('ReadableStream not supported')

        addLog({ type: 'info', message: 'Reading server stream...' })

        const decoder = new TextDecoder()
        let buffer = ''
        let finalStats: any = null

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          const lines = buffer.split('\n')

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (!line) continue

            try {
              const data = JSON.parse(line)

              // Add to global logs
              addLog({
                type: data.type,
                message: data.message,
                current: data.current,
                total: data.total
              })

              // Update file progress if available
              if (data.type === 'progress' && data.current && data.total) {
                const percentage = Math.round((data.current / data.total) * 100)
                setFiles(prev => prev.map(f =>
                  f.id === fileInfo.id ? { ...f, status: 'processing', progress: percentage } : f
                ))
              }

              if (data.type === 'success' && data.stats) {
                finalStats = data.stats
              }

            } catch (e) {
              console.error('JSON Parse Error', line)
            }
          }
          buffer = lines[lines.length - 1]
        }

        // Success - finalize file status
        const recordCount = finalStats?.saved || finalStats?.imported || 0
        setFiles(prev => prev.map(f =>
          f.id === fileInfo.id
            ? {
              ...f,
              status: 'success',
              progress: 100,
              records: recordCount,
              skipped: finalStats?.skipped || 0,
              errorCount: finalStats?.errors || 0,
            }
            : f
        ))

        await refreshFromBackend()

        // Show success toast
        toast.success(`${fileInfo.name}を正常にアップロードしました (${recordCount}件)`)

        return // Success - exit retry loop

      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error')

        // Check if this is a retryable error
        const isRetryable = lastError.message === 'Load failed' ||
                           lastError.message === 'Failed to fetch' ||
                           lastError.name === 'AbortError'

        if (!isRetryable || attempt === maxRetries) {
          // Final failure - set error status
          let errMsg = lastError.message
          if (lastError.name === 'AbortError') {
            errMsg = 'Upload timed out (5 min limit)'
          } else if (lastError.message === 'Load failed' || lastError.message === 'Failed to fetch') {
            errMsg = 'Connection error - please try again with a stable network'
          }

          addLog({ type: 'error', message: `Error uploading ${fileInfo.name}: ${errMsg}` })

          setFiles(prev => prev.map(f =>
            f.id === fileInfo.id
              ? {
                ...f,
                status: 'error',
                progress: 100,
                error: errMsg,
              }
              : f
          ))

          // Show error toast
          toast.error(`${fileInfo.name}のアップロードに失敗しました: ${errMsg}`)

          return // Exit after final error
        }

        // Will retry - log the attempt
        addLog({ type: 'info', message: `Upload failed, will retry...` })
      }
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
            <input {...getInputProps()} aria-label="給与明細ファイルをアップロード" />

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

      {/* Terminal Log Viewer */}
      <AnimatePresence>
        {(logs.length > 0 || isUploading) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-inner mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400 text-xs">
                <Terminal className="h-3 w-3" />
                <span>Upload Process Output</span>
              </div>
              <div
                ref={logContainerRef}
                className="p-4 h-[200px] overflow-y-auto font-mono text-xs md:text-sm space-y-1"
              >
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-2 text-slate-300">
                    <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                    <span className={cn(
                      "break-all",
                      log.type === 'error' && "text-red-400",
                      log.type === 'success' && "text-emerald-400",
                      log.type === 'info' && "text-blue-400 font-bold",
                      log.type === 'complete' && "text-green-400 font-bold border-t border-slate-800 pt-2 mt-2"
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
                {isUploading && (
                  <div className="flex gap-2 text-slate-500 animate-pulse">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                    <span>_</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        aria-label={`${file.name}を削除`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
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
