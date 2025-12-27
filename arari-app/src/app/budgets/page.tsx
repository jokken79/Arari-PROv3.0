'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Target,
  BarChart3,
  Calendar,
  Building2,
  Users,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatYen, formatPercent } from '@/lib/utils'
import { API_BASE_URL } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

const API_URL = API_BASE_URL

interface Budget {
  id: number
  period: string
  entity_type: string
  entity_id: string
  revenue_budget: number
  cost_budget: number
  margin_target: number
  notes: string | null
  created_at: string
}

interface BudgetComparison {
  period: string
  entity_type: string
  entity_id: string
  budget: {
    revenue: number
    cost: number
    margin_target: number
  }
  actual: {
    revenue: number
    cost: number
    margin: number
  }
  variance: {
    revenue: number
    revenue_pct: number
    cost: number
    cost_pct: number
    margin_diff: number
  }
  status: string
}

export default function BudgetsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [comparisons, setComparisons] = useState<BudgetComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { availablePeriods, selectedPeriod } = useAppStore()

  // Form state
  const [formData, setFormData] = useState({
    period: selectedPeriod || '',
    entity_type: 'company',
    entity_id: 'ALL',
    revenue_budget: '',
    cost_budget: '',
    margin_target: '15',
    notes: '',
  })

  const fetchBudgets = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/budgets`)
      if (response.ok) {
        const data = await response.json()
        setBudgets(data || [])
      }
    } catch (error) {
      console.error('Error fetching budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComparisons = async (period: string) => {
    try {
      const response = await fetch(`${API_URL}/api/budgets/compare/${encodeURIComponent(period)}`)
      if (response.ok) {
        const data = await response.json()
        setComparisons(data.comparisons || [])
      }
    } catch (error) {
      console.error('Error fetching comparisons:', error)
    }
  }

  const createBudget = async () => {
    try {
      const response = await fetch(`${API_URL}/api/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: formData.period,
          entity_type: formData.entity_type,
          entity_id: formData.entity_id,
          revenue_budget: parseFloat(formData.revenue_budget) || 0,
          cost_budget: parseFloat(formData.cost_budget) || 0,
          margin_target: parseFloat(formData.margin_target) || 15,
          notes: formData.notes || null,
        }),
      })
      if (response.ok) {
        setShowCreateForm(false)
        fetchBudgets()
        if (formData.period) {
          fetchComparisons(formData.period)
        }
      }
    } catch (error) {
      console.error('Error creating budget:', error)
    }
  }

  useEffect(() => {
    fetchBudgets()
    if (selectedPeriod) {
      fetchComparisons(selectedPeriod)
      setFormData(prev => ({ ...prev, period: selectedPeriod }))
    }
  }, [selectedPeriod])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_target': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
      case 'above_target': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'below_target': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on_target': return '目標達成'
      case 'above_target': return '目標超過'
      case 'below_target': return '目標未達'
      case 'critical': return '要注意'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:pl-[280px] pt-16 transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                予算管理
              </h1>
              <p className="text-muted-foreground mt-1">
                予算vs実績の比較分析
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchBudgets} disabled={loading} aria-label="予算データを更新">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                更新
              </Button>
              <Button onClick={() => setShowCreateForm(true)} aria-label="新規予算を作成">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                予算作成
              </Button>
            </div>
          </motion.div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">登録予算数</p>
                    <p className="text-2xl font-bold">{budgets.length}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">目標達成</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {comparisons.filter(c => c.status === 'on_target' || c.status === 'above_target').length}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">要改善</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {comparisons.filter(c => c.status === 'below_target' || c.status === 'critical').length}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create Budget Form */}
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>新規予算作成</CardTitle>
                  <CardDescription>期間と対象を選択して予算を設定</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">期間</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={formData.period}
                        onChange={e => setFormData({ ...formData, period: e.target.value })}
                        aria-label="予算期間を選択"
                      >
                        <option value="">選択...</option>
                        {availablePeriods.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">対象タイプ</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={formData.entity_type}
                        onChange={e => setFormData({ ...formData, entity_type: e.target.value })}
                        aria-label="予算対象タイプを選択"
                      >
                        <option value="company">会社全体</option>
                        <option value="dispatch_company">派遣先</option>
                        <option value="employee">従業員</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">対象ID</label>
                      <Input
                        value={formData.entity_id}
                        onChange={e => setFormData({ ...formData, entity_id: e.target.value })}
                        placeholder="ALL または 特定ID"
                        aria-label="予算対象ID"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">売上予算 (円)</label>
                      <Input
                        type="number"
                        value={formData.revenue_budget}
                        onChange={e => setFormData({ ...formData, revenue_budget: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">コスト予算 (円)</label>
                      <Input
                        type="number"
                        value={formData.cost_budget}
                        onChange={e => setFormData({ ...formData, cost_budget: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">目標マージン (%)</label>
                      <Input
                        type="number"
                        value={formData.margin_target}
                        onChange={e => setFormData({ ...formData, margin_target: e.target.value })}
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-1 block">メモ</label>
                    <Input
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="予算に関するメモ..."
                    />
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={createBudget} aria-label="予算を保存">
                      <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                      保存
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)} aria-label="予算作成をキャンセル">
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Budget vs Actual Comparisons */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                予算vs実績比較
              </CardTitle>
              <CardDescription>
                {selectedPeriod || '期間を選択してください'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comparisons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>この期間の予算データがありません</p>
                  <p className="text-sm">上の「予算作成」ボタンから予算を登録してください</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comparisons.map((comp, index) => (
                    <motion.div
                      key={`${comp.period}-${comp.entity_id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {comp.entity_type === 'company' ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{comp.entity_id}</span>
                          <Badge variant="outline">{comp.period}</Badge>
                        </div>
                        <Badge className={getStatusColor(comp.status)}>
                          {getStatusLabel(comp.status)}
                        </Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        {/* Revenue */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">売上</p>
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium">{formatYen(comp.actual.revenue)}</span>
                            <span className="text-xs text-muted-foreground">
                              / {formatYen(comp.budget.revenue)}
                            </span>
                          </div>
                          <p className={`text-xs ${comp.variance.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {comp.variance.revenue >= 0 ? '+' : ''}{formatPercent(comp.variance.revenue_pct)}
                          </p>
                        </div>

                        {/* Cost */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">コスト</p>
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium">{formatYen(comp.actual.cost)}</span>
                            <span className="text-xs text-muted-foreground">
                              / {formatYen(comp.budget.cost)}
                            </span>
                          </div>
                          <p className={`text-xs ${comp.variance.cost <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {comp.variance.cost >= 0 ? '+' : ''}{formatPercent(comp.variance.cost_pct)}
                          </p>
                        </div>

                        {/* Margin */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">マージン</p>
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium">{formatPercent(comp.actual.margin)}</span>
                            <span className="text-xs text-muted-foreground">
                              / {formatPercent(comp.budget.margin_target)}目標
                            </span>
                          </div>
                          <p className={`text-xs ${comp.variance.margin_diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {comp.variance.margin_diff >= 0 ? '+' : ''}{comp.variance.margin_diff.toFixed(1)}pt
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget List */}
          <Card>
            <CardHeader>
              <CardTitle>登録済み予算</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : budgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  予算が登録されていません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" role="table" aria-label="登録済み予算一覧">
                    <thead>
                      <tr className="border-b">
                        <th scope="col" className="text-left py-2 px-4">期間</th>
                        <th scope="col" className="text-left py-2 px-4">対象</th>
                        <th scope="col" className="text-right py-2 px-4">売上予算</th>
                        <th scope="col" className="text-right py-2 px-4">コスト予算</th>
                        <th scope="col" className="text-right py-2 px-4">目標マージン</th>
                        <th scope="col" className="text-left py-2 px-4">メモ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgets.map(budget => (
                        <tr key={budget.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{budget.period}</td>
                          <td className="py-2 px-4">
                            <Badge variant="outline">{budget.entity_type}</Badge>
                            <span className="ml-2">{budget.entity_id}</span>
                          </td>
                          <td className="py-2 px-4 text-right">{formatYen(budget.revenue_budget)}</td>
                          <td className="py-2 px-4 text-right">{formatYen(budget.cost_budget)}</td>
                          <td className="py-2 px-4 text-right">{formatPercent(budget.margin_target)}</td>
                          <td className="py-2 px-4 text-sm text-muted-foreground">{budget.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
