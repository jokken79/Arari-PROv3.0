/**
 * Agent Commissions (仲介手数料) TanStack Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentCommissionsApi } from '@/lib/api'

// Query keys
const QUERY_KEYS = {
  agents: ['agent-commissions', 'agents'] as const,
  calculation: (agentId: string, period: string, company?: string) =>
    ['agent-commissions', 'calculation', agentId, period, company] as const,
  history: (agentId?: string, period?: string) =>
    ['agent-commissions', 'history', agentId, period] as const,
  check: (agentId: string, period: string, company: string) =>
    ['agent-commissions', 'check', agentId, period, company] as const,
}

/**
 * Get available agents
 */
export function useAgents() {
  return useQuery({
    queryKey: QUERY_KEYS.agents,
    queryFn: async () => {
      const response = await agentCommissionsApi.getAgents()
      if (response.error) throw new Error(response.error)
      return response.data!
    },
    staleTime: 1000 * 60 * 60, // Agents rarely change
  })
}

/**
 * Calculate commission for an agent
 */
export function useAgentCommission(
  agentId: string | undefined,
  period: string | undefined,
  company?: string
) {
  return useQuery({
    queryKey: QUERY_KEYS.calculation(agentId || '', period || '', company),
    queryFn: async () => {
      if (!agentId || !period) return null
      const response = await agentCommissionsApi.calculate(agentId, period, company)
      if (response.error) throw new Error(response.error)
      return response.data!
    },
    enabled: !!agentId && !!period,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Check if commission is already registered
 */
export function useCheckRegistered(
  agentId: string | undefined,
  period: string | undefined,
  company: string | undefined
) {
  return useQuery({
    queryKey: QUERY_KEYS.check(agentId || '', period || '', company || ''),
    queryFn: async () => {
      if (!agentId || !period || !company) return { registered: false }
      const response = await agentCommissionsApi.checkRegistered(agentId, period, company)
      if (response.error) throw new Error(response.error)
      return response.data!
    },
    enabled: !!agentId && !!period && !!company,
    staleTime: 1000 * 30, // 30 seconds
  })
}

/**
 * Get commission history
 */
export function useCommissionHistory(agentId?: string, period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.history(agentId, period),
    queryFn: async () => {
      const response = await agentCommissionsApi.getHistory(agentId, period)
      if (response.error) throw new Error(response.error)
      return response.data!
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Register commission to additional costs
 */
export function useRegisterCommission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      agentId,
      period,
      company,
      amount,
      notes,
    }: {
      agentId: string
      period: string
      company: string
      amount: number
      notes?: string
    }) => {
      const response = await agentCommissionsApi.register(agentId, period, company, amount, notes)
      if (response.error) throw new Error(response.error)
      return response.data!
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['agent-commissions'] })
      queryClient.invalidateQueries({ queryKey: ['additional-costs'] })
    },
  })
}
