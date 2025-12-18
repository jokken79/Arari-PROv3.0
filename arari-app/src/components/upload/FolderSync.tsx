'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Folder, Play, Loader2, CheckCircle, AlertCircle, Terminal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

type LogEntry = {
  type: 'info' | 'success' | 'error' | 'progress' | 'complete'
  message: string
  current?: number
  total?: number
  stats?: any
  timestamp: string
}

export function FolderSync() {
  const [folderPath, setFolderPath] = useState('D:\\給料明細')
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<any>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const { refreshFromBackend } = useAppStore()

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (entry: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, { ...entry, timestamp: new Date().toLocaleTimeString() }])
  }

  const handleSync = async () => {
    if (!folderPath.trim()) {
      addLog({ type: 'error', message: 'フォルダパスを入力してください' })
      return
    }

    setIsLoading(true)
    setLogs([]) // Clear previous logs
    setStats(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/sync-from-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_path: folderPath,
        }),
      })

      if (!response.ok) {
        try {
          const errData = await response.json()
          addLog({ type: 'error', message: errData.detail || 'Server Error' })
        } catch {
          addLog({ type: 'error', message: `Server error: ${response.statusText}` })
        }
        setIsLoading(false)
        return
      }

      // Reading stream
      const reader = response.body?.getReader()
      if (!reader) {
        addLog({ type: 'error', message: 'Unable to read response stream' })
        setIsLoading(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        // Process all complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim()
          if (!line) continue

          try {
            const data = JSON.parse(line)
            addLog({
              type: data.type,
              message: data.message,
              current: data.current,
              total: data.total
            })

            if (data.type === 'complete' && data.stats) {
              setStats(data.stats)
              refreshFromBackend()
            }
          } catch (e) {
            console.error('Failed to parse log line', line)
          }
        }
        // Keep the last incomplete line in buffer
        buffer = lines[lines.length - 1]
      }

    } catch (err) {
      addLog({ type: 'error', message: err instanceof Error ? err.message : 'Network Error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSync()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            フォルダから同期
          </CardTitle>
          <CardDescription>
            フォルダパスを指定して、すべての .xlsm ファイルを自動でアップロード
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">フォルダパス</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="例: D:\給料明細"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSync}
                disabled={isLoading || !folderPath.trim()}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    同期開始
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Log Viewer (Terminal Style) */}
          {(logs.length > 0 || isLoading) && (
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400 text-xs">
                <Terminal className="h-3 w-3" />
                <span>Sync Process Output</span>
              </div>
              <div
                ref={logContainerRef}
                className="p-4 h-[300px] overflow-y-auto font-mono text-xs md:text-sm space-y-1"
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
                {isLoading && (
                  <div className="flex gap-2 text-slate-500 animate-pulse">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                    <span>_</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Summary Card (re-using previous design for final stats) */}
          {stats && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3 pt-2"
            >
              <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 text-center">
                <p className="text-xs text-emerald-600/70">Processed</p>
                <p className="text-xl font-bold text-emerald-600">{stats.files_processed}</p>
              </div>
              <div className="bg-green-500/5 p-3 rounded-lg border border-green-500/10 text-center">
                <p className="text-xs text-green-600/70">Saved</p>
                <p className="text-xl font-bold text-green-600">{stats.total_saved}</p>
              </div>
              <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 text-center">
                <p className="text-xs text-amber-600/70">Errors</p>
                <p className="text-xl font-bold text-amber-600">{stats.total_errors}</p>
              </div>
            </motion.div>
          )}

          {/* Tips */}
          <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/10 space-y-2">
            <p className="text-sm font-medium text-blue-600">使い方:</p>
            <ul className="text-sm text-blue-600/70 space-y-1 ml-4">
              <li>1. フォルダパスを入力 (例: D:\給料明細)</li>
              <li>2. 「同期開始」ボタンをクリック</li>
              <li>3. 処理ログが画面に表示され、現在の進行状況を確認できます</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
