'use client'

import { useMemo } from 'react'
import { formatYen } from '@/lib/utils'
import { PayrollRecord, Employee } from '@/types'
import { TrendingUp, Calculator } from 'lucide-react'
import { getMarginColors, MarginColors } from './PayrollSlipHelpers'

interface ProfitAnalysisColumnProps {
  record: PayrollRecord
  employee: Employee
  settings: {
    target_margin?: number
    employment_insurance_rate?: number
    workers_comp_rate?: number
  }
}

/**
 * Column 3: 粗利分析
 * Displays profit analysis and margin calculations
 */
export function ProfitAnalysisColumn({ record, employee, settings }: ProfitAnalysisColumnProps) {
  // Memoized calculations
  const profitData = useMemo(() => {
    const marginRate = record.billingAmount > 0
      ? (record.grossProfit / record.billingAmount) * 100
      : 0

    const targetMargin = settings.target_margin || 15
    const empInsRate = settings.employment_insurance_rate || 0.009
    const workersCompRate = settings.workers_comp_rate || 0.003

    // Calculate company costs (法定福利費)
    const companyHealthIns = record.socialInsurance || 0
    const companyWelfarePension = record.welfarePension || 0
    const companySocialIns = record.companySocialInsurance || (companyHealthIns + companyWelfarePension)
    const companyEmploymentIns = record.companyEmploymentInsurance || Math.round((record.grossSalary || 0) * empInsRate)
    const companyWorkersComp = record.companyWorkersComp || Math.round((record.grossSalary || 0) * workersCompRate)
    const totalCompanyBenefits = companySocialIns + companyEmploymentIns + companyWorkersComp

    return {
      marginRate,
      targetMargin,
      empInsRate,
      workersCompRate,
      companyHealthIns,
      companyWelfarePension,
      companySocialIns,
      companyEmploymentIns,
      companyWorkersComp,
      totalCompanyBenefits,
      marginColors: getMarginColors(marginRate, targetMargin)
    }
  }, [record, settings])

  return (
    <div className="glass-card rounded-xl overflow-hidden hover:bg-white/[0.02] transition-colors">
      <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20">
        <h3 className="font-bold text-emerald-400 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" aria-hidden="true" />
          粗利分析
        </h3>
        <p className="text-xs text-emerald-400/60 mt-0.5">最終的な利益計算</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Formula Steps */}
        <FormulaSteps
          record={record}
          profitData={profitData}
        />

        {/* Margin Rate with Target */}
        <MarginRateSection
          marginRate={profitData.marginRate}
          targetMargin={profitData.targetMargin}
          marginColors={profitData.marginColors}
        />

        {/* Cost Breakdown Summary */}
        <CostBreakdownSection
          record={record}
          employee={employee}
          profitData={profitData}
        />

        {/* Performance Badge */}
        <PerformanceBadge
          marginRate={profitData.marginRate}
          marginColors={profitData.marginColors}
        />
      </div>
    </div>
  )
}

// Sub-components

function FormulaSteps({
  record,
  profitData
}: {
  record: PayrollRecord
  profitData: {
    marginColors: MarginColors
    totalCompanyBenefits: number
    companyHealthIns: number
    companyWelfarePension: number
    companyEmploymentIns: number
    companyWorkersComp: number
    empInsRate: number
    workersCompRate: number
  }
}) {
  const { marginColors } = profitData

  return (
    <div className="space-y-3">
      {/* Step 1: Revenue */}
      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(59,130,246,0.5)]">1</span>
            <span className="font-medium text-blue-400">売上 (Revenue)</span>
          </div>
          <span className="text-xl font-bold text-blue-400 drop-shadow-sm">
            {formatYen(record.billingAmount)}
          </span>
        </div>
      </div>

      <div className="flex justify-center text-2xl text-slate-500" aria-hidden="true">↓</div>

      {/* Step 2: Gross Salary */}
      <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(249,115,22,0.5)]">2</span>
            <span className="font-medium text-orange-400">総支給額</span>
          </div>
          <span className="text-xl font-bold text-orange-400 drop-shadow-sm">
            -{formatYen(record.grossSalary)}
          </span>
        </div>
      </div>

      <div className="flex justify-center text-2xl text-slate-500" aria-hidden="true">+</div>

      {/* Step 3: Company Benefits */}
      <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(168,85,247,0.5)]">3</span>
            <span className="font-medium text-purple-400">法定福利費 (会社負担)</span>
          </div>
          <span className="text-xl font-bold text-purple-400 drop-shadow-sm">
            -{formatYen(profitData.totalCompanyBenefits)}
          </span>
        </div>
        <div className="ml-8 space-y-1 text-xs text-purple-300/80">
          <div className="flex justify-between">
            <span>健康保険 (会社分) <span className="text-[10px] opacity-70">※本人と同額</span></span>
            <span className="font-mono text-purple-300">{formatYen(profitData.companyHealthIns)}</span>
          </div>
          {profitData.companyWelfarePension > 0 && (
            <div className="flex justify-between">
              <span>厚生年金 (会社分) <span className="text-[10px] opacity-70">※本人と同額</span></span>
              <span className="font-mono text-purple-300">{formatYen(profitData.companyWelfarePension)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>雇用保険 ({(profitData.empInsRate * 100).toFixed(2)}%)</span>
            <span className="font-mono text-purple-300">{formatYen(profitData.companyEmploymentIns)}</span>
          </div>
          <div className="flex justify-between">
            <span>労災保険 ({(profitData.workersCompRate * 100).toFixed(1)}%)</span>
            <span className="font-mono text-purple-300">{formatYen(profitData.companyWorkersComp)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center text-2xl text-slate-500" aria-hidden="true">=</div>

      {/* Final Result */}
      <div className={`p-4 rounded-xl border ${marginColors.border}/50 backdrop-blur-md bg-gradient-to-br from-black/40 to-black/20 text-center relative overflow-hidden`}>
        <div className={`absolute inset-0 opacity-10 ${marginColors.bg}`} aria-hidden="true"></div>
        <div className="relative z-10">
          <p className="text-sm font-medium text-slate-400 mb-1">
            粗利益 (1 - 2 - 3)
          </p>
          <p className={`text-4xl font-bold ${marginColors.text} drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
            {formatYen(record.grossProfit)}
          </p>
        </div>
      </div>
    </div>
  )
}

function MarginRateSection({
  marginRate,
  targetMargin,
  marginColors
}: {
  marginRate: number
  targetMargin: number
  marginColors: MarginColors
}) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold text-slate-200">マージン率</span>
        <span className={`text-2xl font-bold ${marginColors.text} drop-shadow`}>
          {marginRate.toFixed(1)}%
        </span>
      </div>
      {/* Progress to target */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>0%</span>
          <span className="text-emerald-400 font-bold">目標: {targetMargin}%</span>
          <span>{targetMargin * 2}%</span>
        </div>
        <div className="h-3 bg-black/50 rounded-full overflow-hidden relative border border-white/5" role="progressbar" aria-valuenow={marginRate} aria-valuemin={0} aria-valuemax={targetMargin * 2}>
          {/* Target line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-emerald-500 z-10 shadow-[0_0_5px_rgba(16,185,129,0.8)]" aria-hidden="true" />
          {/* Current value */}
          <div
            className={`h-full ${marginColors.bg} transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
            style={{ width: `${Math.min(marginRate / (targetMargin * 2) * 100, 100)}%` }}
          />
        </div>
      </div>
      <p className="text-center text-xs mt-2 text-slate-400">
        {marginRate >= targetMargin
          ? <span className="text-emerald-400 font-semibold drop-shadow">目標達成 ✓</span>
          : <span className="text-amber-400 font-semibold drop-shadow">目標まで: {(targetMargin - marginRate).toFixed(1)}%</span>
        }
      </p>
    </div>
  )
}

function CostBreakdownSection({
  record,
  employee,
  profitData
}: {
  record: PayrollRecord
  employee: Employee
  profitData: {
    totalCompanyBenefits: number
  }
}) {
  // Calculate paid leave days for display
  const paidLeaveDisplay = useMemo(() => {
    const dailyHrs = (record.workDays && record.workDays > 0 && record.workHours)
      ? record.workHours / record.workDays : 8
    const leaveHrs = employee.hourlyRate > 0
      ? (record.paidLeaveAmount || 0) / employee.hourlyRate : 0
    const rawLeaveDays = dailyHrs > 0 ? leaveHrs / dailyHrs : 0
    return Math.round(rawLeaveDays * 2) / 2
  }, [record, employee.hourlyRate])

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <p className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-blue-500" aria-hidden="true" />
        会社総コスト内訳
      </p>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">総支給額</span>
          <span className="font-mono text-sm font-semibold text-slate-200">{formatYen(record.grossSalary)}</span>
        </div>
        {(record.transportAllowance || 0) > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-blue-400 ml-3">├ 通勤手当 (総支給に含む)</span>
            <span className="font-mono text-sm text-blue-400">{formatYen(record.transportAllowance)}</span>
          </div>
        )}
        {(record.nonBillableAllowances || 0) > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-amber-400 ml-3">├ 非請求手当 (総支給に含む)</span>
            <span className="font-mono text-sm text-amber-400">{formatYen(record.nonBillableAllowances)}</span>
          </div>
        )}
        {(record.paidLeaveAmount || 0) > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-emerald-400 ml-3">└ 有給 {paidLeaveDisplay.toFixed(1)}日 (総支給に含む)</span>
            <span className="font-mono text-sm text-emerald-400">{formatYen(record.paidLeaveAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">法定福利費</span>
          <span className="font-mono text-sm font-semibold text-slate-200">{formatYen(profitData.totalCompanyBenefits)}</span>
        </div>
        <div className="pt-3 mt-2 border-t-2 border-white/10 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-200">会社総コスト</span>
          <span className="font-mono text-lg font-bold text-white">{formatYen(record.totalCompanyCost || (record.grossSalary + profitData.totalCompanyBenefits))}</span>
        </div>
      </div>
    </div>
  )
}

function PerformanceBadge({
  marginRate,
  marginColors
}: {
  marginRate: number
  marginColors: MarginColors
}) {
  const getPerformanceLabel = () => {
    if (marginRate >= 18) return '優秀 Excellent'
    if (marginRate >= 15) return '良好 Good'
    if (marginRate >= 12) return '普通 Average'
    if (marginRate >= 10) return '要改善 Needs Work'
    return '警告 Warning'
  }

  return (
    <div className={`p-3 rounded-lg text-center backdrop-blur-md border ${marginColors.border}/30 bg-gradient-to-br from-${marginColors.bg}/10 to-${marginColors.bg}/5`}>
      <p className="text-xs mb-1 text-white/70">収益性評価</p>
      <p className={`text-lg font-bold ${marginColors.text} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
        {getPerformanceLabel()}
      </p>
    </div>
  )
}
