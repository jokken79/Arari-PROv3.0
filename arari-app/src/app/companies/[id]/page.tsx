'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { useAppStore } from '@/store/appStore'

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const router = useRouter()
    const companyName = decodeURIComponent(params.id)

    const { employees, loadSampleData, useBackend, loadDataFromBackend } = useAppStore()

    useEffect(() => {
        if (employees.length === 0) {
            if (useBackend) {
                loadDataFromBackend().catch(() => loadSampleData())
            } else {
                loadSampleData()
            }
        }
    }, [employees.length, useBackend, loadDataFromBackend, loadSampleData])

    // Filter employees for this company
    const companyEmployees = employees.filter(
        emp => emp.dispatchCompany === companyName
    )

    const handleBack = () => {
        router.push('/companies')
    }

    const handleViewEmployee = (employee: any) => {
        router.push(`/employees/${employee.employeeId}`)
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
                        <div className="flex items-center gap-4 mb-4">
                            <Button variant="ghost" size="icon" onClick={handleBack}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                                        <Building2 className="h-8 w-8" />
                                    </div>
                                    {companyName}
                                </h1>
                                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    従業員一覧: {companyEmployees.length}名
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <EmployeeTable
                        employees={companyEmployees}
                        onView={handleViewEmployee}
                    />
                </div>
            </main>
        </div>
    )
}
