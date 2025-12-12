import { formatYen } from '@/lib/utils'
import { PayrollRecord, Employee } from '@/types'
import { Clock, Sun, Moon, Gift, CreditCard } from 'lucide-react'
import { DetailRow, DeductionRow, formatHours } from './PayrollSlipHelpers'

/**
 * NOTE: Converted to Server Component - no hooks or event handlers used
 * This component only performs calculations and renders JSX based on props
 */

interface SalaryDetailsColumnProps {
  record: PayrollRecord
  employee: Employee
}

/**
 * Column 1: 給与支給明細
 * Displays salary details paid to the employee
 */
export function SalaryDetailsColumn({ record, employee }: SalaryDetailsColumnProps) {
  // Calculate total hours
  const totalWorkHours = (record.workHours || 0) + (record.overtimeHours || 0) + (record.overtimeOver60h || 0) + (record.holidayHours || 0)

  // Calculate total deductions (本人負担)
  const knownDeductions = (record.socialInsurance || 0) +
    (record.welfarePension || 0) +
    (record.employmentInsurance || 0) +
    (record.incomeTax || 0) +
    (record.residentTax || 0) +
    (record.rentDeduction || 0) +
    (record.utilitiesDeduction || 0) +
    (record.mealDeduction || 0) +
    (record.advancePayment || 0) +
    (record.yearEndAdjustment || 0) +
    (record.otherDeductions || 0)

  // Calculate actual total from gross - net
  const actualTotalDeductions = (record.grossSalary || 0) - (record.netSalary || 0)

  // Calculate missing/unaccounted deductions
  const missingDeductions = Math.max(0, actualTotalDeductions - knownDeductions)

  // Final total deductions
  const totalDeductions = record.netSalary ? actualTotalDeductions : knownDeductions

  return (
    <div className="glass-card rounded-xl overflow-hidden hover:bg-white/[0.02] transition-colors">
      <div className="px-4 py-3 bg-blue-500/10 border-b border-blue-500/20">
        <h3 className="font-bold text-blue-400 flex items-center gap-2">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
          給与支給明細
        </h3>
        <p className="text-xs text-blue-400/60 mt-0.5">スタッフへの支払額</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 勤怠実績 Section */}
        <AttendanceSection record={record} totalWorkHours={totalWorkHours} />

        {/* 有給休暇 Section */}
        <PaidLeaveSection record={record} employee={employee} />

        {/* 支給の部 */}
        <AllowancesSection record={record} employee={employee} />

        {/* 総支給額 */}
        <div className="pt-3 border-t-2 border-dashed border-white/10">
          <div className="flex justify-between items-center">
            <span className="font-bold text-blue-400">総支給額</span>
            <span className="text-2xl font-bold text-blue-400 drop-shadow-md">
              {formatYen(record.grossSalary)}
            </span>
          </div>
        </div>

        {/* 控除の部 */}
        <DeductionsSection
          record={record}
          totalDeductions={totalDeductions}
          missingDeductions={missingDeductions}
        />

        {/* 差引支給額 */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-blue-100/80">差引支給額（手取り）</p>
              <p className="text-xs text-blue-100/80">Net Salary</p>
            </div>
            <span className="text-3xl font-bold tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {formatYen(record.netSalary)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-components for better organization

function AttendanceSection({ record, totalWorkHours }: { record: PayrollRecord; totalWorkHours: number }) {
  return (
    <div className="p-3 bg-black/40 rounded-lg border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <span className="text-xs font-bold text-slate-400">勤怠実績</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-white/5 rounded border border-white/10">
          <p className="text-[10px] text-slate-500">出勤日数</p>
          <p className="font-bold text-white">{record.workDays || 0}<span className="text-xs font-normal text-slate-500">日</span></p>
        </div>
        <div className="p-2 bg-white/5 rounded border border-white/10">
          <p className="text-[10px] text-slate-500">総労働時間</p>
          <p className="font-bold text-white">{formatHours(totalWorkHours)}<span className="text-xs font-normal text-slate-500">h</span></p>
        </div>
        <div className="p-2 bg-white/5 rounded border border-white/10">
          <p className="text-[10px] text-slate-500">基本時間</p>
          <p className="font-bold text-white">{formatHours(record.workHours)}<span className="text-xs font-normal text-slate-500">h</span></p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2 text-center">
        <div className="p-1.5 bg-amber-500/10 rounded border border-amber-500/20">
          <p className="text-[9px] text-amber-500">残業</p>
          <p className="font-bold text-amber-500 text-sm">{formatHours(record.overtimeHours)}</p>
        </div>
        <div className="p-1.5 bg-orange-500/10 rounded border border-orange-500/20">
          <p className="text-[9px] text-orange-500">60H超</p>
          <p className="font-bold text-orange-500 text-sm">{formatHours(record.overtimeOver60h)}</p>
        </div>
        <div className="p-1.5 bg-purple-500/10 rounded border border-purple-500/20">
          <p className="text-[9px] text-purple-400">深夜</p>
          <p className="font-bold text-purple-400 text-sm">{formatHours(record.nightHours)}</p>
        </div>
        <div className="p-1.5 bg-rose-500/10 rounded border border-rose-500/20">
          <p className="text-[9px] text-rose-400">休日</p>
          <p className="font-bold text-rose-400 text-sm">{formatHours(record.holidayHours)}</p>
        </div>
      </div>
    </div>
  )
}

function PaidLeaveSection({ record, employee }: { record: PayrollRecord; employee: Employee }) {
  if (!((record.paidLeaveDays || 0) > 0 || (record.paidLeaveHours || 0) > 0 || (record.paidLeaveAmount || 0) > 0)) {
    return null
  }

  // Calculate daily work hours for this factory
  const dailyWorkHours = (record.workDays && record.workDays > 0 && record.workHours)
    ? record.workHours / record.workDays
    : 8

  // Calculate paid leave hours from amount
  const calculatedPaidLeaveHours = (record.paidLeaveAmount && employee.hourlyRate > 0)
    ? record.paidLeaveAmount / employee.hourlyRate
    : record.paidLeaveHours || 0

  // Calculate paid leave days
  const rawPaidLeaveDays = dailyWorkHours > 0
    ? calculatedPaidLeaveHours / dailyWorkHours
    : record.paidLeaveDays || 0

  // Round to nearest 0.5
  const calculatedPaidLeaveDays = Math.round(rawPaidLeaveDays * 2) / 2

  return (
    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-xs font-bold text-emerald-400">有給休暇</span>
        </div>
        <span className="text-[10px] text-emerald-400/60">
          1日 = {dailyWorkHours.toFixed(1)}h
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-emerald-400/70">取得日数</p>
          <p className="font-bold text-emerald-400">
            {calculatedPaidLeaveDays.toFixed(1)}<span className="text-xs font-normal">日</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-emerald-400/70">有給時間</p>
          <p className="font-bold text-emerald-400">
            {calculatedPaidLeaveHours.toFixed(0)}<span className="text-xs font-normal">h</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-emerald-400/70">有給金額</p>
          <p className="font-bold text-emerald-400 text-sm">{formatYen(record.paidLeaveAmount || 0)}</p>
        </div>
      </div>
      {/* Calculation breakdown */}
      <div className="mt-2 pt-2 border-t border-emerald-500/30">
        <p className="text-[9px] text-emerald-400/50 text-center">
          {formatYen(record.paidLeaveAmount || 0)} ÷ {formatYen(employee.hourlyRate)} = {calculatedPaidLeaveHours.toFixed(0)}h → {calculatedPaidLeaveHours.toFixed(0)}h ÷ {dailyWorkHours.toFixed(1)}h/日 = {calculatedPaidLeaveDays.toFixed(1)}日
        </p>
      </div>
    </div>
  )
}

function AllowancesSection({ record, employee }: { record: PayrollRecord; employee: Employee }) {
  // Helper for paid leave calculation
  const getPaidLeaveDays = () => {
    const dailyHrs = (record.workDays && record.workDays > 0 && record.workHours)
      ? record.workHours / record.workDays : 8
    const leaveHrs = employee.hourlyRate > 0
      ? (record.paidLeaveAmount || 0) / employee.hourlyRate : 0
    const rawLeaveDays = dailyHrs > 0 ? leaveHrs / dailyHrs : 0
    return Math.round(rawLeaveDays * 2) / 2
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Sun className="h-4 w-4 text-blue-500" aria-hidden="true" />
        <span className="text-xs font-bold text-blue-400">支給の部</span>
      </div>
      <div className="space-y-2">
        <DetailRow
          label="基本給"
          subLabel={`${formatHours(record.workHours)} × ${formatYen(employee.hourlyRate)}`}
          value={record.baseSalary}
        />
        {(record.overtimePay || 0) > 0 && (
          <DetailRow
            label="残業手当"
            subLabel={`${formatHours(record.overtimeHours)} × ${formatYen(employee.hourlyRate)} × 1.25`}
            value={record.overtimePay}
            highlight="amber"
          />
        )}
        {(record.overtimeOver60hPay || 0) > 0 && (
          <DetailRow
            label="60H超過手当"
            subLabel={`${formatHours(record.overtimeOver60h)} × ${formatYen(employee.hourlyRate)} × 1.5`}
            value={record.overtimeOver60hPay}
            highlight="orange"
          />
        )}
        {(record.nightPay || 0) > 0 && (
          <DetailRow
            label="深夜手当"
            subLabel={`${formatHours(record.nightHours)} × ${formatYen(employee.hourlyRate)} × 0.25`}
            value={record.nightPay}
            highlight="purple"
          />
        )}
        {(record.holidayPay || 0) > 0 && (
          <DetailRow
            label="休日手当"
            subLabel={`${formatHours(record.holidayHours)} × ${formatYen(employee.hourlyRate)} × 1.35`}
            value={record.holidayPay}
            highlight="rose"
          />
        )}
        {(record.paidLeaveAmount || 0) > 0 && (
          <DetailRow
            label="有給支給"
            subLabel={`${getPaidLeaveDays().toFixed(1)}日 (${(employee.hourlyRate > 0 ? (record.paidLeaveAmount || 0) / employee.hourlyRate : 0).toFixed(0)}h)`}
            value={record.paidLeaveAmount}
            highlight="green"
            badge="非請求"
          />
        )}
        {(record.transportAllowance || 0) > 0 && (
          <DetailRow
            label="通勤手当"
            value={record.transportAllowance}
            badge="非請求"
          />
        )}
        {(record.nonBillableAllowances || 0) > 0 && (
          <DetailRow
            label="非請求手当"
            subLabel="業務手当等"
            value={record.nonBillableAllowances}
            badge="非請求"
          />
        )}
        {(record.otherAllowances || 0) > 0 && (
          <DetailRow
            label="その他手当"
            subLabel="皆勤・深夜残業等"
            value={record.otherAllowances}
            badge="請求"
            badgeColor="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
          />
        )}
      </div>
    </div>
  )
}

function DeductionsSection({
  record,
  totalDeductions,
  missingDeductions
}: {
  record: PayrollRecord
  totalDeductions: number
  missingDeductions: number
}) {
  return (
    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Moon className="h-4 w-4 text-red-500" aria-hidden="true" />
        <span className="text-xs font-bold text-red-400">控除の部 (本人負担)</span>
      </div>
      <div className="space-y-1.5 text-sm">
        <DeductionRow label="健康保険" value={record.socialInsurance} />
        <DeductionRow label="厚生年金" value={record.welfarePension} />
        <DeductionRow label="雇用保険" value={record.employmentInsurance} />
        <DeductionRow label="所得税" value={record.incomeTax} />
        {(record.residentTax || 0) > 0 && (
          <DeductionRow label="住民税" value={record.residentTax} />
        )}
        {(record.rentDeduction || 0) > 0 && (
          <DeductionRow label="寮費・家賃" value={record.rentDeduction} />
        )}
        {(record.utilitiesDeduction || 0) > 0 && (
          <DeductionRow label="光熱費" value={record.utilitiesDeduction} />
        )}
        {(record.mealDeduction || 0) > 0 && (
          <DeductionRow label="食事代・弁当" value={record.mealDeduction} />
        )}
        {(record.advancePayment || 0) > 0 && (
          <DeductionRow label="前借金返済" value={record.advancePayment} />
        )}
        {(record.yearEndAdjustment || 0) !== 0 && (
          <DeductionRow label="年末調整" value={record.yearEndAdjustment} />
        )}
        {((record.otherDeductions || 0) + missingDeductions) > 0 && (
          <DeductionRow label="その他控除" value={(record.otherDeductions || 0) + missingDeductions} />
        )}
        <div className="pt-2 border-t border-red-500/30 flex justify-between font-bold">
          <span className="text-red-400">控除合計</span>
          <span className="text-red-400">-{formatYen(totalDeductions)}</span>
        </div>
      </div>
    </div>
  )
}
