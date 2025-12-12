import { useQuery } from '@tanstack/react-query'
import { employeeApi } from '@/lib/api'

/**
 * 派遣先会社一覧を取得するカスタムフック
 * （従業員データから派遣先を抽出）
 */
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await employeeApi.getAll()
      if (response.error) {
        throw new Error(response.error)
      }

      const employees = response.data || []
      // 派遣先のユニーク一覧を取得
      const companies = Array.from(
        new Set(employees.map(emp => emp.dispatch_company))
      ).sort()

      return companies
    },
  })
}

/**
 * 特定会社の従業員を取得するカスタムフック
 */
export function useCompanyEmployees(companyName: string | null) {
  return useQuery({
    queryKey: ['employees', { company: companyName }],
    queryFn: async () => {
      if (!companyName) throw new Error('Company name is required')
      const response = await employeeApi.getAll(undefined, companyName)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
    enabled: !!companyName,
  })
}

/**
 * 会社数を取得するカスタムフック
 */
export function useCompanyCount() {
  return useQuery({
    queryKey: ['companies', 'count'],
    queryFn: async () => {
      const response = await employeeApi.getAll()
      if (response.error) {
        throw new Error(response.error)
      }

      const employees = response.data || []
      const companies = new Set(employees.map(emp => emp.dispatch_company))

      return companies.size
    },
  })
}
