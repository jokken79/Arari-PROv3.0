import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const useIgnoredCompanies = () => {
    return useQuery({
        queryKey: ['ignoredCompanies'],
        queryFn: async () => {
            const response = await api.get('/api/settings/ignored-companies')
            return response.data as string[]
        },
    })
}

export const useToggleCompany = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ name, active }: { name: string; active: boolean }) => {
            await api.post(`/api/companies/${encodeURIComponent(name)}/toggle`, { active })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ignoredCompanies'] })
            queryClient.invalidateQueries({ queryKey: ['statistics'] })
            queryClient.invalidateQueries({ queryKey: ['companyStatistics'] })
        },
    })
}
