'use client'

import { useEffect, useState } from 'react'
import { X, User, Building2, Calendar, TrendingUp, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatYen, formatPercent, getProfitBgColor, comparePeriods } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { useFocusTrap } from '@/hooks'
import type { Employee, PayrollRecord } from '@/types'

interface EmployeeDetailModalProps {
  employee: Employee
  isOpen: boolean
  onClose: () => void
}

export function EmployeeDetailModal({ employee, isOpen, onClose }: EmployeeDetailModalProps) {
  const { payrollRecords, useBackend, loadDataFromBackend } = useAppStore()
  const [employeeRecords, setEmployeeRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const focusTrapRef = useFocusTrap(isOpen)

  // Load data from backend if needed
  useEffect(() => {
    if (isOpen && employee && useBackend && payrollRecords.length === 0) {
      setLoading(true)
      loadDataFromBackend().finally(() => setLoading(false))
    } else if (isOpen && employee) {
      setLoading(false)
    }
  }, [isOpen, employee, useBackend, loadDataFromBackend, payrollRecords.length])

  // Filter records AFTER data is loaded (separate effect to avoid race condition)
  useEffect(() => {
    if (isOpen && employee && !loading) {
      // Filter records for this employee and sort by period (newest first)
      // Use comparePeriods to handle 2025年10月 > 2025年9月 correctly
      const records = payrollRecords
        .filter(r => r.employeeId === employee.employeeId)
        .sort((a, b) => comparePeriods(b.period, a.period))

      setEmployeeRecords(records)
    }
  }, [isOpen, employee, payrollRecords, loading])

  if (!isOpen) return null

  const profit = employee.billingRate - employee.hourlyRate
  const margin = (profit / employee.billingRate) * 100

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={focusTrapRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          aria-labelledby="employee-modal-title"
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/90 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <User className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h2 id="employee-modal-title" className="text-2xl font-bold text-white tracking-tight">{employee.nameKana || employee.name}</h2>
                  <p className="text-sm text-slate-400 font-mono tracking-wide">{employee.nameKana ? employee.name : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className={`${employee.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>
                  {employee.status === 'active' ? '在職中' : '退職'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  aria-label="閉じる"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 bg-gradient-to-br from-[#0a0a0a] to-[#111] p-6 space-y-6">
              {/* Employee Info */}
              <div className="glass-card rounded-xl overflow-hidden p-0">
                <div className="px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-bold text-slate-200">基本情報</h3>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">社員ID</p>
                    <p className="font-mono font-bold text-white text-lg">{employee.employeeId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">派遣先</p>
                    <p className="font-medium text-slate-200">{employee.dispatchCompany}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">時給</p>
                    <p className="font-bold text-slate-200 text-lg">{formatYen(employee.hourlyRate)}<span className="text-xs font-normal text-slate-500 ml-1">/h</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">単価</p>
                    <p className="font-bold text-indigo-400 text-lg">{formatYen(employee.billingRate)}<span className="text-xs font-normal text-slate-500 ml-1">/h</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">粗利/時間</p>
                    <p className="font-bold text-emerald-400 text-lg drop-shadow">{formatYen(profit)}<span className="text-xs font-normal text-slate-500 ml-1">/h</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">マージン率</p>
                    <Badge className={`${getProfitBgColor(margin)} border-0 text-white font-bold`}>
                      {formatPercent(margin)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">入社日</p>
                    <p className="text-sm text-slate-300">{new Date(employee.hireDate).toLocaleDateString('ja-JP')}</p>
                  </div>
                </div>
              </div>

              {/* Payroll Records */}
              <div className="glass-card rounded-xl overflow-hidden p-0 flex flex-col h-[500px]">
                <div className="px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl flex items-center gap-2 shrink-0">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  <h3 className="font-bold text-slate-200">給料明細 ({employeeRecords.length}期間)</h3>
                </div>

                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div
                      className="flex items-center justify-center h-40 text-slate-500"
                      aria-busy="true"
                      aria-live="polite"
                    >
                      データを読み込み中...
                    </div>
                  ) : employeeRecords.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-slate-500">
                      給料明細データがありません
                    </div>
                  ) : (
                    <table className="w-full text-sm" role="table" aria-label="給与明細履歴">
                      <thead className="bg-white/5 sticky top-0 backdrop-blur-md z-10">
                        <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                          <th scope="col" className="text-left py-3 px-4 font-medium">期間</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium">勤務日数</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium">労働時間</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium">残業</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium">有給日数</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium">総支給額</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium">請求金額</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium">粗利</th>
                          <th scope="col" className="text-right py-3 px-4 font-medium">率</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {employeeRecords.map((record) => {
                          const recordMargin = record.billingAmount > 0
                            ? (record.grossProfit / record.billingAmount) * 100
                            : 0

                          return (
                            <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                              <td className="py-3 px-4 font-bold text-indigo-300">{record.period}</td>
                              <td className="text-right py-3 px-4 text-slate-300">{record.workDays || '-'}<span className="text-xs text-slate-600 ml-0.5">日</span></td>
                              <td className="text-right py-3 px-4 text-slate-300">{record.workHours?.toFixed(1) || '-'}<span className="text-xs text-slate-600 ml-0.5">h</span></td>
                              <td className="text-right py-3 px-4 text-slate-300">
                                {record.overtimeHours ? <>{record.overtimeHours.toFixed(1)}<span className="text-xs text-slate-600 ml-0.5">h</span></> : '-'}
                              </td>
                              <td className="text-right py-3 px-4 text-slate-300">
                                {record.paidLeaveDays ? <>{record.paidLeaveDays}<span className="text-xs text-slate-600 ml-0.5">日</span></> : '-'}
                              </td>
                              <td className="text-right py-3 px-4 font-medium text-slate-300">
                                {formatYen(record.grossSalary)}
                              </td>
                              <td className="text-right py-3 px-4 font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                                {formatYen(record.billingAmount)}
                              </td>
                              <td className="text-right py-3 px-4 font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                                {formatYen(record.grossProfit)}
                              </td>
                              <td className="text-right py-3 px-4">
                                <Badge className={`${getProfitBgColor(recordMargin)} border-0 text-white font-bold`}>
                                  {formatPercent(recordMargin)}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      {employeeRecords.length > 0 && (
                        <tfoot className="bg-white/5 font-bold text-slate-200 border-t border-white/10 sticky bottom-0 backdrop-blur-md">
                          <tr>
                            <td className="py-3 px-4">合計</td>
                            <td className="text-right py-3 px-4">
                              {employeeRecords.reduce((sum, r) => sum + (r.workDays || 0), 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">日</span>
                            </td>
                            <td className="text-right py-3 px-4">
                              {employeeRecords.reduce((sum, r) => sum + (r.workHours || 0), 0).toFixed(1)}<span className="text-xs font-normal text-slate-500 ml-0.5">h</span>
                            </td>
                            <td className="text-right py-3 px-4">
                              {employeeRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(1)}<span className="text-xs font-normal text-slate-500 ml-0.5">h</span>
                            </td>
                            <td className="text-right py-3 px-4">
                              {employeeRecords.reduce((sum, r) => sum + (r.paidLeaveDays || 0), 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">日</span>
                            </td>
                            <td className="text-right py-3 px-4">
                              {formatYen(employeeRecords.reduce((sum, r) => sum + r.grossSalary, 0))}
                            </td>
                            <td className="text-right py-3 px-4 text-blue-400">
                              {formatYen(employeeRecords.reduce((sum, r) => sum + r.billingAmount, 0))}
                            </td>
                            <td className="text-right py-3 px-4 text-emerald-400">
                              {formatYen(employeeRecords.reduce((sum, r) => sum + r.grossProfit, 0))}
                            </td>
                            <td className="text-right py-3 px-4">
                              <Badge className={`${getProfitBgColor(margin)} border-0 text-white`}>
                                {formatPercent(margin)}
                              </Badge>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
