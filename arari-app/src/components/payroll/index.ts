/**
 * Payroll Components Module
 *
 * This module exports all payroll-related components:
 * - PayrollSlipModal: Main modal for displaying payroll slips
 * - SalaryDetailsColumn: Column 1 - 給与支給明細
 * - BillingCalculationColumn: Column 2 - 請求金額計算
 * - ProfitAnalysisColumn: Column 3 - 粗利分析
 * - Helper components: DetailRow, DeductionRow, BillingRow
 */

// Main modal component
export { PayrollSlipModal } from './PayrollSlipModal'

// Column components
export { SalaryDetailsColumn } from './SalaryDetailsColumn'
export { BillingCalculationColumn } from './BillingCalculationColumn'
export { ProfitAnalysisColumn } from './ProfitAnalysisColumn'

// Helper components and utilities
export {
  DetailRow,
  DeductionRow,
  BillingRow,
  formatHours,
  getMarginColors,
  type MarginColors
} from './PayrollSlipHelpers'
