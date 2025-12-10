'use client'

import { formatYen } from '@/lib/utils'
import { PayrollRecord, Employee } from '@/types'
import { X, ArrowLeft, Building2, Clock, Calendar, Briefcase, CreditCard, Calculator, TrendingUp, Coffee, Moon, Sun, Gift } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PayrollSlipModalProps {
    isOpen: boolean
    onClose: () => void
    record: PayrollRecord
    employee: Employee
}

export function PayrollSlipModal({ isOpen, onClose, record, employee }: PayrollSlipModalProps) {
    if (!record || !isOpen) return null

    // Calculate margin rate for display
    const marginRate = record.billingAmount > 0
        ? (record.grossProfit / record.billingAmount) * 100
        : 0

    // Get margin color based on 製造派遣 standards (target 15%)
    const getMarginColor = (margin: number) => {
        if (margin >= 18) return { text: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20' }
        if (margin >= 15) return { text: 'text-green-500', bg: 'bg-green-500', border: 'border-green-500', light: 'bg-green-50 dark:bg-green-900/20' }
        if (margin >= 12) return { text: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500', light: 'bg-amber-50 dark:bg-amber-900/20' }
        if (margin >= 10) return { text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500', light: 'bg-orange-50 dark:bg-orange-900/20' }
        return { text: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500', light: 'bg-red-50 dark:bg-red-900/20' }
    }

    const marginColor = getMarginColor(marginRate)

    // Calculate billing breakdown
    const baseBilling = (record.workHours || 0) * employee.billingRate
    const overtimeBilling = (record.overtimeHours || 0) * employee.billingRate * 1.25
    const overtime60hBilling = (record.overtimeOver60h || 0) * employee.billingRate * 1.5
    const nightBilling = (record.nightHours || 0) * employee.billingRate * 0.25
    const holidayBilling = (record.holidayHours || 0) * employee.billingRate * 1.35

    // Calculate total hours
    const totalWorkHours = (record.workHours || 0) + (record.overtimeHours || 0) + (record.overtimeOver60h || 0) + (record.holidayHours || 0)

    // Calculate total deductions (本人負担)
    const totalDeductions = (record.socialInsurance || 0) +
        (record.welfarePension || 0) +
        (record.employmentInsurance || 0) +
        (record.incomeTax || 0) +
        (record.residentTax || 0) +
        (record.otherDeductions || 0)

    // Calculate company costs (法定福利費)
    // 社会保険（会社負担）= 健康保険 + 厚生年金 (both equal to employee share - 労使折半)
    const companyHealthIns = record.socialInsurance || 0  // 健康保険（会社分）= 本人と同額
    const companyWelfarePension = record.welfarePension || 0  // 厚生年金（会社分）= 本人と同額
    const companySocialIns = record.companySocialInsurance || (companyHealthIns + companyWelfarePension)
    const companyEmploymentIns = record.companyEmploymentInsurance || Math.round((record.grossSalary || 0) * 0.009)
    const companyWorkersComp = record.companyWorkersComp || Math.round((record.grossSalary || 0) * 0.003)
    const totalCompanyBenefits = companySocialIns + companyEmploymentIns + companyWorkersComp

    // Format hours display
    const formatHours = (hours: number | undefined) => {
        if (!hours) return '0:00'
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${h}:${m.toString().padStart(2, '0')}`
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-7xl my-4 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900 shadow-2xl flex flex-col max-h-[95vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">戻る</span>
                        </div>

                        {/* Period Badge + Name */}
                        <div className="flex items-center gap-3 sm:gap-6">
                            <span className="px-3 sm:px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-sm">
                                {record.period}
                            </span>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white">
                                    {employee.name}
                                </span>
                                <span className="text-xs sm:text-sm text-slate-500 font-mono">
                                    ({employee.employeeId})
                                </span>
                            </div>
                        </div>

                        {/* Gross Profit Summary */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-slate-500">粗利益 (Gross Profit)</p>
                                <p className={`text-xl sm:text-2xl font-bold ${marginColor.text}`}>
                                    {formatYen(record.grossProfit)}
                                </p>
                            </div>
                            <div className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${marginColor.light} border ${marginColor.border}/30`}>
                                <span className={`text-lg sm:text-xl font-bold ${marginColor.text}`}>
                                    {marginRate.toFixed(1)}%
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Company Name Bar */}
                    <div className="px-4 sm:px-6 py-2 bg-slate-100 dark:bg-slate-800/50 flex items-center justify-between text-slate-600 dark:text-slate-400 shrink-0">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="text-sm font-medium">{employee.dispatchCompany}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <span>時給: <strong className="text-slate-800 dark:text-slate-200">{formatYen(employee.hourlyRate)}</strong></span>
                            <span>単価: <strong className="text-blue-600 dark:text-blue-400">{formatYen(employee.billingRate)}</strong></span>
                        </div>
                    </div>

                    {/* Main Content - 3 Columns */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

                            {/* ========== Column 1: 給与支給明細 ========== */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                                    <h3 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        給与支給明細
                                    </h3>
                                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">スタッフへの支払額</p>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* 勤怠実績 Section */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock className="h-4 w-4 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">勤怠実績</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                                <p className="text-[10px] text-slate-500">出勤日数</p>
                                                <p className="font-bold text-slate-800 dark:text-white">{record.workDays || 0}<span className="text-xs font-normal">日</span></p>
                                            </div>
                                            <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                                <p className="text-[10px] text-slate-500">総労働時間</p>
                                                <p className="font-bold text-slate-800 dark:text-white">{formatHours(totalWorkHours)}<span className="text-xs font-normal">h</span></p>
                                            </div>
                                            <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                                <p className="text-[10px] text-slate-500">基本時間</p>
                                                <p className="font-bold text-slate-800 dark:text-white">{formatHours(record.workHours)}<span className="text-xs font-normal">h</span></p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                                            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                                                <p className="text-[9px] text-amber-600 dark:text-amber-400">残業</p>
                                                <p className="font-bold text-amber-700 dark:text-amber-300 text-sm">{formatHours(record.overtimeHours)}</p>
                                            </div>
                                            <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                                                <p className="text-[9px] text-orange-600 dark:text-orange-400">60H超</p>
                                                <p className="font-bold text-orange-700 dark:text-orange-300 text-sm">{formatHours(record.overtimeOver60h)}</p>
                                            </div>
                                            <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                                                <p className="text-[9px] text-purple-600 dark:text-purple-400">深夜</p>
                                                <p className="font-bold text-purple-700 dark:text-purple-300 text-sm">{formatHours(record.nightHours)}</p>
                                            </div>
                                            <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded border border-rose-200 dark:border-rose-800">
                                                <p className="text-[9px] text-rose-600 dark:text-rose-400">休日</p>
                                                <p className="font-bold text-rose-700 dark:text-rose-300 text-sm">{formatHours(record.holidayHours)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 有給休暇 Section */}
                                    {((record.paidLeaveDays || 0) > 0 || (record.paidLeaveHours || 0) > 0 || (record.paidLeaveAmount || 0) > 0) && (
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Gift className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                <span className="text-xs font-bold text-green-700 dark:text-green-400">有給休暇</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div>
                                                    <p className="text-[10px] text-green-600/70 dark:text-green-400/70">取得日数</p>
                                                    <p className="font-bold text-green-700 dark:text-green-300">{record.paidLeaveDays || 0}<span className="text-xs font-normal">日</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-green-600/70 dark:text-green-400/70">有給時間</p>
                                                    <p className="font-bold text-green-700 dark:text-green-300">{formatHours(record.paidLeaveHours)}<span className="text-xs font-normal">h</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-green-600/70 dark:text-green-400/70">有給金額</p>
                                                    <p className="font-bold text-green-700 dark:text-green-300 text-sm">{formatYen(record.paidLeaveAmount || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 支給の部 */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sun className="h-4 w-4 text-blue-500" />
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">支給の部</span>
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
                                                    subLabel={`${record.paidLeaveDays || 0}日分`}
                                                    value={record.paidLeaveAmount}
                                                    highlight="green"
                                                />
                                            )}
                                            {(record.transportAllowance || 0) > 0 && (
                                                <DetailRow
                                                    label="通勤手当"
                                                    value={record.transportAllowance}
                                                />
                                            )}
                                            {(record.otherAllowances || 0) > 0 && (
                                                <DetailRow
                                                    label="その他手当"
                                                    value={record.otherAllowances}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* 総支給額 */}
                                    <div className="pt-3 border-t-2 border-blue-200 dark:border-blue-800">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-blue-700 dark:text-blue-300">総支給額</span>
                                            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                                {formatYen(record.grossSalary)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 控除の部 */}
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Moon className="h-4 w-4 text-red-500" />
                                            <span className="text-xs font-bold text-red-600 dark:text-red-400">控除の部 (本人負担)</span>
                                        </div>
                                        <div className="space-y-1.5 text-sm">
                                            {(record.socialInsurance || 0) > 0 && (
                                                <DeductionRow label="健康保険" value={record.socialInsurance} />
                                            )}
                                            {(record.welfarePension || 0) > 0 && (
                                                <DeductionRow label="厚生年金" value={record.welfarePension} />
                                            )}
                                            {(record.employmentInsurance || 0) > 0 && (
                                                <DeductionRow label="雇用保険" value={record.employmentInsurance} />
                                            )}
                                            {(record.incomeTax || 0) > 0 && (
                                                <DeductionRow label="所得税" value={record.incomeTax} />
                                            )}
                                            {(record.residentTax || 0) > 0 && (
                                                <DeductionRow label="住民税" value={record.residentTax} />
                                            )}
                                            {(record.otherDeductions || 0) > 0 && (
                                                <DeductionRow label="その他控除" value={record.otherDeductions} />
                                            )}
                                            <div className="pt-2 border-t border-red-200 dark:border-red-800 flex justify-between font-bold">
                                                <span className="text-red-600 dark:text-red-400">控除合計</span>
                                                <span className="text-red-600 dark:text-red-400">-{formatYen(totalDeductions)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 差引支給額 */}
                                    <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-blue-100">差引支給額（手取り）</p>
                                                <p className="text-xs text-blue-200">Net Salary</p>
                                            </div>
                                            <span className="text-3xl font-bold">
                                                {formatYen(record.netSalary)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ========== Column 2: 請求金額計算 ========== */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
                                    <h3 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                        <Briefcase className="h-5 w-5" />
                                        請求金額計算
                                    </h3>
                                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-0.5">工場への請求額</p>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Billing Rate Highlight */}
                                    <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white text-center">
                                        <p className="text-xs text-indigo-100 mb-1">請求単価 (Billing Rate)</p>
                                        <p className="text-3xl font-bold">
                                            {formatYen(employee.billingRate)}<span className="text-lg font-normal">/h</span>
                                        </p>
                                    </div>

                                    {/* Billing Breakdown */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calculator className="h-4 w-4 text-indigo-500" />
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">請求内訳</span>
                                        </div>

                                        <BillingRow
                                            label="基本稼働"
                                            hours={record.workHours}
                                            rate={employee.billingRate}
                                            multiplier={1}
                                            value={baseBilling}
                                        />

                                        {(record.overtimeHours || 0) > 0 && (
                                            <BillingRow
                                                label="残業"
                                                hours={record.overtimeHours}
                                                rate={employee.billingRate}
                                                multiplier={1.25}
                                                value={overtimeBilling}
                                                color="amber"
                                            />
                                        )}

                                        {(record.overtimeOver60h || 0) > 0 && (
                                            <BillingRow
                                                label="60H超過"
                                                hours={record.overtimeOver60h}
                                                rate={employee.billingRate}
                                                multiplier={1.5}
                                                value={overtime60hBilling}
                                                color="orange"
                                            />
                                        )}

                                        {(record.nightHours || 0) > 0 && (
                                            <BillingRow
                                                label="深夜割増"
                                                hours={record.nightHours}
                                                rate={employee.billingRate}
                                                multiplier={0.25}
                                                value={nightBilling}
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
                                                value={holidayBilling}
                                                color="rose"
                                            />
                                        )}
                                    </div>

                                    {/* Billing Total */}
                                    <div className="pt-4 border-t-2 border-indigo-200 dark:border-indigo-800">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-indigo-700 dark:text-indigo-300">請求合計</span>
                                            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                                {formatYen(record.billingAmount)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Hours Summary Visual */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">時間構成比</p>
                                        <div className="h-4 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-600">
                                            {(record.workHours || 0) > 0 && (
                                                <div
                                                    className="bg-blue-500 h-full"
                                                    style={{ width: `${((record.workHours || 0) / totalWorkHours) * 100}%` }}
                                                    title={`基本: ${formatHours(record.workHours)}`}
                                                />
                                            )}
                                            {(record.overtimeHours || 0) > 0 && (
                                                <div
                                                    className="bg-amber-500 h-full"
                                                    style={{ width: `${((record.overtimeHours || 0) / totalWorkHours) * 100}%` }}
                                                    title={`残業: ${formatHours(record.overtimeHours)}`}
                                                />
                                            )}
                                            {(record.overtimeOver60h || 0) > 0 && (
                                                <div
                                                    className="bg-orange-500 h-full"
                                                    style={{ width: `${((record.overtimeOver60h || 0) / totalWorkHours) * 100}%` }}
                                                    title={`60H超: ${formatHours(record.overtimeOver60h)}`}
                                                />
                                            )}
                                            {(record.holidayHours || 0) > 0 && (
                                                <div
                                                    className="bg-rose-500 h-full"
                                                    style={{ width: `${((record.holidayHours || 0) / totalWorkHours) * 100}%` }}
                                                    title={`休日: ${formatHours(record.holidayHours)}`}
                                                />
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>基本</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>残業</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span>60H超</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>休日</span>
                                        </div>
                                    </div>

                                    {/* Rate Comparison */}
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">単価差額（1時間あたり）</p>
                                        <div className="flex items-center justify-between">
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-500">単価</p>
                                                <p className="font-bold text-indigo-600">{formatYen(employee.billingRate)}</p>
                                            </div>
                                            <span className="text-slate-400">-</span>
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-500">時給</p>
                                                <p className="font-bold text-blue-600">{formatYen(employee.hourlyRate)}</p>
                                            </div>
                                            <span className="text-slate-400">=</span>
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-500">差額</p>
                                                <p className="font-bold text-emerald-600">{formatYen(employee.billingRate - employee.hourlyRate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ========== Column 3: 粗利分析 ========== */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800">
                                    <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5" />
                                        粗利分析
                                    </h3>
                                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">最終的な利益計算</p>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Formula Steps */}
                                    <div className="space-y-3">
                                        {/* Step 1: Revenue */}
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                                                    <span className="font-medium text-blue-700 dark:text-blue-300">売上 (Revenue)</span>
                                                </div>
                                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                    {formatYen(record.billingAmount)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-center text-2xl text-slate-300 dark:text-slate-600">↓</div>

                                        {/* Step 2: Gross Salary */}
                                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                                                    <span className="font-medium text-orange-700 dark:text-orange-300">総支給額</span>
                                                </div>
                                                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                                    -{formatYen(record.grossSalary)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-center text-2xl text-slate-300 dark:text-slate-600">+</div>

                                        {/* Step 3: Company Benefits */}
                                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                                                    <span className="font-medium text-purple-700 dark:text-purple-300">法定福利費 (会社負担)</span>
                                                </div>
                                                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                                    -{formatYen(totalCompanyBenefits)}
                                                </span>
                                            </div>
                                            <div className="ml-8 space-y-1 text-xs">
                                                <div className="flex justify-between text-purple-600/80 dark:text-purple-400/80">
                                                    <span>健康保険 (会社分) <span className="text-[10px]">※本人と同額</span></span>
                                                    <span className="font-mono">{formatYen(companyHealthIns)}</span>
                                                </div>
                                                {companyWelfarePension > 0 && (
                                                    <div className="flex justify-between text-purple-600/80 dark:text-purple-400/80">
                                                        <span>厚生年金 (会社分) <span className="text-[10px]">※本人と同額</span></span>
                                                        <span className="font-mono">{formatYen(companyWelfarePension)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-purple-600/80 dark:text-purple-400/80">
                                                    <span>雇用保険 (0.90%)</span>
                                                    <span className="font-mono">{formatYen(companyEmploymentIns)}</span>
                                                </div>
                                                <div className="flex justify-between text-purple-600/80 dark:text-purple-400/80">
                                                    <span>労災保険 (0.3%)</span>
                                                    <span className="font-mono">{formatYen(companyWorkersComp)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-center text-2xl text-slate-300 dark:text-slate-600">=</div>

                                        {/* Final Result */}
                                        <div className={`p-4 rounded-xl border-2 ${marginColor.border}/50 ${marginColor.light}`}>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    粗利益 (1 - 2 - 3)
                                                </p>
                                                <p className={`text-4xl font-bold ${marginColor.text}`}>
                                                    {formatYen(record.grossProfit)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Margin Rate with Target */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">マージン率</span>
                                            <span className={`text-2xl font-bold ${marginColor.text}`}>
                                                {marginRate.toFixed(1)}%
                                            </span>
                                        </div>
                                        {/* Progress to target */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>0%</span>
                                                <span className="text-emerald-600 font-bold">目標: 15%</span>
                                                <span>30%</span>
                                            </div>
                                            <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden relative">
                                                {/* Target line */}
                                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-emerald-500 z-10" />
                                                {/* Current value */}
                                                <div
                                                    className={`h-full ${marginColor.bg} transition-all duration-500`}
                                                    style={{ width: `${Math.min(marginRate / 30 * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-center text-xs mt-2 text-slate-500">
                                            {marginRate >= 15
                                                ? <span className="text-emerald-600">目標達成 ✓</span>
                                                : <span className="text-amber-600">目標まで: {(15 - marginRate).toFixed(1)}%</span>
                                            }
                                        </p>
                                    </div>

                                    {/* Cost Breakdown Summary */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">会社総コスト内訳</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500">総支給額</span>
                                                <span className="font-mono text-sm">{formatYen(record.grossSalary)}</span>
                                            </div>
                                            {(record.transportAllowance || 0) > 0 && (
                                                <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                                                    <span className="text-xs">└ 通勤手当 (総支給に含む)</span>
                                                    <span className="font-mono text-sm">{formatYen(record.transportAllowance)}</span>
                                                </div>
                                            )}
                                            {(record.nonBillableAllowances || 0) > 0 && (
                                                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                                                    <span className="text-xs">└ 非請求手当 (総支給に含む)</span>
                                                    <span className="font-mono text-sm">{formatYen(record.nonBillableAllowances)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500">法定福利費</span>
                                                <span className="font-mono text-sm">{formatYen(totalCompanyBenefits)}</span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center font-bold">
                                                <span className="text-xs text-slate-700 dark:text-slate-300">会社総コスト</span>
                                                <span className="font-mono">{formatYen(record.totalCompanyCost || (record.grossSalary + totalCompanyBenefits))}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Badge */}
                                    <div className={`p-3 rounded-lg text-center ${marginColor.light} border ${marginColor.border}/30`}>
                                        <p className="text-xs mb-1">収益性評価</p>
                                        <p className={`text-lg font-bold ${marginColor.text}`}>
                                            {marginRate >= 18 ? '優秀 Excellent' :
                                                marginRate >= 15 ? '良好 Good' :
                                                    marginRate >= 12 ? '普通 Average' :
                                                        marginRate >= 10 ? '要改善 Needs Work' : '警告 Warning'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

// Helper Components
function DetailRow({ label, subLabel, value, highlight }: {
    label: string
    subLabel?: string
    value?: number
    highlight?: 'amber' | 'orange' | 'purple' | 'rose' | 'green'
}) {
    const colors = {
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
        rose: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    }

    return (
        <div className={`flex justify-between items-center p-2 rounded ${highlight ? colors[highlight] + ' border' : ''}`}>
            <div>
                <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                {subLabel && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{subLabel}</p>
                )}
            </div>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatYen(value || 0)}
            </span>
        </div>
    )
}

function DeductionRow({ label, value }: { label: string; value?: number }) {
    return (
        <div className="flex justify-between">
            <span className="text-red-600/80 dark:text-red-400/80">{label}</span>
            <span className="text-red-600 dark:text-red-400 font-mono">
                -{formatYen(value || 0)}
            </span>
        </div>
    )
}

function BillingRow({ label, hours, rate, multiplier, value, color, isExtra }: {
    label: string
    hours?: number
    rate: number
    multiplier: number
    value: number
    color?: 'amber' | 'orange' | 'purple' | 'rose'
    isExtra?: boolean
}) {
    const formatHours = (h: number | undefined) => {
        if (!h) return '0:00'
        const hr = Math.floor(h)
        const m = Math.round((h - hr) * 60)
        return `${hr}:${m.toString().padStart(2, '0')}`
    }

    const colorClasses = {
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
        rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    }

    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">{label}</span>
                <span className="text-xs text-slate-400">({formatHours(hours)}h)</span>
                {multiplier !== 1 && (
                    <span className={`px-1.5 py-0.5 text-xs rounded ${color ? colorClasses[color] : 'bg-slate-100 text-slate-600'}`}>
                        {isExtra ? '+' : '×'}{multiplier}
                    </span>
                )}
            </div>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {formatYen(value)}
            </span>
        </div>
    )
}
