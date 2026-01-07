/**
 * TanStack Query カスタムフック集約エクスポート
 */

// 従業員関連フック
export {
  useEmployees,
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from './useEmployees'

// 給与明細関連フック
export {
  usePayrollRecords,
  usePayrollPeriods,
  useEmployeePayroll,
  usePeriodPayroll,
  useCreatePayroll,
} from './usePayroll'

// 統計データ関連フック
export {
  useDashboardStats,
  useMonthlyStats,
  useCompaniesStats,
  useTrendData,
} from './useStatistics'

// 会社関連フック
export {
  useCompanies,
  useCompanyEmployees,
  useCompanyCount,
} from './useCompanies'

// 認証関連フック
export { useAuth } from './useAuth'

// 設定関連フック
export {
  useIgnoredCompanies,
  useToggleCompany,
} from './useSettings'

// 追加コスト関連フック
export {
  useAdditionalCosts,
  useAdditionalCost,
  useAdditionalCostsSummary,
  useCreateAdditionalCost,
  useUpdateAdditionalCost,
  useDeleteAdditionalCost,
  useCompanyTotalCosts,
  useCopyAdditionalCosts,
} from './useAdditionalCosts'

// ユーティリティフック
export { useFocusTrap } from './useFocusTrap'
