'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Edit2,
  Bus,
  Building2,
  Calendar,
  Copy,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/confirm-dialog'
import {
  useAdditionalCosts,
  useCreateAdditionalCost,
  useUpdateAdditionalCost,
  useDeleteAdditionalCost,
  useCopyAdditionalCosts,
  useCompanies,
  usePayrollPeriods,
} from '@/hooks'
import { COST_TYPES, AdditionalCost, AdditionalCostCreate } from '@/lib/api'
import { formatYen, comparePeriods } from '@/lib/utils'

export default function AdditionalCostsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<AdditionalCost | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState<AdditionalCostCreate>({
    dispatch_company: '',
    period: '',
    cost_type: 'transport_bus',
    amount: 0,
    notes: '',
  })

  // Copy dialog state
  const [copySource, setCopySource] = useState<string>('')
  const [copyTarget, setCopyTarget] = useState<string>('')

  // Queries
  const { data: companies = [] } = useCompanies()
  const { data: periods = [] } = usePayrollPeriods()
  const { data: costs = [], isLoading } = useAdditionalCosts(
    selectedCompany || undefined,
    selectedPeriod || undefined
  )

  // Sort periods descending (newest first)
  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => comparePeriods(b, a))
  }, [periods])

  // Mutations
  const createMutation = useCreateAdditionalCost()
  const updateMutation = useUpdateAdditionalCost()
  const deleteMutation = useDeleteAdditionalCost()
  const copyMutation = useCopyAdditionalCosts()

  // Group costs by company for display
  const costsByCompany = useMemo(() => {
    const grouped = new Map<string, AdditionalCost[]>()
    costs.forEach((cost) => {
      const existing = grouped.get(cost.dispatch_company) || []
      grouped.set(cost.dispatch_company, [...existing, cost])
    })
    return grouped
  }, [costs])

  // Calculate totals
  const totalCosts = useMemo(() => {
    return costs.reduce((sum, cost) => sum + cost.amount, 0)
  }, [costs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCost) {
        await updateMutation.mutateAsync({
          id: editingCost.id,
          cost_type: formData.cost_type,
          amount: formData.amount,
          notes: formData.notes,
        })
      } else {
        await createMutation.mutateAsync(formData)
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Failed to save cost:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      dispatch_company: '',
      period: '',
      cost_type: 'transport_bus',
      amount: 0,
      notes: '',
    })
    setEditingCost(null)
  }

  const handleEdit = (cost: AdditionalCost) => {
    setEditingCost(cost)
    setFormData({
      dispatch_company: cost.dispatch_company,
      period: cost.period,
      cost_type: cost.cost_type,
      amount: cost.amount,
      notes: cost.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteId(null)
    } catch (error) {
      console.error('Failed to delete cost:', error)
    }
  }

  const handleCopy = async () => {
    if (!copySource || !copyTarget) return
    try {
      await copyMutation.mutateAsync({
        sourcePeriod: copySource,
        targetPeriod: copyTarget,
      })
      setIsCopyDialogOpen(false)
      setCopySource('')
      setCopyTarget('')
    } catch (error) {
      console.error('Failed to copy costs:', error)
    }
  }

  const openNewDialog = () => {
    resetForm()
    // Pre-fill with selected filters
    if (selectedCompany) {
      setFormData((prev) => ({ ...prev, dispatch_company: selectedCompany }))
    }
    if (selectedPeriod) {
      setFormData((prev) => ({ ...prev, period: selectedPeriod }))
    }
    setIsDialogOpen(true)
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bus className="h-7 w-7 text-blue-500" />
                  追加コスト管理
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  企業別の追加費用（送迎バス等）を管理します
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCopyDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  期間コピー
                </Button>
                <Button onClick={openNewDialog} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  新規追加
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">期間</Label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger aria-label="期間を選択">
                        <SelectValue placeholder="すべての期間" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">すべての期間</SelectItem>
                        {sortedPeriods.map((period) => (
                          <SelectItem key={period} value={period}>
                            {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">企業</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger aria-label="企業を選択">
                        <SelectValue placeholder="すべての企業" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">すべての企業</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company} value={company}>
                            {company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 w-full">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        合計追加コスト
                      </p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatYen(totalCosts)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Costs List */}
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  読み込み中...
                </CardContent>
              </Card>
            ) : costs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    追加コストはまだ登録されていません
                  </p>
                  <Button onClick={openNewDialog} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    最初のコストを追加
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Array.from(costsByCompany.entries()).map(([company, companyCosts]) => (
                  <motion.div
                    key={company}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-500" />
                            {company}
                          </CardTitle>
                          <Badge variant="secondary" className="text-red-600">
                            合計: {formatYen(companyCosts.reduce((s, c) => s + c.amount, 0))}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-2 px-3 text-sm font-medium text-slate-500">
                                  期間
                                </th>
                                <th className="text-left py-2 px-3 text-sm font-medium text-slate-500">
                                  コストタイプ
                                </th>
                                <th className="text-right py-2 px-3 text-sm font-medium text-slate-500">
                                  金額
                                </th>
                                <th className="text-left py-2 px-3 text-sm font-medium text-slate-500">
                                  備考
                                </th>
                                <th className="text-right py-2 px-3 text-sm font-medium text-slate-500">
                                  操作
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {companyCosts
                                .sort((a, b) => comparePeriods(b.period, a.period))
                                .map((cost) => (
                                  <tr
                                    key={cost.id}
                                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                  >
                                    <td className="py-3 px-3">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium">{cost.period}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <Badge
                                        variant="outline"
                                        className={
                                          cost.cost_type === 'transport_bus'
                                            ? 'border-blue-300 text-blue-700 dark:text-blue-400'
                                            : ''
                                        }
                                      >
                                        {cost.cost_type_label ||
                                          COST_TYPES[cost.cost_type] ||
                                          cost.cost_type}
                                      </Badge>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <span className="font-semibold text-red-600 dark:text-red-400">
                                        {formatYen(cost.amount)}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-slate-500 text-sm">
                                      {cost.notes || '-'}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEdit(cost)}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setDeleteId(cost.id)}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Dialog */}
      <AnimatePresence>
        {isDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingCost ? '追加コストを編集' : '新規追加コスト'}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingCost && (
                  <>
                    <div>
                      <Label>企業 *</Label>
                      <Select
                        value={formData.dispatch_company}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, dispatch_company: v }))
                        }
                      >
                        <SelectTrigger aria-label="企業を選択">
                          <SelectValue placeholder="企業を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company} value={company}>
                              {company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>期間 *</Label>
                      <Select
                        value={formData.period}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, period: v }))
                        }
                      >
                        <SelectTrigger aria-label="期間を選択">
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
                  </>
                )}

                <div>
                  <Label>コストタイプ *</Label>
                  <Select
                    value={formData.cost_type}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, cost_type: v }))
                    }
                  >
                    <SelectTrigger aria-label="コストタイプを選択">
                      <SelectValue placeholder="タイプを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COST_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>金額 (円) *</Label>
                  <Input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="150000"
                    min="0"
                    step="1"
                    aria-label="金額を入力"
                  />
                </div>

                <div>
                  <Label>備考</Label>
                  <Input
                    value={formData.notes || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="任意のメモ"
                    aria-label="備考を入力"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      (!editingCost &&
                        (!formData.dispatch_company || !formData.period)) ||
                      !formData.amount
                    }
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {editingCost ? '更新' : '追加'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Dialog */}
      <AnimatePresence>
        {isCopyDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsCopyDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">期間コピー</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCopyDialogOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  既存の期間のコストを別の期間にコピーします。
                </p>

                <div>
                  <Label>コピー元の期間</Label>
                  <Select value={copySource} onValueChange={setCopySource}>
                    <SelectTrigger aria-label="コピー元の期間を選択">
                      <SelectValue placeholder="コピー元を選択" />
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

                <div>
                  <Label>コピー先の期間</Label>
                  <Select value={copyTarget} onValueChange={setCopyTarget}>
                    <SelectTrigger aria-label="コピー先の期間を選択">
                      <SelectValue placeholder="コピー先を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedPeriods.map((period) => (
                        <SelectItem
                          key={period}
                          value={period}
                          disabled={period === copySource}
                        >
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsCopyDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCopy}
                    disabled={
                      !copySource || !copyTarget || copyMutation.isPending
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    コピー実行
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              この追加コストを削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
