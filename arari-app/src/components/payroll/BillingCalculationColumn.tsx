'use client'

import { useMemo } from 'react'
import { formatYen } from '@/lib/utils'
import { PayrollRecord, Employee } from '@/types'
import { Briefcase, Calculator } from 'lucide-react'
import { BillingRow, formatHours } from './PayrollSlipHelpers'

interface BillingCalculationColumnProps {
  record: PayrollRecord
  employee: Employee
}

/**
 * Column 2: 請求金額計算
 * Displays billing calculation to the client company
 */
export function BillingCalculationColumn({ record, employee }: BillingCalculationColumnProps) {
  // Memoized billing calculations
  const billingData = useMemo(() => {
    const baseBilling = (record.workHours || 0) * employee.billingRate
    const overtimeBilling = (record.overtimeHours || 0) * employee.billingRate * 1.25
    const overtime60hBilling = (record.overtimeOver60h || 0) * employee.billingRate * 1.5
    const nightBilling = (record.nightHours || 0) * employee.billingRate * 0.25
    const holidayBilling = (record.holidayHours || 0) * employee.billingRate * 1.35
    const totalWorkHours = (record.workHours || 0) + (record.overtimeHours || 0) + (record.overtimeOver60h || 0) + (record.holidayHours || 0)

    return {
      baseBilling,
      overtimeBilling,
      overtime60hBilling,
      nightBilling,
      holidayBilling,
      totalWorkHours,
      rateDifference: employee.billingRate - employee.hourlyRate
    }
  }, [record, employee.billingRate, employee.hourlyRate])

  return (
    <div className="glass-card rounded-xl overflow-hidden hover:bg-white/[0.02] transition-colors">
      <div className="px-4 py-3 bg-indigo-500/10 border-b border-indigo-500/20">
        <h3 className="font-bold text-indigo-400 flex items-center gap-2">
          <Briefcase className="h-5 w-5" aria-hidden="true" />
          請求金額計算
        </h3>
        <p className="text-xs text-indigo-400/60 mt-0.5">工場への請求額</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Billing Rate Highlight */}
        <div className="p-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 rounded-xl text-white text-center shadow-lg">
          <p className="text-xs text-indigo-100 mb-1">請求単価 (Billing Rate)</p>
          <p className="text-3xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            {formatYen(employee.billingRate)}<span className="text-lg font-normal">/h</span>
          </p>
        </div>

        {/* Billing Breakdown */}
        <BillingBreakdown
          record={record}
          employee={employee}
          billingData={billingData}
        />

        {/* Billing Total */}
        <div className="pt-4 border-t-2 border-indigo-500/30">
          <div className="flex justify-between items-center">
            <span className="font-bold text-indigo-400">請求合計</span>
            <span className="text-2xl font-bold text-indigo-400 drop-shadow-sm">
              {formatYen(record.billingAmount)}
            </span>
          </div>
        </div>

        {/* Hours Summary Visual */}
        <HoursSummaryChart record={record} totalWorkHours={billingData.totalWorkHours} />

        {/* Rate Comparison */}
        <RateComparison
          billingRate={employee.billingRate}
          hourlyRate={employee.hourlyRate}
          rateDifference={billingData.rateDifference}
        />
      </div>
    </div>
  )
}

// Sub-components

function BillingBreakdown({
  record,
  employee,
  billingData
}: {
  record: PayrollRecord
  employee: Employee
  billingData: {
    baseBilling: number
    overtimeBilling: number
    overtime60hBilling: number
    nightBilling: number
    holidayBilling: number
  }
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-4 w-4 text-indigo-500" aria-hidden="true" />
        <span className="text-xs font-bold text-indigo-400">請求内訳</span>
      </div>

      <BillingRow
        label="基本稼働"
        hours={record.workHours}
        rate={employee.billingRate}
        multiplier={1}
        value={billingData.baseBilling}
      />

      {(record.overtimeHours || 0) > 0 && (
        <BillingRow
          label="残業"
          hours={record.overtimeHours}
          rate={employee.billingRate}
          multiplier={1.25}
          value={billingData.overtimeBilling}
          color="amber"
        />
      )}

      {(record.overtimeOver60h || 0) > 0 && (
        <BillingRow
          label="60H超過"
          hours={record.overtimeOver60h}
          rate={employee.billingRate}
          multiplier={1.5}
          value={billingData.overtime60hBilling}
          color="orange"
        />
      )}

      {(record.nightHours || 0) > 0 && (
        <BillingRow
          label="深夜割増"
          hours={record.nightHours}
          rate={employee.billingRate}
          multiplier={0.25}
          value={billingData.nightBilling}
          color="purple"
          isExtra
        />
      )}

      {(record.holidayHours || 0) > 0 && (
        <BillingRow
          label="休日"
          hours={record.holidayHours}
          rate={employee.billingRate}
          multiplier={1.35}
          value={billingData.holidayBilling}
          color="rose"
        />
      )}

      {/* Pass-through Allowances */}
      {(record.otherAllowances || 0) > 0 && (
        <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 bg-indigo-500/10 px-2 rounded">
          <div className="flex items-center gap-2">
            <span className="text-indigo-300 text-sm font-medium">その他手当 (請求対象)</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">実費</span>
          </div>
          <span className="font-mono font-medium text-indigo-300">
            {formatYen(record.otherAllowances)}
          </span>
        </div>
      )}
    </div>
  )
}

function HoursSummaryChart({ record, totalWorkHours }: { record: PayrollRecord; totalWorkHours: number }) {
  // Prevent division by zero
  const safeTotal = totalWorkHours > 0 ? totalWorkHours : 1

  return (
    <div className="p-3 bg-black/40 rounded-lg border border-white/5">
      <p className="text-xs font-bold text-slate-400 mb-3">時間構成比</p>
      <div className="h-4 rounded-full overflow-hidden flex bg-white/10" role="img" aria-label="労働時間の内訳">
        {(record.workHours || 0) > 0 && (
          <div
            className="bg-blue-500 h-full"
            style={{ width: `${((record.workHours || 0) / safeTotal) * 100}%` }}
            title={`基本: ${formatHours(record.workHours)}`}
          />
        )}
        {(record.overtimeHours || 0) > 0 && (
          <div
            className="bg-amber-500 h-full"
            style={{ width: `${((record.overtimeHours || 0) / safeTotal) * 100}%` }}
            title={`残業: ${formatHours(record.overtimeHours)}`}
          />
        )}
        {(record.overtimeOver60h || 0) > 0 && (
          <div
            className="bg-orange-500 h-full"
            style={{ width: `${((record.overtimeOver60h || 0) / safeTotal) * 100}%` }}
            title={`60H超: ${formatHours(record.overtimeOver60h)}`}
          />
        )}
        {(record.holidayHours || 0) > 0 && (
          <div
            className="bg-rose-500 h-full"
            style={{ width: `${((record.holidayHours || 0) / safeTotal) * 100}%` }}
            title={`休日: ${formatHours(record.holidayHours)}`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
        <span className="flex items-center gap-1 text-slate-500"><span className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true"></span>基本</span>
        <span className="flex items-center gap-1 text-slate-500"><span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>残業</span>
        <span className="flex items-center gap-1 text-slate-500"><span className="w-2 h-2 rounded-full bg-orange-500" aria-hidden="true"></span>60H超</span>
        <span className="flex items-center gap-1 text-slate-500"><span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true"></span>休日</span>
      </div>
    </div>
  )
}

function RateComparison({
  billingRate,
  hourlyRate,
  rateDifference
}: {
  billingRate: number
  hourlyRate: number
  rateDifference: number
}) {
  return (
    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
      <p className="text-xs font-bold text-emerald-400 mb-2">単価差額（1時間あたり）</p>
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-[10px] text-slate-500">単価</p>
          <p className="font-bold text-indigo-400">{formatYen(billingRate)}</p>
        </div>
        <span className="text-slate-600" aria-hidden="true">-</span>
        <div className="text-center">
          <p className="text-[10px] text-slate-500">時給</p>
          <p className="font-bold text-blue-400">{formatYen(hourlyRate)}</p>
        </div>
        <span className="text-slate-600" aria-hidden="true">=</span>
        <div className="text-center">
          <p className="text-[10px] text-slate-500">差額</p>
          <p className="font-bold text-emerald-400">{formatYen(rateDifference)}</p>
        </div>
      </div>
    </div>
  )
}
