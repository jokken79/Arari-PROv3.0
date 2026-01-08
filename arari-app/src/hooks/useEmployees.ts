import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeApi, type Employee, type EmployeeCreate } from '@/lib/api'
import toast from 'react-hot-toast'

/**
 * 従業員一覧を取得するカスタムフック
 */
export function useEmployees(params?: {
  search?: string
  company?: string
  employeeType?: string
}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: async () => {
      const response = await employeeApi.getAll(
        params?.search,
        params?.company,
        params?.employeeType
      )
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
    staleTime: 1000 * 60 * 10, // 10 minutes for employee data
    gcTime: 1000 * 60 * 15, // 15 minutes cache
  })
}

/**
 * 特定の従業員を取得するカスタムフック
 */
export function useEmployee(employeeId: string | null) {
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) throw new Error('Employee ID is required')
      const response = await employeeApi.getOne(employeeId)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 10, // 10 minutes for employee data
    gcTime: 1000 * 60 * 15, // 15 minutes cache
  })
}

/**
 * 従業員を作成するミューテーションフック
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (employee: EmployeeCreate) => {
      const response = await employeeApi.create(employee)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data
    },
    onSuccess: () => {
      // 従業員一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('従業員を作成しました')
    },
    onError: (error: Error) => {
      toast.error(`エラー: ${error.message}`)
    },
  })
}

/**
 * 従業員を更新するミューテーションフック
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      employee,
    }: {
      employeeId: string
      employee: EmployeeCreate
    }) => {
      const response = await employeeApi.update(employeeId, employee)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data
    },
    onSuccess: (data, variables) => {
      // 従業員一覧と個別データを再取得
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee', variables.employeeId] })
      toast.success('従業員情報を更新しました')
    },
    onError: (error: Error) => {
      toast.error(`エラー: ${error.message}`)
    },
  })
}

/**
 * 従業員を削除するミューテーションフック
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await employeeApi.delete(employeeId)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data
    },
    onSuccess: () => {
      // 従業員一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('従業員を削除しました')
    },
    onError: (error: Error) => {
      toast.error(`エラー: ${error.message}`)
    },
  })
}
