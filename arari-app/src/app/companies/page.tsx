'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, TrendingUp, Percent } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/appStore'
import { formatYen, formatPercent, getProfitBgColor } from '@/lib/utils'

export default function CompaniesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
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

  const companySummaries = useMemo(() => {
    const companyMap = new Map<string, {
      name: string
      employees: typeof employees
      totalProfit: number
      totalRevenue: number
    }>()

    employees.forEach(emp => {
      const existing = companyMap.get(emp.dispatchCompany)
      if (existing) {
        existing.employees.push(emp)
      } else {
        companyMap.set(emp.dispatchCompany, {
          name: emp.dispatchCompany,
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
        company.employees.some(e => e.employeeId === r.employeeId)
      )
      company.totalProfit = companyRecords.reduce((sum, r) => sum + r.grossProfit, 0)
      company.totalRevenue = companyRecords.reduce((sum, r) => sum + r.billingAmount, 0)
    })

    return Array.from(companyMap.values())
      .map(company => {
        // Only count employees that have payroll records in the latest period
        const activeEmployeeIds = new Set(
          latestRecords
            .filter(r => company.employees.some(e => e.employeeId === r.employeeId))
            .map(r => r.employeeId)
        )
        const activeEmployeeCount = activeEmployeeIds.size

        const avgHourlyRate = company.employees.reduce((sum, e) => sum + e.hourlyRate, 0) / company.employees.length
        const avgBillingRate = company.employees.reduce((sum, e) => sum + e.billingRate, 0) / company.employees.length
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
        }
      })
      // Filter out companies with no active employees in the current period
      .filter(company => company.employeeCount > 0)
      .sort((a, b) => b.totalMonthlyProfit - a.totalMonthlyProfit)
  }, [employees, payrollRecords])

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

      <main className="md:pl-[280px] transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              派遣先企業
            </h1>
            <p className="text-muted-foreground mt-1">
              取引先別の収益性分析 ({companySummaries.length}社)
            </p>
          </motion.div>

          {companySummaries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Building2 className="h-12 w-12 text-muted-foreground" />
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
          <div className="grid gap-6">
            {companySummaries.map((company, index) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => window.location.href = `/companies/${encodeURIComponent(company.name)}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${company.name}の詳細を表示`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Company Info */}
                      <div className="flex items-center gap-4 lg:w-64">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{company.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{company.employeeCount}名</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">月間売上</p>
                          <p className="text-lg font-semibold">
                            {formatYen(company.totalMonthlyRevenue)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">月間粗利</p>
                          <p className="text-lg font-semibold text-emerald-500">
                            {formatYen(company.totalMonthlyProfit)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">平均単価</p>
                          <p className="text-lg font-semibold">
                            {formatYen(company.avgBillingRate)}/h
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">マージン率</p>
                          <Badge className={getProfitBgColor(company.avgMargin)}>
                            {formatPercent(company.avgMargin)}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="lg:w-48 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">利益貢献度</span>
                          <span className="font-medium">
                            {((company.totalMonthlyProfit / maxProfit) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={(company.totalMonthlyProfit / maxProfit) * 100}
                          className="h-2"
                        />
                      </div>
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
  )
}
