/**
 * Additional Costs Hooks - 追加コスト管理
 * Hooks for managing company-specific additional costs like transport buses (送迎バス)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { additionalCostsApi, AdditionalCostCreate, AdditionalCost } from '@/lib/api'

/**
 * Fetch all additional costs with optional filtering
 */
export const useAdditionalCosts = (company?: string, period?: string) => {
  return useQuery({
    queryKey: ['additionalCosts', { company, period }],
    queryFn: async () => {
      const response = await additionalCostsApi.getAll(company, period)
      if (response.error) throw new Error(response.error)
      return response.data || []
    },
  })
}

/**
 * Fetch a single additional cost by ID
 */
export const useAdditionalCost = (id: number) => {
  return useQuery({
    queryKey: ['additionalCosts', id],
    queryFn: async () => {
      const response = await additionalCostsApi.getOne(id)
      if (response.error) throw new Error(response.error)
      return response.data
    },
    enabled: !!id,
  })
}

/**
 * Fetch summary of costs grouped by company
 */
export const useAdditionalCostsSummary = (period?: string) => {
  return useQuery({
    queryKey: ['additionalCosts', 'summary', period],
    queryFn: async () => {
      const response = await additionalCostsApi.getSummary(period)
      if (response.error) throw new Error(response.error)
      return response.data || []
    },
  })
}

/**
 * Create a new additional cost
 */
export const useCreateAdditionalCost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cost: AdditionalCostCreate) => {
      const response = await additionalCostsApi.create(cost)
      if (response.error) throw new Error(response.error)
      return response.data
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['additionalCosts'] })
      queryClient.invalidateQueries({ queryKey: ['companyStatistics'] })
      queryClient.invalidateQueries({ queryKey: ['statistics'] })
    },
  })
}

/**
 * Update an existing additional cost
 */
export const useUpdateAdditionalCost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...cost }: Partial<AdditionalCostCreate> & { id: number }) => {
      const response = await additionalCostsApi.update(id, cost)
      if (response.error) throw new Error(response.error)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalCosts'] })
      queryClient.invalidateQueries({ queryKey: ['companyStatistics'] })
      queryClient.invalidateQueries({ queryKey: ['statistics'] })
    },
  })
}

/**
 * Delete an additional cost
 */
export const useDeleteAdditionalCost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await additionalCostsApi.delete(id)
      if (response.error) throw new Error(response.error)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalCosts'] })
      queryClient.invalidateQueries({ queryKey: ['companyStatistics'] })
      queryClient.invalidateQueries({ queryKey: ['statistics'] })
    },
  })
}

/**
 * Get total additional costs for a specific company
 */
export const useCompanyTotalCosts = (company: string, period?: string) => {
  return useQuery({
    queryKey: ['additionalCosts', 'total', company, period],
    queryFn: async () => {
      const response = await additionalCostsApi.getCompanyTotal(company, period)
      if (response.error) throw new Error(response.error)
      return response.data
    },
    enabled: !!company,
  })
}

/**
 * Copy costs from one period to another
 */
export const useCopyAdditionalCosts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sourcePeriod,
      targetPeriod,
      company,
      adjustPercent,
    }: {
      sourcePeriod: string
      targetPeriod: string
      company?: string
      adjustPercent?: number
    }) => {
      const response = await additionalCostsApi.copyToPeriod(
        sourcePeriod,
        targetPeriod,
        company,
        adjustPercent
      )
      if (response.error) throw new Error(response.error)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalCosts'] })
    },
  })
}
