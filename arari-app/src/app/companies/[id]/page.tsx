'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, Users, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { useAppStore } from '@/store/appStore'
import { formatYen, formatPercent, getProfitBgColor, comparePeriods } from '@/lib/utils'

interface MonthlyData {
  period: string
  employeeCount: number
  billingAmount: number      // 請求金額
  totalPaid: number          // 総支給額 (what we pay employees)
  totalCompanyCost: number   // 会社総コスト (including 法定福利費)
  grossProfit: number        // 粗利
  margin: number             // マージン率
}

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showEmployees, setShowEmployees] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const companyName = decodeURIComponent(params.id)

  const { employees, payrollRecords, refreshFromBackend } = useAppStore()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await refreshFromBackend()
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [refreshFromBackend])

  // Filter employees for this company
  const companyEmployees = useMemo(() =>
    employees.filter(emp => emp.dispatchCompany === companyName),
    [employees, companyName]
  )

  // Get employee IDs for this company
  const companyEmployeeIds = useMemo(() =>
    new Set(companyEmployees.map(e => e.employeeId)),
    [companyEmployees]
  )

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    // Filter payroll records for this company's employees
    const companyRecords = payrollRecords.filter(r => companyEmployeeIds.has(r.employeeId))

    // Group by period
    const periodMap = new Map<string, {
      employeeIds: Set<string>
      billingAmount: number
      totalPaid: number
      totalCompanyCost: number
      grossProfit: number
    }>()

    companyRecords.forEach(record => {
      const existing = periodMap.get(record.period)
      if (existing) {
        existing.employeeIds.add(record.employeeId)
        existing.billingAmount += record.billingAmount || 0
        existing.totalPaid += record.grossSalary || 0
        existing.totalCompanyCost += record.totalCompanyCost || 0
        existing.grossProfit += record.grossProfit || 0
      } else {
        periodMap.set(record.period, {
          employeeIds: new Set([record.employeeId]),
          billingAmount: record.billingAmount || 0,
          totalPaid: record.grossSalary || 0,
          totalCompanyCost: record.totalCompanyCost || 0,
          grossProfit: record.grossProfit || 0,
        })
      }
    })

    // Convert to array and calculate margin
    const result: MonthlyData[] = Array.from(periodMap.entries()).map(([period, data]) => ({
      period,
      employeeCount: data.employeeIds.size,
      billingAmount: data.billingAmount,
      totalPaid: data.totalPaid,
      totalCompanyCost: data.totalCompanyCost,
      grossProfit: data.grossProfit,
      margin: data.billingAmount > 0 ? (data.grossProfit / data.billingAmount) * 100 : 0,
    }))

    // Sort by period (newest first)
    return result.sort((a, b) => comparePeriods(b.period, a.period))
  }, [payrollRecords, companyEmployeeIds])

  // Calculate totals
  const totals = useMemo(() => {
    const total = monthlyData.reduce((acc, m) => ({
      billingAmount: acc.billingAmount + m.billingAmount,
      totalPaid: acc.totalPaid + m.totalPaid,
      totalCompanyCost: acc.totalCompanyCost + m.totalCompanyCost,
      grossProfit: acc.grossProfit + m.grossProfit,
    }), { billingAmount: 0, totalPaid: 0, totalCompanyCost: 0, grossProfit: 0 })

    return {
      ...total,
      margin: total.billingAmount > 0 ? (total.grossProfit / total.billingAmount) * 100 : 0,
      months: monthlyData.length,
    }
  }, [monthlyData])

  const handleBack = () => {
    router.push('/companies')
  }

  const handleViewEmployee = (employee: any) => {
    router.push(`/employees/${employee.employeeId}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    )
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
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                aria-label="派遣先一覧に戻る"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Building2 className="h-8 w-8" aria-hidden="true" />
                  </div>
                  {companyName}
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    登録従業員: {companyEmployees.length}名
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    {monthlyData.length}ヶ月分のデータ
                  </span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Summary Cards */}
          {monthlyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">累計請求金額</p>
                  <p className="text-2xl font-bold">{formatYen(totals.billingAmount)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">累計総支給額</p>
                  <p className="text-2xl font-bold">{formatYen(totals.totalPaid)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">累計粗利</p>
                  <p className="text-2xl font-bold text-emerald-500">{formatYen(totals.grossProfit)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">平均マージン率</p>
                  <Badge className={`text-lg ${getProfitBgColor(totals.margin)}`}>
                    {formatPercent(totals.margin)}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Monthly Data Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  月別収益データ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>データがありません</p>
                    <p className="text-sm mt-2">給与明細をアップロードすると、月別データが表示されます。</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" role="table" aria-label={`${companyName}の月別収益データ`}>
                      <thead>
                        <tr className="border-b">
                          <th scope="col" className="text-left py-3 px-4 font-medium text-muted-foreground">期間</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">従業員数</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">請求金額</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">総支給額</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">会社総コスト</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">粗利</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">マージン率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((month, index) => (
                          <motion.tr
                            key={month.period}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium">{month.period}</td>
                            <td className="py-3 px-4 text-right">{month.employeeCount}名</td>
                            <td className="py-3 px-4 text-right font-mono">{formatYen(month.billingAmount)}</td>
                            <td className="py-3 px-4 text-right font-mono">{formatYen(month.totalPaid)}</td>
                            <td className="py-3 px-4 text-right font-mono text-orange-500">{formatYen(month.totalCompanyCost)}</td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-500">{formatYen(month.grossProfit)}</td>
                            <td className="py-3 px-4 text-right">
                              <Badge className={getProfitBgColor(month.margin)}>
                                {formatPercent(month.margin)}
                              </Badge>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 font-bold">
                          <td className="py-3 px-4">合計 ({totals.months}ヶ月)</td>
                          <td className="py-3 px-4 text-right">-</td>
                          <td className="py-3 px-4 text-right font-mono">{formatYen(totals.billingAmount)}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatYen(totals.totalPaid)}</td>
                          <td className="py-3 px-4 text-right font-mono text-orange-500">{formatYen(totals.totalCompanyCost)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-500">{formatYen(totals.grossProfit)}</td>
                          <td className="py-3 px-4 text-right">
                            <Badge className={getProfitBgColor(totals.margin)}>
                              {formatPercent(totals.margin)}
                            </Badge>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Employee List (Collapsible) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                  onClick={() => setShowEmployees(!showEmployees)}
                  aria-expanded={showEmployees}
                  aria-controls="employee-list"
                >
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" aria-hidden="true" />
                    従業員一覧 ({companyEmployees.length}名)
                  </CardTitle>
                  {showEmployees ? (
                    <ChevronUp className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-5 w-5" aria-hidden="true" />
                  )}
                </Button>
              </CardHeader>
              {showEmployees && (
                <CardContent id="employee-list">
                  <EmployeeTable
                    employees={companyEmployees}
                    onView={handleViewEmployee}
                  />
                </CardContent>
              )}
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
