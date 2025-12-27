'use client'

import { useMemo } from 'react'
import { formatYen } from '@/lib/utils'
import { PayrollRecord, Employee } from '@/types'
import { X, ArrowLeft, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { getMarginColors } from './PayrollSlipHelpers'
import { SalaryDetailsColumn } from './SalaryDetailsColumn'
import { BillingCalculationColumn } from './BillingCalculationColumn'
import { ProfitAnalysisColumn } from './ProfitAnalysisColumn'

interface PayrollSlipModalProps {
  isOpen: boolean
  onClose: () => void
  record: PayrollRecord
  employee: Employee
}

/**
 * PayrollSlipModal - Main modal component for displaying payroll slip details
 *
 * This component has been refactored into sub-components for better maintainability:
 * - SalaryDetailsColumn: Column 1 - 給与支給明細
 * - BillingCalculationColumn: Column 2 - 請求金額計算
 * - ProfitAnalysisColumn: Column 3 - 粗利分析
 *
 * @see PayrollSlipHelpers.tsx for shared helper components
 */
export function PayrollSlipModal({ isOpen, onClose, record, employee }: PayrollSlipModalProps) {
  const { settings } = useAppStore()

  // Memoized header calculations
  const headerData = useMemo(() => {
    const marginRate = record.billingAmount > 0
      ? (record.grossProfit / record.billingAmount) * 100
      : 0
    const targetMargin = settings.target_margin || 15
    const marginColor = getMarginColors(marginRate, targetMargin)

    // Calculate total company benefits for display
    const companyHealthIns = record.socialInsurance || 0
    const companyWelfarePension = record.welfarePension || 0
    const companySocialIns = record.companySocialInsurance || (companyHealthIns + companyWelfarePension)
    const empInsRate = settings.employment_insurance_rate || 0.009
    const workersCompRate = settings.workers_comp_rate || 0.003
    const companyEmploymentIns = record.companyEmploymentInsurance || Math.round((record.grossSalary || 0) * empInsRate)
    const companyWorkersComp = record.companyWorkersComp || Math.round((record.grossSalary || 0) * workersCompRate)
    const totalCompanyBenefits = companySocialIns + companyEmploymentIns + companyWorkersComp

    return {
      marginRate,
      marginColor,
      totalCompanyCost: record.totalCompanyCost || (record.grossSalary + totalCompanyBenefits)
    }
  }, [record, settings])

  if (!record || !isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payroll-modal-title"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-7xl my-4 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl flex flex-col max-h-[95vh]"
        >
          {/* Header */}
          <ModalHeader
            record={record}
            employee={employee}
            headerData={headerData}
            onClose={onClose}
          />

          {/* Company Name Bar */}
          <CompanyNameBar employee={employee} />

          {/* Main Content - 3 Columns */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gradient-to-br from-[#0a0a0a] to-[#111]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <SalaryDetailsColumn record={record} employee={employee} />
              <BillingCalculationColumn record={record} employee={employee} />
              <ProfitAnalysisColumn record={record} employee={employee} settings={settings} />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// Header Component
function ModalHeader({
  record,
  employee,
  headerData,
  onClose
}: {
  record: PayrollRecord
  employee: Employee
  headerData: {
    marginRate: number
    marginColor: ReturnType<typeof getMarginColors>
    totalCompanyCost: number
  }
  onClose: () => void
}) {
  const { marginRate, marginColor, totalCompanyCost } = headerData

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-muted/50 border-b border-border shrink-0 backdrop-blur-xl">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="閉じる"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-muted-foreground hidden sm:inline">戻る</span>
      </div>

      {/* Period Badge + Name */}
      <div className="flex items-center gap-3 sm:gap-6">
        <span className="px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm shadow-sm">
          {record.period}
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <span id="payroll-modal-title" className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
            {employee.nameKana || employee.name}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground font-mono">
            ({employee.employeeId})
          </span>
        </div>
      </div>

      {/* Hero Summary - Compact */}
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Revenue */}
        <div className="hidden md:block text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Billed</p>
          <p className="text-lg font-bold text-indigo-500 dark:text-indigo-400">{formatYen(record.billingAmount)}</p>
        </div>

        {/* Cost */}
        <div className="hidden md:block text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Cost</p>
          <p className="text-lg font-bold text-muted-foreground">{formatYen(totalCompanyCost)}</p>
        </div>

        {/* Profit - Highlighted */}
        <div className={`flex flex-col items-end px-4 py-2 rounded-xl backdrop-blur-md border ${marginColor.border}/30 bg-gradient-to-br from-${marginColor.bg}/10 to-${marginColor.bg}/5`}>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${marginColor.text} drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]`}>
              {formatYen(record.grossProfit)}
            </span>
            <span className={`text-sm font-bold ${marginColor.text}`}>
              {marginRate.toFixed(1)}%
            </span>
          </div>
          <p className={`text-[10px] font-medium ${marginColor.text} opacity-80`}>Gross Profit</p>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-2"
          aria-label="閉じる"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// Company Name Bar Component
function CompanyNameBar({ employee }: { employee: Employee }) {
  return (
    <div className="px-4 sm:px-6 py-2 bg-muted/30 border-b border-border flex items-center justify-between text-muted-foreground shrink-0">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">{employee.dispatchCompany}</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="px-2 py-0.5 bg-muted rounded border border-border">
          時給: <strong className="text-foreground">{formatYen(employee.hourlyRate)}</strong>
        </span>
        <span className="px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/30">
          単価: <strong className="text-indigo-500 dark:text-indigo-400">{formatYen(employee.billingRate)}</strong>
        </span>
      </div>
    </div>
  )
}
