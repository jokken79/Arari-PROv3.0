'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MonthlyComparison } from '@/components/monthly/MonthlyComparison'
import { useAppStore } from '@/store/appStore'

export default function MonthlyPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { employees, payrollRecords, availablePeriods, loadSampleData } = useAppStore()

  useEffect(() => {
    if (employees.length === 0) {
      loadSampleData()
    }
  }, [employees.length, loadSampleData])

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
              月次分析
            </h1>
            <p className="text-muted-foreground mt-1">
              月別の粗利・コスト比較分析
            </p>
          </motion.div>

          <MonthlyComparison
            payrollRecords={payrollRecords}
            employees={employees}
            availablePeriods={availablePeriods}
          />
        </div>
      </main>
    </div>
  )
}
