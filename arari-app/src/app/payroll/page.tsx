'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { useEmployees, usePayrollRecords, usePayrollPeriods } from '@/hooks'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Users, Calendar, TrendingUp } from 'lucide-react'
import { comparePeriods } from '@/lib/utils'

export default function PayrollVerificationPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Fetch data using TanStack Query
    const { data: employees = [] } = useEmployees()
    const { data: payrollRecords = [] } = usePayrollRecords()
    const { data: availablePeriods = [] } = usePayrollPeriods()

    // Group records by period
    const recordsByPeriod = availablePeriods.map(period => ({
        period,
        count: payrollRecords.filter(r => r.period === period).length,
        employees: new Set(payrollRecords.filter(r => r.period === period).map(r => r.employee_id)).size,
        totalBilling: payrollRecords
            .filter(r => r.period === period)
            .reduce((sum, r) => sum + r.billing_amount, 0),
        totalProfit: payrollRecords
            .filter(r => r.period === period)
            .reduce((sum, r) => sum + r.gross_profit, 0),
    })).sort((a, b) => comparePeriods(b.period, a.period))

    const totalRecords = payrollRecords.length
    const uniqueEmployeesWithPayroll = new Set(payrollRecords.map(r => r.employee_id)).size

    return (
        <div className="min-h-screen bg-background">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main id="main-content" className="md:pl-[280px] pt-16 transition-all duration-300">
                <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            給料明細アップロード確認
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            インポートされた給料明細データの検証
                        </p>
                    </motion.div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <Card className="p-6 border-l-4 border-l-blue-500">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">総レコード数</p>
                                    <p className="text-3xl font-bold mt-1">{totalRecords}</p>
                                </div>
                                <FileText className="h-8 w-8 text-blue-500 opacity-50" />
                            </div>
                        </Card>

                        <Card className="p-6 border-l-4 border-l-green-500">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">期間数</p>
                                    <p className="text-3xl font-bold mt-1">{availablePeriods.length}</p>
                                </div>
                                <Calendar className="h-8 w-8 text-green-500 opacity-50" />
                            </div>
                        </Card>

                        <Card className="p-6 border-l-4 border-l-purple-500">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">給料データあり</p>
                                    <p className="text-3xl font-bold mt-1">{uniqueEmployeesWithPayroll}</p>
                                    <p className="text-xs text-muted-foreground mt-1">/ {employees.length} 従業員</p>
                                </div>
                                <Users className="h-8 w-8 text-purple-500 opacity-50" />
                            </div>
                        </Card>

                        <Card className="p-6 border-l-4 border-l-orange-500">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">ステータス</p>
                                    <Badge className="mt-2 bg-green-500">
                                        {totalRecords > 0 ? 'データあり' : 'データなし'}
                                    </Badge>
                                </div>
                                <TrendingUp className="h-8 w-8 text-orange-500 opacity-50" />
                            </div>
                        </Card>
                    </div>

                    {/* Period Breakdown */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">期間別データ</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table" aria-label="期間別給料明細データ">
                                <thead>
                                    <tr className="border-b">
                                        <th scope="col" className="text-left py-3 px-4">期間</th>
                                        <th scope="col" className="text-right py-3 px-4">レコード数</th>
                                        <th scope="col" className="text-right py-3 px-4">従業員数</th>
                                        <th scope="col" className="text-right py-3 px-4">総請求額</th>
                                        <th scope="col" className="text-right py-3 px-4">総粗利</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recordsByPeriod.map(({ period, count, employees, totalBilling, totalProfit }) => (
                                        <tr key={period} className="border-b hover:bg-accent/50 transition-colors">
                                            <td className="py-3 px-4 font-medium">{period}</td>
                                            <td className="text-right py-3 px-4">
                                                <Badge variant="outline">{count} 件</Badge>
                                            </td>
                                            <td className="text-right py-3 px-4">{employees} 名</td>
                                            <td className="text-right py-3 px-4">
                                                ¥{totalBilling.toLocaleString()}
                                            </td>
                                            <td className="text-right py-3 px-4 font-semibold text-green-600">
                                                ¥{totalProfit.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {recordsByPeriod.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>給料明細データがありません</p>
                                    <p className="text-sm mt-2">アップロードページからファイルをインポートしてください</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    )
}
