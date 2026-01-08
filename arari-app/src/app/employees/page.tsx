'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { useEmployees } from '@/hooks/useEmployees'
import type { Employee as BackendEmployee } from '@/lib/api'
import type { Employee as FrontendEmployee } from '@/types'
import toast from 'react-hot-toast'

export default function EmployeesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyFilter = searchParams.get('company')
  const sortParam = searchParams.get('sort')
  const orderParam = searchParams.get('order')

  // TanStack Query を使用してデータ取得
  const { data: backendEmployees, isLoading, error } = useEmployees({
    company: companyFilter || undefined,
  })

  // エラーハンドリング
  if (error) {
    toast.error(`従業員データの取得に失敗しました: ${error.message}`)
  }

  // バックエンドのEmployee型をフロントエンドの型に変換
  const employees: FrontendEmployee[] = (backendEmployees || []).map(emp => ({
    id: emp.employee_id,
    employeeId: emp.employee_id,
    name: emp.name,
    nameKana: emp.name_kana || '',
    dispatchCompany: emp.dispatch_company,
    department: emp.department || '',
    hourlyRate: emp.hourly_rate,
    billingRate: emp.billing_rate,
    employeeType: (emp.employee_type as 'haken' | 'ukeoi' | undefined) || 'haken',
    status: emp.status as 'active' | 'inactive' | 'pending',
    hireDate: emp.hire_date || '',
    createdAt: emp.created_at || new Date().toISOString(),
    updatedAt: emp.updated_at || new Date().toISOString(),
  }))

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
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              従業員一覧
              {companyFilter && (
                <span className="text-lg text-muted-foreground ml-4">
                  {companyFilter}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              派遣社員の情報と粗利分析
              {companyFilter && ` (${employees.length}名)`}
            </p>
          </motion.div>

          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* エラー状態 */}
          {error && !isLoading && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
              <p className="font-medium">データの取得に失敗しました</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          )}

          {/* データ表示 */}
          {!isLoading && !error && (
            <EmployeeTable
              employees={employees}
              onView={(employee) => router.push(`/employees/${employee.employeeId}`)}
              defaultSortField={(sortParam as any) || 'employeeId'}
              defaultSortDirection={(orderParam as any) || 'asc'}
            />
          )}
        </div>
      </main>
    </div>
  )
}
