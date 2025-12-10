'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { useAppStore } from '@/store/appStore'
import type { Employee } from '@/types'

export default function EmployeesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyFilter = searchParams.get('company')

  const { employees, useBackend, loadDataFromBackend, loadSampleData } = useAppStore()

  useEffect(() => {
    if (employees.length === 0) {
      // Try backend first, fall back to sample data if it fails
      if (useBackend) {
        loadDataFromBackend().catch(() => {
          loadSampleData()
        })
      } else {
        loadSampleData()
      }
    }
  }, [employees.length, useBackend, loadDataFromBackend, loadSampleData])

  // Filter employees by company if specified
  const filteredEmployees = companyFilter
    ? employees.filter(emp => emp.dispatchCompany === companyFilter)
    : employees

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
              従業員一覧
              {companyFilter && (
                <span className="text-lg text-muted-foreground ml-4">
                  {companyFilter}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              派遣社員の情報と粗利分析
              {companyFilter && ` (${filteredEmployees.length}名)`}
            </p>
          </motion.div>

          <EmployeeTable
            employees={filteredEmployees}
            onView={(employee) => router.push(`/employees/${employee.employeeId}`)}
          />
        </div>
      </main>
    </div>
  )
}
