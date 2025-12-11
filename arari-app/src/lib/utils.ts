import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number as Japanese Yen
export function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format number with commas (Japanese style)
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

// Format percentage
export function formatPercent(num: number, decimals: number = 1): string {
  return `${num.toFixed(decimals)}%`
}

// Format hours (H:MM format)
export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

// Parse Japanese period format (YYYY年M月)
export function parsePeriod(period: string): { year: number; month: number } | null {
  const match = period.match(/(\d{4})年(\d{1,2})月/)
  if (!match) return null
  return {
    year: parseInt(match[1]),
    month: parseInt(match[2]),
  }
}

// Format to Japanese period
export function formatPeriod(year: number, month: number): string {
  return `${year}年${month}月`
}

// Compare two periods for sorting (handles 2025年10月 > 2025年9月 correctly)
// Returns: negative if a < b, positive if a > b, 0 if equal
export function comparePeriods(a: string, b: string): number {
  const periodA = parsePeriod(a)
  const periodB = parsePeriod(b)

  // Handle invalid periods
  if (!periodA && !periodB) return 0
  if (!periodA) return 1  // Invalid periods go to end
  if (!periodB) return -1

  // Compare year first, then month
  if (periodA.year !== periodB.year) {
    return periodA.year - periodB.year
  }
  return periodA.month - periodB.month
}

// Sort periods descending (newest first): 2025年10月, 2025年9月, 2025年8月...
export function sortPeriodsDescending(periods: string[]): string[] {
  return [...periods].sort((a, b) => comparePeriods(b, a))
}

// Sort periods ascending (oldest first): 2025年1月, 2025年2月...
export function sortPeriodsAscending(periods: string[]): string[] {
  return [...periods].sort((a, b) => comparePeriods(a, b))
}

// Get color class based on profit margin
export function getProfitColor(margin: number): string {
  if (margin >= 10) return 'text-emerald-500'
  if (margin >= 7) return 'text-green-500'
  if (margin >= 3) return 'text-amber-500'
  return 'text-red-500'
}

// Get background color class based on profit margin
export function getProfitBgColor(margin: number): string {
  if (margin >= 10) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  if (margin >= 7) return 'bg-green-500/10 text-green-500 border-green-500/20'
  if (margin >= 3) return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  return 'bg-red-500/10 text-red-500 border-red-500/20'
}

// Calculate 粗利 (gross profit)
export function calculateArari(billingRate: number, hourlyRate: number): number {
  return billingRate - hourlyRate
}

// Calculate margin rate
export function calculateMarginRate(billingRate: number, hourlyRate: number): number {
  if (billingRate === 0) return 0
  return ((billingRate - hourlyRate) / billingRate) * 100
}

// Insurance rates (2024年度)
export const INSURANCE_RATES = {
  EMPLOYMENT: 0.0095,    // 雇用保険（会社負担）0.95%
  WORKERS_COMP: 0.003,   // 労災保険 0.3% (派遣業)
}

// Billing multipliers (what factory pays us)
export const BILLING_MULTIPLIERS = {
  OVERTIME_NORMAL: 1.25,      // 残業 ≤60h: ×1.25
  OVERTIME_OVER_60H: 1.5,     // 残業 >60h: ×1.5
  NIGHT: 0.25,                // 深夜: +0.25 (extra on top)
  HOLIDAY: 1.35,              // 休日: ×1.35
}

// Calculate billing amount from hours and billing rate
export interface BillingParams {
  workHours: number           // 労働時間
  overtimeHours: number       // 残業時間 (≤60h)
  overtimeOver60h: number     // 60H過残業
  nightHours: number          // 深夜時間
  holidayHours: number        // 休日時間
  billingRate: number         // 単価
}

export function calculateBillingAmount(params: BillingParams): number {
  const { workHours, overtimeHours, overtimeOver60h, nightHours, holidayHours, billingRate } = params

  if (billingRate <= 0) return 0

  // 基本時間: 単価 × work_hours
  const baseBilling = workHours * billingRate

  // 残業 ≤60h: 単価 × 1.25
  const overtimeBilling = overtimeHours * billingRate * BILLING_MULTIPLIERS.OVERTIME_NORMAL

  // 残業 >60h: 単価 × 1.5
  const overtimeOver60hBilling = overtimeOver60h * billingRate * BILLING_MULTIPLIERS.OVERTIME_OVER_60H

  // 深夜: 単価 × 0.25 (extra)
  const nightBilling = nightHours * billingRate * BILLING_MULTIPLIERS.NIGHT

  // 休日: 単価 × 1.35
  const holidayBilling = holidayHours * billingRate * BILLING_MULTIPLIERS.HOLIDAY

  return Math.round(baseBilling + overtimeBilling + overtimeOver60hBilling + nightBilling + holidayBilling)
}

// Calculate real cost including social insurance
export interface RealCostParams {
  grossSalary: number          // 総支給額 (includes transport)
  socialInsurance: number      // 社会保険 (employee portion - company pays same amount)
  employmentInsurance?: number // 雇用保険 (optional, will calculate)
  workersComp?: number         // 労災保険 (optional, will calculate)
  paidLeaveHours: number       // 有給休暇時間
  hourlyRate: number           // 時給
}

export function calculateRealCost(params: RealCostParams): number {
  const {
    grossSalary,
    socialInsurance,       // Company pays same amount as employee (労使折半)
    paidLeaveHours,
    hourlyRate,
  } = params

  // Calculate company insurance costs
  const companyEmploymentIns = params.employmentInsurance ?? Math.round(grossSalary * INSURANCE_RATES.EMPLOYMENT)
  const companyWorkersComp = params.workersComp ?? Math.round(grossSalary * INSURANCE_RATES.WORKERS_COMP)

  // NOTE: transportAllowance is already included in grossSalary
  return (
    grossSalary +
    socialInsurance +           // Company's portion = employee's portion
    companyEmploymentIns +      // 雇用保険 0.95%
    companyWorkersComp +        // 労災保険 0.3%
    (paidLeaveHours * hourlyRate)
  )
}

// Calculate real 粗利 with all costs
export interface RealArariParams {
  revenue: number            // 売上 (billing_rate × hours)
  grossSalary: number        // 総支給額 (includes transport)
  socialInsurance: number    // 社会保険 (company portion = employee portion)
  employmentInsurance?: number // 雇用保険 (optional)
  workersComp?: number       // 労災保険 (optional)
  paidLeaveHours: number     // 有給時間
  hourlyRate: number         // 時給
}

export function calculateRealArari(params: RealArariParams): number {
  const cost = calculateRealCost({
    grossSalary: params.grossSalary,
    socialInsurance: params.socialInsurance,
    employmentInsurance: params.employmentInsurance,
    workersComp: params.workersComp,
    paidLeaveHours: params.paidLeaveHours,
    hourlyRate: params.hourlyRate,
  })

  return params.revenue - cost
}

// Delay utility for animations
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
