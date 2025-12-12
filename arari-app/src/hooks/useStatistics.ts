import { useQuery } from '@tanstack/react-query'
import { statisticsApi } from '@/lib/api'

/**
 * ダッシュボード統計データを取得するカスタムフック
 */
export function useDashboardStats(period?: string) {
  return useQuery({
    queryKey: ['statistics', 'dashboard', period],
    queryFn: async () => {
      const response = await statisticsApi.getDashboard(period)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data
    },
  })
}

/**
 * 月次統計データを取得するカスタムフック
 */
export function useMonthlyStats(params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: ['statistics', 'monthly', params],
    queryFn: async () => {
      const response = await statisticsApi.getMonthly(params?.year, params?.month)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
  })
}

/**
 * 会社別統計データを取得するカスタムフック
 */
export function useCompaniesStats() {
  return useQuery({
    queryKey: ['statistics', 'companies'],
    queryFn: async () => {
      const response = await statisticsApi.getCompanies()
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
  })
}

/**
 * トレンドデータを取得するカスタムフック
 */
export function useTrendData(months: number = 6) {
  return useQuery({
    queryKey: ['statistics', 'trend', months],
    queryFn: async () => {
      const response = await statisticsApi.getTrend(months)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data || []
    },
  })
}
