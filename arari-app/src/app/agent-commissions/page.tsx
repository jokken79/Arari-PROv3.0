'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  UserCheck,
  BadgeJapaneseYen,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  useAgents,
  useAgentCommission,
  useCheckRegistered,
  useRegisterCommission,
} from '@/hooks/useAgentCommissions'
import { usePayrollPeriods } from '@/hooks'
import { formatYen, comparePeriods } from '@/lib/utils'
import type { CommissionCompanyResult, CommissionEmployee } from '@/lib/api'

export default function AgentCommissionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  const [registeringCompany, setRegisteringCompany] = useState<string | null>(null)

  // Queries
  const { data: agents = [], isLoading: loadingAgents } = useAgents()
  const { data: periods = [] } = usePayrollPeriods()
  const {
    data: calculation,
    isLoading: loadingCalculation,
    error: calcError,
  } = useAgentCommission(selectedAgent || undefined, selectedPeriod || undefined)

  const registerMutation = useRegisterCommission()

  // Sort periods descending (newest first)
  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => comparePeriods(b, a))
  }, [periods])

  // Auto-select first agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0].id)
    }
  }, [agents, selectedAgent])

  // Auto-select latest period
  useEffect(() => {
    if (sortedPeriods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(sortedPeriods[0])
    }
  }, [sortedPeriods, selectedPeriod])

  const toggleExpand = (company: string) => {
    setExpandedCompanies((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(company)) {
        newSet.delete(company)
      } else {
        newSet.add(company)
      }
      return newSet
    })
  }

  const handleRegister = async (companyResult: CommissionCompanyResult) => {
    if (!selectedAgent || !selectedPeriod) return
    setRegisteringCompany(companyResult.company)

    try {
      const agent = agents.find((a) => a.id === selectedAgent)
      await registerMutation.mutateAsync({
        agentId: selectedAgent,
        period: selectedPeriod,
        company: companyResult.company,
        amount: companyResult.total_amount,
        notes: `${agent?.name || selectedAgent} 仲介手数料 (${companyResult.total_employees}名)`,
      })
    } catch (error) {
      console.error('Registration failed:', error)
    } finally {
      setRegisteringCompany(null)
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'vietnam_normal':
        return 'ベトナム (通常)'
      case 'vietnam_reduced':
        return 'ベトナム (欠勤/有給あり)'
      case 'other':
        return 'その他国籍'
      default:
        return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'vietnam_normal':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'vietnam_reduced':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'other':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-slate-100 text-slate-800'
    }
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
                  <UserCheck className="h-7 w-7 text-purple-500" />
                  仲介手数料管理
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  エージェント別の仲介手数料を計算・登録します
                </p>
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">エージェント</Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger aria-label="エージェントを選択">
                        <SelectValue placeholder="エージェントを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">期間</Label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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

                  {calculation && (
                    <div className="flex items-end">
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 w-full border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          合計手数料
                        </p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                          {formatYen(calculation.summary.total_amount)}
                        </p>
                        <p className="text-xs text-purple-500 dark:text-purple-400">
                          {calculation.summary.total_employees}名
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rate Info */}
            {calculation && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        ベトナム(通常)
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatYen(calculation.rules.vietnam_normal_rate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        ベトナム(欠勤/有給)
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatYen(calculation.rules.vietnam_reduced_rate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        その他国籍
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatYen(calculation.rules.other_rate)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {loadingCalculation && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-purple-500" />
                  <p className="text-slate-500 mt-2">計算中...</p>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {calcError && (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                  <p className="text-red-500">計算エラー: {calcError.message}</p>
                </CardContent>
              </Card>
            )}

            {/* No Data State */}
            {!loadingCalculation &&
              !calcError &&
              calculation &&
              calculation.companies.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">
                      この期間に該当する従業員がいません
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      給与データがアップロードされているか確認してください
                    </p>
                  </CardContent>
                </Card>
              )}

            {/* Results by Company */}
            {!loadingCalculation && calculation && calculation.companies.length > 0 && (
              <div className="space-y-4">
                {calculation.companies.map((companyResult) => (
                  <CompanyCard
                    key={companyResult.company}
                    result={companyResult}
                    agentId={selectedAgent}
                    period={selectedPeriod}
                    isExpanded={expandedCompanies.has(companyResult.company)}
                    onToggle={() => toggleExpand(companyResult.company)}
                    onRegister={() => handleRegister(companyResult)}
                    isRegistering={registeringCompany === companyResult.company}
                    getCategoryLabel={getCategoryLabel}
                    getCategoryColor={getCategoryColor}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// Company Card Component
function CompanyCard({
  result,
  agentId,
  period,
  isExpanded,
  onToggle,
  onRegister,
  isRegistering,
  getCategoryLabel,
  getCategoryColor,
}: {
  result: CommissionCompanyResult
  agentId: string
  period: string
  isExpanded: boolean
  onToggle: () => void
  onRegister: () => void
  isRegistering: boolean
  getCategoryLabel: (category: string) => string
  getCategoryColor: (category: string) => string
}) {
  const { data: checkData } = useCheckRegistered(agentId, period, result.company)
  const isRegistered = checkData?.registered || false

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={isRegistered ? 'border-green-200 dark:border-green-800' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onToggle}
              className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-400" />
              )}
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                {result.company}
              </CardTitle>
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-slate-500">{result.total_employees}名</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {formatYen(result.total_amount)}
                </p>
              </div>

              {isRegistered ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Check className="h-3 w-3 mr-1" />
                  登録済み
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={onRegister}
                  disabled={isRegistering}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      登録中
                    </>
                  ) : (
                    <>
                      <BadgeJapaneseYen className="h-4 w-4 mr-1" />
                      追加コストに登録
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {result.vietnam_normal.count > 0 && (
              <Badge variant="outline" className={getCategoryColor('vietnam_normal')}>
                {getCategoryLabel('vietnam_normal')}: {result.vietnam_normal.count}名 (
                {formatYen(result.vietnam_normal.amount)})
              </Badge>
            )}
            {result.vietnam_reduced.count > 0 && (
              <Badge variant="outline" className={getCategoryColor('vietnam_reduced')}>
                {getCategoryLabel('vietnam_reduced')}: {result.vietnam_reduced.count}名 (
                {formatYen(result.vietnam_reduced.amount)})
              </Badge>
            )}
            {result.other.count > 0 && (
              <Badge variant="outline" className={getCategoryColor('other')}>
                {getCategoryLabel('other')}: {result.other.count}名 (
                {formatYen(result.other.amount)})
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Expanded Employee List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0">
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-2 text-sm font-medium text-slate-500">
                          社員番号
                        </th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-slate-500">
                          氏名
                        </th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-slate-500">
                          国籍
                        </th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-slate-500">
                          出勤
                        </th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-slate-500">
                          有給
                        </th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-slate-500">
                          欠勤
                        </th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-slate-500">
                          カテゴリ
                        </th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-slate-500">
                          手数料
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...result.vietnam_normal.employees,
                        ...result.vietnam_reduced.employees,
                        ...result.other.employees,
                      ].map((emp) => (
                        <tr
                          key={emp.employee_id}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="py-2 px-2 text-sm font-mono">{emp.employee_id}</td>
                          <td className="py-2 px-2 font-medium">{emp.name}</td>
                          <td className="py-2 px-2 text-sm">{emp.nationality}</td>
                          <td className="py-2 px-2 text-center text-sm">{emp.work_days}日</td>
                          <td className="py-2 px-2 text-center text-sm">
                            {emp.paid_leave_days > 0 ? (
                              <span className="text-amber-600">{emp.paid_leave_days}日</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-2 text-center text-sm">
                            {emp.absence_days > 0 ? (
                              <span className="text-red-600">{emp.absence_days}日</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getCategoryColor(emp.category)}`}
                            >
                              {getCategoryLabel(emp.category)}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-right font-medium text-purple-600 dark:text-purple-400">
                            {formatYen(emp.rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
