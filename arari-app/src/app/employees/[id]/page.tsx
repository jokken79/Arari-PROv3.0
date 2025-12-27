'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Calendar, FileText, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import { formatYen, comparePeriods } from '@/lib/utils'
import { PayrollSlipModal } from '@/components/payroll/PayrollSlipModal'

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<any>(null)

    const router = useRouter()
    const employeeId = params.id

    const { employees, payrollRecords, loadSampleData, useBackend, loadDataFromBackend } = useAppStore()

    useEffect(() => {
        if (employees.length === 0) {
            if (useBackend) {
                loadDataFromBackend().catch(() => loadSampleData())
            } else {
                loadSampleData()
            }
        }
    }, [employees.length, useBackend, loadDataFromBackend, loadSampleData])

    const employee = employees.find(e => e.employeeId === employeeId)

    // Sort records descending by period (newest first)
    // Use comparePeriods to handle 2025年10月 > 2025年9月 correctly
    const employeeRecords = payrollRecords
        .filter(r => r.employeeId === employeeId)
        .sort((a, b) => comparePeriods(b.period, a.period))

    const handleBack = () => {
        router.back()
    }

    if (!employee && employees.length > 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">従業員が見つかりません</h1>
                    <Button onClick={handleBack} className="mt-4">戻る</Button>
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
                        className="mb-8"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <Button variant="ghost" size="icon" onClick={handleBack}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            {employee && (
                                <div>
                                    <h1 className="text-3xl font-bold flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                                            <User className="h-8 w-8" />
                                        </div>
                                        {employee.name}
                                    </h1>
                                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                                        <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{employee.employeeId}</span>
                                        {employee.dispatchCompany}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>


                    {/* Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Wage Ledger Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card
                                className="group hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 to-transparent"
                                onClick={() => router.push(`/employees/${params.id}/wage-ledger`)}
                            >
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-full bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">賃金台帳 (Wage Ledger)</h3>
                                            <p className="text-sm text-gray-500">View annual ledger & export Excel</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-purple-500 transition-colors" />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Payroll History List */}

                    <div className="grid gap-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            給与明細履歴
                        </h2>

                        {employeeRecords.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center text-muted-foreground">
                                    給与データがありません
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-3">
                                {employeeRecords.map((record, index) => (
                                    <motion.div
                                        key={record.period}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card
                                            className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                                            onClick={() => setSelectedRecord(record)}
                                        >
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-lg">{record.period}</p>
                                                        <p className="text-xs text-muted-foreground">支給明細書</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    {(record.paidLeaveAmount || 0) > 0 && (() => {
                                                        // Calculate paid leave days if missing or for better accuracy
                                                        const dailyWorkHours = (record.workDays && record.workDays > 0 && record.workHours)
                                                            ? record.workHours / record.workDays
                                                            : 8

                                                        const hourlyRate = employee?.hourlyRate || 0
                                                        const leaveHours = hourlyRate > 0
                                                            ? (record.paidLeaveAmount || 0) / hourlyRate
                                                            : record.paidLeaveHours || 0

                                                        const rawDays = dailyWorkHours > 0 ? leaveHours / dailyWorkHours : 0
                                                        // Round to nearest 0.5
                                                        const roundedDays = Math.round(rawDays * 2) / 2

                                                        return (
                                                            <div className="text-right hidden xl:block">
                                                                <p className="text-xs text-muted-foreground">有給</p>
                                                                <p className="font-mono">
                                                                    <span className="text-sm mr-2">{roundedDays.toFixed(1)}日</span>
                                                                    {formatYen(record.paidLeaveAmount)}
                                                                </p>
                                                            </div>
                                                        )
                                                    })()}
                                                    <div className="text-right hidden lg:block">
                                                        <p className="text-xs text-muted-foreground">請求金額</p>
                                                        <p className="font-mono">{formatYen(record.billingAmount)}</p>
                                                    </div>
                                                    <div className="text-right hidden lg:block">
                                                        <p className="text-xs text-muted-foreground">粗利</p>
                                                        <p className={`font-mono font-medium ${(record.grossProfit || 0) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                            {formatYen(record.grossProfit)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-xs text-muted-foreground">総支給額</p>
                                                        <p className="font-mono font-medium">{formatYen(record.grossSalary)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">差引支給額</p>
                                                        <p className="font-mono font-bold text-blue-600">{formatYen(record.netSalary)}</p>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payroll Slip Modal */}
                    {selectedRecord && employee && (
                        <PayrollSlipModal
                            isOpen={!!selectedRecord}
                            onClose={() => setSelectedRecord(null)}
                            record={selectedRecord}
                            employee={employee}
                        />
                    )}
                </div>
            </main>
        </div>
    )
}
