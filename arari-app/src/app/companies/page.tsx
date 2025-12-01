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
  const { employees, payrollRecords, loadSampleData } = useAppStore()

  useEffect(() => {
    if (employees.length === 0) {
      loadSampleData()
    }
  }, [employees.length, loadSampleData])

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
        const avgHourlyRate = company.employees.reduce((sum, e) => sum + e.hourlyRate, 0) / company.employees.length
        const avgBillingRate = company.employees.reduce((sum, e) => sum + e.billingRate, 0) / company.employees.length
        const avgProfit = avgBillingRate - avgHourlyRate
        const avgMargin = (avgProfit / avgBillingRate) * 100

        return {
          name: company.name,
          employeeCount: company.employees.length,
          avgHourlyRate,
          avgBillingRate,
          avgProfit,
          avgMargin,
          totalMonthlyProfit: company.totalProfit,
          totalMonthlyRevenue: company.totalRevenue,
        }
      })
      .sort((a, b) => b.totalMonthlyProfit - a.totalMonthlyProfit)
  }, [employees, payrollRecords])

  const maxProfit = Math.max(...companySummaries.map(c => c.totalMonthlyProfit))

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
              取引先別の収益性分析
            </p>
          </motion.div>

          <div className="grid gap-6">
            {companySummaries.map((company, index) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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
        </div>
      </main>
    </div>
  )
}
