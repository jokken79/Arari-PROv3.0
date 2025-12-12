import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollApi, type PayrollRecord, type PayrollRecordCreate } from '@/lib/api'
import toast from 'react-hot-toast'

/**
 * 給与明細一覧を取得するカスタムフック
 */
export function usePayrollRecords(params?: {
  period?: string
  employeeId?: string
}) {
  return useQuery({
    queryKey: ['payroll', params],
    queryFn: async () => {
      const response = await payrollApi.getAll(params?.period, params?.employeeId)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
  })
}

/**
 * 利用可能な期間一覧を取得するカスタムフック
 */
export function usePayrollPeriods() {
  return useQuery({
    queryKey: ['payroll', 'periods'],
    queryFn: async () => {
      const response = await payrollApi.getPeriods()
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
  })
}

/**
 * 特定従業員の給与明細を取得するカスタムフック
 */
export function useEmployeePayroll(employeeId: string | null) {
  return useQuery({
    queryKey: ['payroll', { employeeId }],
    queryFn: async () => {
      if (!employeeId) throw new Error('Employee ID is required')
      const response = await payrollApi.getAll(undefined, employeeId)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
    enabled: !!employeeId,
  })
}

/**
 * 特定期間の給与明細を取得するカスタムフック
 */
export function usePeriodPayroll(period: string | null) {
  return useQuery({
    queryKey: ['payroll', { period }],
    queryFn: async () => {
      if (!period) throw new Error('Period is required')
      const response = await payrollApi.getAll(period)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
    enabled: !!period,
  })
}

/**
 * 給与明細を作成するミューテーションフック
 */
export function useCreatePayroll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (record: PayrollRecordCreate) => {
      const response = await payrollApi.create(record)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data
    },
    onSuccess: () => {
      // 給与明細一覧、期間一覧、統計データを再取得
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      queryClient.invalidateQueries({ queryKey: ['statistics'] })
      toast.success('給与明細を作成しました')
    },
    onError: (error: Error) => {
      toast.error(`エラー: ${error.message}`)
    },
  })
}
