'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Bell,
  RefreshCw,
  Filter,
  X,
  Clock,
  TrendingDown,
  Users,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatYen, formatPercent } from '@/lib/utils'

const API_URL = 'http://localhost:8000'

interface Alert {
  id: number
  alert_type: string
  severity: string
  entity_type: string
  entity_id: string
  message: string
  details: Record<string, any>
  is_resolved: boolean
  created_at: string
  resolved_at: string | null
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
}

const alertTypeLabels: Record<string, string> = {
  'LOW_MARGIN': '低マージン',
  'NEGATIVE_MARGIN': '赤字',
  'EXCESSIVE_HOURS': '過剰労働時間',
  'MISSING_DATA': 'データ不足',
  'RATE_MISMATCH': '単価不一致',
  'OVERTIME_THRESHOLD': '残業時間超過',
}

export default function AlertsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active')
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'active') {
        params.append('is_resolved', 'false')
      } else if (filter === 'resolved') {
        params.append('is_resolved', 'true')
      }
      // filter === 'all' -> no is_resolved param (returns all)
      if (severityFilter) {
        params.append('severity', severityFilter)
      }

      const response = await fetch(`${API_URL}/api/alerts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/alerts/${alertId}/resolve`, {
        method: 'PUT',
      })
      if (response.ok) {
        fetchAlerts()
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const scanForAlerts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/alerts/scan`, {
        method: 'POST',
      })
      if (response.ok) {
        fetchAlerts()
      }
    } catch (error) {
      console.error('Error scanning for alerts:', error)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [filter, severityFilter])

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length,
    warning: alerts.filter(a => a.severity === 'warning' && !a.is_resolved).length,
    resolved: alerts.filter(a => a.is_resolved).length,
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:pl-[280px] transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
                アラート管理
              </h1>
              <p className="text-muted-foreground mt-1">
                マージン警告・労働時間・データ問題の監視
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchAlerts} disabled={loading} aria-label="アラート一覧を更新">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                更新
              </Button>
              <Button onClick={scanForAlerts} disabled={loading} aria-label="新しいアラートをスキャン">
                <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
                アラートスキャン
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className={stats.critical > 0 ? 'border-red-500' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">重大アラート</p>
                    <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">警告</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.warning}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">解決済み</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">合計</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Bell className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              aria-label="すべてのアラートを表示"
              aria-pressed={filter === 'all'}
            >
              すべて
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
              aria-label="アクティブなアラートのみ表示"
              aria-pressed={filter === 'active'}
            >
              アクティブ
            </Button>
            <Button
              variant={filter === 'resolved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('resolved')}
              aria-label="解決済みアラートのみ表示"
              aria-pressed={filter === 'resolved'}
            >
              解決済み
            </Button>
            <div className="border-l mx-2" />
            <Button
              variant={severityFilter === 'critical' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter(severityFilter === 'critical' ? null : 'critical')}
            >
              重大のみ
            </Button>
            <Button
              variant={severityFilter === 'warning' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter(severityFilter === 'warning' ? null : 'warning')}
            >
              警告のみ
            </Button>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">読み込み中...</p>
                </CardContent>
              </Card>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
                  <p className="mt-4 text-lg font-medium">アラートはありません</p>
                  <p className="text-muted-foreground">すべてのシステムは正常に動作しています</p>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert, index) => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info
                const Icon = config.icon

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`${config.border} ${alert.is_resolved ? 'opacity-60' : ''}`}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${config.bg}`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={config.badge}>
                                {alert.severity === 'critical' ? '重大' : alert.severity === 'warning' ? '警告' : '情報'}
                              </Badge>
                              <Badge variant="outline">
                                {alertTypeLabels[alert.alert_type] || alert.alert_type}
                              </Badge>
                              {alert.is_resolved && (
                                <Badge variant="secondary">解決済み</Badge>
                              )}
                            </div>
                            <p className="font-medium">{alert.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {alert.entity_type}: {alert.entity_id}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(alert.created_at).toLocaleString('ja-JP')}
                              </span>
                            </div>
                            {alert.details && Object.keys(alert.details).length > 0 && (
                              <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
                                {alert.details.margin !== undefined && (
                                  <span className="mr-4">マージン: {formatPercent(alert.details.margin)}</span>
                                )}
                                {alert.details.threshold !== undefined && (
                                  <span>閾値: {formatPercent(alert.details.threshold)}</span>
                                )}
                              </div>
                            )}
                          </div>
                          {!alert.is_resolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                              aria-label={`アラート「${alert.message}」を解決済みとしてマーク`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                              解決
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
