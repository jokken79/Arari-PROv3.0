'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Factory, Users, TrendingUp, TrendingDown, CircleDollarSign, Award } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useEmployees, usePayrollRecords, useIgnoredCompanies, useToggleCompany } from '@/hooks'
import { formatYen, formatPercent } from '@/lib/utils'

// Margin performance status helper
const getMarginStatus = (margin: number) => {
  if (margin >= 12) return {
    level: 'excellent',
    label: '優良',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-500',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-600'
  }
  if (margin >= 10) return {
    level: 'good',
    label: '良好',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-500',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-green-600'
  }
  if (margin >= 7) return {
    level: 'warning',
    label: '要改善',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-500',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-amber-600'
  }
  return {
    level: 'critical',
    label: '要注意',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-500',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-red-600'
  }
}
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CompaniesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  // Fetch data using TanStack Query
  const { data: employees = [], isLoading: employeesLoading } = useEmployees()
  const { data: payrollRecords = [], isLoading: payrollLoading } = usePayrollRecords()
  const { data: ignoredCompanies = [], isLoading: ignoredLoading } = useIgnoredCompanies()
  const toggleCompany = useToggleCompany()

  const isLoading = employeesLoading || payrollLoading || ignoredLoading

  const companySummaries = useMemo(() => {
    const companyMap = new Map<string, {
      name: string
      employees: typeof employees
      totalProfit: number
      totalRevenue: number
    }>()

    employees.forEach(emp => {
      const existing = companyMap.get(emp.dispatch_company)
      if (existing) {
        existing.employees.push(emp)
      } else {
        companyMap.set(emp.dispatch_company, {
          name: emp.dispatch_company,
          employees: [emp],
          totalProfit: 0,
          totalRevenue: 0,
        })
      }
    })

    // Get latest period records
    const periods = Array.from(new Set(payrollRecords.map(r => r.period))).sort().reverse()
    const latestPeriod = periods[0]
    const latestRecords = payrollRecords.filter(r => r.period === latestPeriod)

    // Calculate totals for each company
    companyMap.forEach((company, key) => {
      const companyRecords = latestRecords.filter(r =>
        company.employees.some(e => e.employee_id === r.employee_id)
      )
      company.totalProfit = companyRecords.reduce((sum, r) => sum + r.gross_profit, 0)
      company.totalRevenue = companyRecords.reduce((sum, r) => sum + r.billing_amount, 0)
    })

    return Array.from(companyMap.values())
      .map(company => {
        // Only count employees that have payroll records in the latest period
        const activeEmployeeIds = new Set(
          latestRecords
            .filter(r => company.employees.some(e => e.employee_id === r.employee_id))
            .map(r => r.employee_id)
        )
        const activeEmployeeCount = activeEmployeeIds.size

        const avgHourlyRate = company.employees.reduce((sum, e) => sum + e.hourly_rate, 0) / company.employees.length
        const avgBillingRate = company.employees.reduce((sum, e) => sum + e.billing_rate, 0) / company.employees.length
        const avgProfit = avgBillingRate - avgHourlyRate
        const avgMargin = avgBillingRate > 0 ? (avgProfit / avgBillingRate) * 100 : 0

        return {
          name: company.name,
          employeeCount: activeEmployeeCount, // Only count active employees with payroll
          totalEmployees: company.employees.length, // Total registered employees
          avgHourlyRate,
          avgBillingRate,
          avgProfit,
          avgMargin,
          totalMonthlyProfit: company.totalProfit,
          totalMonthlyRevenue: company.totalRevenue,
          isActive: !ignoredCompanies.includes(company.name)
        }
      })
      // Filter out companies with no active employees in the current period
      .filter(company => company.employeeCount > 0)
      // Filter based on active status
      .filter(company => showInactive || company.isActive)
      .sort((a, b) => b.totalMonthlyProfit - a.totalMonthlyProfit)
  }, [employees, payrollRecords, ignoredCompanies, showInactive])

  const maxProfit = Math.max(...companySummaries.map(c => c.totalMonthlyProfit), 1)

  // Show loading state
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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                派遣先企業
              </h1>
              <p className="text-muted-foreground mt-1">
                取引先別の収益性分析 ({companySummaries.length}社)
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-card p-2 rounded-lg border shadow-sm">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
                無効な企業を表示
              </Label>
            </div>
          </motion.div>

          {companySummaries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Factory className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">データがありません</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                給与明細Excelファイルをアップロードすると、
                派遣先企業別の分析結果が表示されます。
              </p>
              <a
                href="/upload"
                aria-label="給与明細ファイルをアップロード"
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                ファイルをアップロード
              </a>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {companySummaries.map((company, index) => {
                const marginStatus = getMarginStatus(company.avgMargin)
                const isProfitable = company.totalMonthlyProfit > 0
                const isTopPerformer = index < 3 && company.avgMargin >= 12
                const contributionPercent = (company.totalMonthlyProfit / maxProfit) * 100

                return (
                  <motion.div
                    key={company.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    className="group relative"
                  >
                    {/* Top Performer Badge */}
                    {isTopPerformer && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                          <Award className="w-3 h-3" />
                          TOP
                        </div>
                      </div>
                    )}

                    <Card
                      className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl border-2 ${
                        !company.isActive
                          ? 'opacity-50 bg-muted/30 border-muted'
                          : `hover:border-blue-300 dark:hover:border-blue-700 ${marginStatus.borderColor}`
                      }`}
                      onClick={() => window.location.href = `/companies/${encodeURIComponent(company.name)}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${company.name}の詳細を表示`}
                    >
                      {/* Colored top strip based on margin */}
                      <div className={`h-1 bg-gradient-to-r ${marginStatus.gradientFrom} ${marginStatus.gradientTo}`} />

                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                          {/* Company Header */}
                          <div className="flex items-start gap-4 lg:w-56 flex-shrink-0">
                            {/* Icon with status-based background */}
                            <div className={`${marginStatus.bgColor} ${marginStatus.borderColor} border-2 rounded-xl p-3 transition-colors duration-300`}>
                              <Factory className={`w-6 h-6 ${marginStatus.iconColor}`} strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                {company.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                <Users className="w-4 h-4" />
                                <span className="font-medium">{company.employeeCount}名</span>
                              </div>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Monthly Revenue */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-1.5 mb-1">
                                <CircleDollarSign className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">月間売上</span>
                              </div>
                              <div className="text-base font-bold text-foreground tabular-nums">
                                ¥{(company.totalMonthlyRevenue / 10000).toFixed(0)}
                                <span className="text-xs font-normal text-muted-foreground ml-0.5">万</span>
                              </div>
                            </div>

                            {/* Monthly Profit */}
                            <div className={`rounded-lg p-3 border ${
                              isProfitable
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                            }`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                {isProfitable ? (
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                                ) : (
                                  <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                                )}
                                <span className={`text-xs font-medium ${isProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                  月間粗利
                                </span>
                              </div>
                              <div className={`text-base font-bold tabular-nums ${isProfitable ? 'text-emerald-900 dark:text-emerald-300' : 'text-red-900 dark:text-red-300'}`}>
                                ¥{(company.totalMonthlyProfit / 10000).toFixed(0)}
                                <span className={`text-xs font-normal ml-0.5 ${isProfitable ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>万</span>
                              </div>
                            </div>

                            {/* Average Rate */}
                            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-400 block mb-1">平均単価</span>
                              <div className="text-base font-bold text-blue-900 dark:text-blue-300 tabular-nums">
                                ¥{company.avgBillingRate.toLocaleString()}
                                <span className="text-xs font-normal text-blue-600 dark:text-blue-500 ml-0.5">/h</span>
                              </div>
                            </div>

                            {/* Margin Rate - Prominent */}
                            <div className={`${marginStatus.bgColor} rounded-lg p-3 border-2 ${marginStatus.borderColor}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-semibold ${marginStatus.textColor}`}>マージン率</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${marginStatus.bgColor} ${marginStatus.textColor}`}>
                                  {marginStatus.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {company.avgMargin >= 10 ? (
                                  <TrendingUp className={`w-4 h-4 ${marginStatus.iconColor}`} />
                                ) : (
                                  <TrendingDown className={`w-4 h-4 ${marginStatus.iconColor}`} />
                                )}
                                <span className={`text-xl font-bold ${marginStatus.textColor} tabular-nums`}>
                                  {company.avgMargin.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Profit Contribution */}
                          <div className="lg:w-40 space-y-2 flex-shrink-0">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground text-xs font-medium">利益貢献度</span>
                              <span className="font-bold text-foreground">{contributionPercent.toFixed(0)}%</span>
                            </div>
                            <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 bg-gradient-to-r ${
                                  contributionPercent >= 20
                                    ? 'from-emerald-500 to-emerald-600'
                                    : contributionPercent >= 10
                                    ? 'from-blue-500 to-blue-600'
                                    : 'from-slate-400 to-slate-500'
                                }`}
                                style={{ width: `${Math.min(Math.max(contributionPercent, 0), 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Toggle Action */}
                          <div className="flex items-center justify-end lg:w-10 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCompany.mutate({
                                  name: company.name,
                                  active: !company.isActive
                                })
                              }}
                              title={company.isActive ? "この企業を無効にする" : "この企業を有効にする"}
                            >
                              {company.isActive ? (
                                <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                              ) : (
                                <EyeOff className="h-5 w-5 text-muted-foreground hover:text-red-500 transition-colors" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
