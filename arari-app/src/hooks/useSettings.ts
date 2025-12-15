import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api'

export const useIgnoredCompanies = () => {
    return useQuery({
        queryKey: ['ignoredCompanies'],
        queryFn: async () => {
            const response = await settingsApi.getIgnoredCompanies()
            return response.data || []
        },
    })
}

export const useToggleCompany = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ name, active }: { name: string; active: boolean }) => {
            await settingsApi.toggleCompany(name, active)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ignoredCompanies'] })
            queryClient.invalidateQueries({ queryKey: ['statistics'] })
            queryClient.invalidateQueries({ queryKey: ['companyStatistics'] })
        },
    })
}
