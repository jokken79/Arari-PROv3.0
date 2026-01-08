'use client'

import { useMemo, useState } from 'react'
import { formatYen } from '@/lib/utils'
import { PayrollRecord, Employee } from '@/types'
import { X, ArrowLeft, Building2, CreditCard, Briefcase, TrendingUp } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'salary' | 'billing' | 'profit'>('salary')

  // Memoized header calculations
  const headerData = useMemo(() => {
    const marginRate = record.billingAmount > 0
      ? (record.grossProfit / record.billingAmount) * 100
      : 0
    const targetMargin = settings.target_margin || 12
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
        aria-live="polite"
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
          {/* Header - Row 1: Navigation & Identity */}
          <ModalHeader
            record={record}
            employee={employee}
            onClose={onClose}
          />

          {/* Header - Row 2: Company Info & Hero Stats */}
          <HeroStatsBar
            record={record}
            employee={employee}
            headerData={headerData}
          />

          {/* Mobile Tab Navigation */}
          <MobileTabNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Main Content - 3 Columns on desktop, 2 columns on tablet, tabs on mobile */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gradient-to-br from-slate-950 to-slate-900 dark:from-[#0a0a0a] dark:to-[#111]">
            {/* Desktop: Show all 3 columns, Tablet: Show 2 columns */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SalaryDetailsColumn record={record} employee={employee} />
              <BillingCalculationColumn record={record} employee={employee} />
              <ProfitAnalysisColumn record={record} employee={employee} settings={settings} />
            </div>

            {/* Mobile: Show active tab only */}
            <div className="md:hidden">
              {activeTab === 'salary' && <SalaryDetailsColumn record={record} employee={employee} />}
              {activeTab === 'billing' && <BillingCalculationColumn record={record} employee={employee} />}
              {activeTab === 'profit' && <ProfitAnalysisColumn record={record} employee={employee} settings={settings} />}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// Header Component - Row 1: Navigation & Employee Identity
function ModalHeader({
  record,
  employee,
  onClose
}: {
  record: PayrollRecord
  employee: Employee
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-muted/50 border-b border-border shrink-0 backdrop-blur-xl">
      {/* Left: Back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-slate-400 hover:text-foreground"
          aria-label="閉じる"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-slate-400 hidden sm:inline text-sm">戻る</span>
      </div>

      {/* Center: Period Badge + Name */}
      <div className="flex items-center gap-3 sm:gap-5">
        <span className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm">
          {record.period}
        </span>
        <div className="flex items-center gap-2">
          <span id="payroll-modal-title" className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {employee.nameKana || employee.name}
          </span>
          <span className="text-sm text-slate-400 font-mono hidden sm:inline">
            ({employee.employeeId})
          </span>
        </div>
      </div>

      {/* Right: Close button */}
      <button
        onClick={onClose}
        className="p-2 rounded-full hover:bg-muted transition-colors text-slate-400 hover:text-foreground"
        aria-label="閉じる"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}

// Header Row 2: Company Info & Hero Stats
function HeroStatsBar({
  record,
  employee,
  headerData
}: {
  record: PayrollRecord
  employee: Employee
  headerData: {
    marginRate: number
    marginColor: ReturnType<typeof getMarginColors>
    totalCompanyCost: number
  }
}) {
  const { marginRate, marginColor, totalCompanyCost } = headerData

  return (
    <div className="px-4 sm:px-6 py-3 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
      {/* Left: Company info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">{employee.dispatchCompany}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-muted rounded border border-border">
            時給: <strong className="text-foreground">{formatYen(employee.hourlyRate)}</strong>
          </span>
          <span className="px-2 py-1 bg-indigo-500/10 rounded border border-indigo-500/30">
            単価: <strong className="text-indigo-400">{formatYen(employee.billingRate)}</strong>
          </span>
        </div>
      </div>

      {/* Right: Hero Stats */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Revenue */}
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">売上</p>
          <p className="text-lg font-bold text-indigo-400">{formatYen(record.billingAmount)}</p>
        </div>

        {/* Cost */}
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">コスト</p>
          <p className="text-lg font-bold text-slate-300">{formatYen(totalCompanyCost)}</p>
        </div>

        {/* Profit - Always visible, highlighted */}
        <div className={`flex flex-col items-end px-4 py-2 rounded-xl border ${marginColor.border} ${marginColor.light}`}>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-bold ${marginColor.text}`}>
              {formatYen(record.grossProfit)}
            </span>
            <span className={`text-sm font-bold ${marginColor.text}`}>
              {marginRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">粗利益</p>
        </div>
      </div>
    </div>
  )
}

// Mobile Tab Navigation
function MobileTabNav({
  activeTab,
  setActiveTab
}: {
  activeTab: 'salary' | 'billing' | 'profit'
  setActiveTab: (tab: 'salary' | 'billing' | 'profit') => void
}) {
  // Using explicit classes since dynamic Tailwind classes get purged at build time
  const getTabStyles = (tabId: 'salary' | 'billing' | 'profit', isActive: boolean) => {
    if (!isActive) return 'text-slate-400 hover:text-slate-200 hover:bg-muted/50'
    switch (tabId) {
      case 'salary':
        return 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
      case 'billing':
        return 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
      case 'profit':
        return 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
    }
  }

  return (
    <div className="md:hidden flex border-b border-border bg-muted/20 shrink-0">
      <button
        onClick={() => setActiveTab('salary')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${getTabStyles('salary', activeTab === 'salary')}`}
      >
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        <span>給与明細</span>
      </button>
      <button
        onClick={() => setActiveTab('billing')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${getTabStyles('billing', activeTab === 'billing')}`}
      >
        <Briefcase className="h-4 w-4" aria-hidden="true" />
        <span>請求計算</span>
      </button>
      <button
        onClick={() => setActiveTab('profit')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${getTabStyles('profit', activeTab === 'profit')}`}
      >
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
        <span>粗利分析</span>
      </button>
    </div>
  )
}
