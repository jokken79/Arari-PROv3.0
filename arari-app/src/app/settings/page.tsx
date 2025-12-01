'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/components/ui/theme-provider'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

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
                    データのバックアップと復元
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="outline">
                      データをバックアップ
                    </Button>
                    <Button variant="outline">
                      バックアップから復元
                    </Button>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      すべてのデータを削除
                    </Button>
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
