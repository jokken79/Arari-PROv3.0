/**
 * API client for 粗利 PRO backend
 */

// Import centralized config
import { API_BASE_URL as CONFIG_API_URL } from './config'

// Export API_BASE_URL for backwards compatibility
export const API_BASE_URL = CONFIG_API_URL

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error('API Error:', error)
    // Provide more helpful error messages for common network errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    let friendlyMessage = errorMessage

    if (errorMessage === 'Load failed' || errorMessage === 'Failed to fetch' || errorMessage === 'NetworkError when attempting to fetch resource.') {
      friendlyMessage = 'サーバーに接続できません。ネットワーク接続を確認してください。'
    } else if (errorMessage.includes('CORS')) {
      friendlyMessage = 'サーバー接続エラーが発生しました。'
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      friendlyMessage = '接続がタイムアウトしました。再試行してください。'
    }

    return { error: friendlyMessage }
  }
}

// ============== Employee API ==============

export const employeeApi = {
  getAll: async (search?: string, company?: string, employeeType?: string) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (company) params.append('company', company)
    if (employeeType) params.append('employee_type', employeeType)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchApi<Employee[]>(`/api/employees${query}`)
  },

  getOne: async (employeeId: string) => {
    return fetchApi<Employee>(`/api/employees/${employeeId}`)
  },

  create: async (employee: EmployeeCreate) => {
    return fetchApi<Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    })
  },

  update: async (employeeId: string, employee: EmployeeCreate) => {
    return fetchApi<Employee>(`/api/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    })
  },

  delete: async (employeeId: string) => {
    return fetchApi<{ message: string }>(`/api/employees/${employeeId}`, {
      method: 'DELETE',
    })
  },
}

// ============== Payroll API ==============

export const payrollApi = {
  getAll: async (period?: string, employeeId?: string) => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (employeeId) params.append('employee_id', employeeId)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchApi<PayrollRecord[]>(`/api/payroll${query}`)
  },

  getPeriods: async () => {
    return fetchApi<string[]>('/api/payroll/periods')
  },

  create: async (record: PayrollRecordCreate) => {
    return fetchApi<PayrollRecord>('/api/payroll', {
      method: 'POST',
      body: JSON.stringify(record),
    })
  },
}

// ============== Statistics API ==============

export const statisticsApi = {
  getDashboard: async (period?: string) => {
    const query = period ? `?period=${period}` : ''
    return fetchApi<DashboardStats>(`/api/statistics${query}`)
  },

  getMonthly: async (year?: number, month?: number) => {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())
    if (month) params.append('month', month.toString())
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchApi<MonthlyStats[]>(`/api/statistics/monthly${query}`)
  },

  getCompanies: async () => {
    return fetchApi<CompanyStats[]>('/api/statistics/companies')
  },

  getTrend: async (months: number = 6) => {
    return fetchApi<TrendData[]>(`/api/statistics/trend?months=${months}`)
  },
}

// ============== Sync API ==============

export const syncApi = {
  syncEmployees: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync-employees`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Sync failed' }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('Sync Error:', error)
      return { error: error instanceof Error ? error.message : 'Sync failed' }
    }
  },
}

// ============== Settings API ==============

export const settingsApi = {
  getAll: async () => {
    return fetchApi<{ key: string; value: string }[]>('/api/settings')
  },

  getIgnoredCompanies: async () => {
    return fetchApi<string[]>('/api/settings/ignored-companies')
  },

  toggleCompany: async (name: string, active: boolean) => {
    return fetchApi<{ status: string; company: string; active: boolean }>(
      `/api/companies/${encodeURIComponent(name)}/toggle`,
      {
        method: 'POST',
        body: JSON.stringify({ active }),
      }
    )
  },
}

// ============== Additional Costs API (追加コスト) ==============

export interface AdditionalCost {
  id: number
  dispatch_company: string
  period: string
  cost_type: string
  cost_type_label: string
  amount: number
  notes?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface AdditionalCostCreate {
  dispatch_company: string
  period: string
  cost_type: string
  amount: number
  notes?: string
}

export interface AdditionalCostSummary {
  dispatch_company: string
  cost_count: number
  total_amount: number
}

export const COST_TYPES: Record<string, string> = {
  transport_bus: '送迎バス',
  parking: '駐車場代',
  facility: '施設利用費',
  equipment: '設備費',
  uniform: 'ユニフォーム',
  training: '研修費',
  meal: '食事補助',
  other: 'その他',
}

export const additionalCostsApi = {
  getAll: async (company?: string, period?: string) => {
    const params = new URLSearchParams()
    if (company) params.append('company', company)
    if (period) params.append('period', period)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchApi<AdditionalCost[]>(`/api/additional-costs${query}`)
  },

  getOne: async (id: number) => {
    return fetchApi<AdditionalCost>(`/api/additional-costs/${id}`)
  },

  getTypes: async () => {
    return fetchApi<Record<string, string>>('/api/additional-costs/types')
  },

  getSummary: async (period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : ''
    return fetchApi<AdditionalCostSummary[]>(`/api/additional-costs/summary${query}`)
  },

  create: async (cost: AdditionalCostCreate) => {
    return fetchApi<AdditionalCost>('/api/additional-costs', {
      method: 'POST',
      body: JSON.stringify(cost),
    })
  },

  update: async (id: number, cost: Partial<AdditionalCostCreate>) => {
    return fetchApi<AdditionalCost>(`/api/additional-costs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cost),
    })
  },

  delete: async (id: number) => {
    return fetchApi<{ status: string }>(`/api/additional-costs/${id}`, {
      method: 'DELETE',
    })
  },

  getCompanyTotal: async (company: string, period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : ''
    return fetchApi<{ company: string; period: string | null; total_additional_costs: number }>(
      `/api/additional-costs/company/${encodeURIComponent(company)}/total${query}`
    )
  },

  copyToPeriod: async (sourcePeriod: string, targetPeriod: string, company?: string, adjustPercent?: number) => {
    return fetchApi<{ source_period: string; target_period: string; copied: number; skipped: number }>(
      '/api/additional-costs/copy',
      {
        method: 'POST',
        body: JSON.stringify({
          source_period: sourcePeriod,
          target_period: targetPeriod,
          company,
          adjust_percent: adjustPercent || 0,
        }),
      }
    )
  },
}

// ============== Agent Commissions API (仲介手数料) ==============

export interface AgentInfo {
  id: string
  name: string
  display_name: string
  target_companies: string[]
}

export interface CommissionEmployee {
  employee_id: string
  name: string
  nationality: string
  paid_leave_days: number
  absence_days: number
  work_days: number
  rate: number
  category: 'vietnam_normal' | 'vietnam_reduced' | 'other'
  company?: string
}

export interface CommissionCompanyResult {
  company: string
  vietnam_normal: { count: number; amount: number; employees: CommissionEmployee[] }
  vietnam_reduced: { count: number; amount: number; employees: CommissionEmployee[] }
  other: { count: number; amount: number; employees: CommissionEmployee[] }
  total_employees: number
  total_amount: number
}

export interface CommissionCalculation {
  agent_id: string
  agent_name: string
  period: string
  companies: CommissionCompanyResult[]
  employees: CommissionEmployee[]
  summary: {
    total_employees: number
    vietnam_normal: number
    vietnam_reduced: number
    other: number
    total_amount: number
  }
  rules: {
    vietnam_normal_rate: number
    vietnam_reduced_rate: number
    other_rate: number
  }
}

export const agentCommissionsApi = {
  getAgents: async () => {
    return fetchApi<AgentInfo[]>('/api/agent-commissions/agents')
  },

  calculate: async (agentId: string, period: string, company?: string) => {
    const params = new URLSearchParams({ period })
    if (company) params.append('company', company)
    return fetchApi<CommissionCalculation>(
      `/api/agent-commissions/calculate/${encodeURIComponent(agentId)}?${params.toString()}`
    )
  },

  register: async (agentId: string, period: string, company: string, amount: number, notes?: string) => {
    return fetchApi<{ status: string; cost_id: number }>(
      '/api/agent-commissions/register',
      {
        method: 'POST',
        body: JSON.stringify({
          agent_id: agentId,
          period,
          company,
          amount,
          notes,
        }),
      }
    )
  },

  checkRegistered: async (agentId: string, period: string, company: string) => {
    const params = new URLSearchParams({ period, company })
    return fetchApi<{ registered: boolean }>(
      `/api/agent-commissions/check/${encodeURIComponent(agentId)}?${params.toString()}`
    )
  },

  getHistory: async (agentId?: string, period?: string) => {
    const params = new URLSearchParams()
    if (agentId) params.append('agent_id', agentId)
    if (period) params.append('period', period)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchApi<any[]>(`/api/agent-commissions/history${query}`)
  },
}

// ============== Upload API ==============

export const uploadApi = {
  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('Upload Error:', error)
      return { error: error instanceof Error ? error.message : 'Upload failed' }
    }
  },

  importEmployees: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/import-employees`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Import failed' }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('Import Error:', error)
      return { error: error instanceof Error ? error.message : 'Import failed' }
    }
  },
}

// ============== Types ==============

export interface Employee {
  id?: number
  employee_id: string
  name: string
  name_kana?: string
  dispatch_company: string
  department?: string
  hourly_rate: number
  billing_rate: number
  status: string
  hire_date?: string
  employee_type?: string
  created_at?: string
  updated_at?: string
  profit_per_hour?: number
  margin_rate?: number
}

export interface EmployeeCreate {
  employee_id: string
  name: string
  name_kana?: string
  dispatch_company: string
  department?: string
  hourly_rate: number
  billing_rate: number
  status?: string
  hire_date?: string
}

export interface PayrollRecord {
  id?: number
  employee_id: string
  period: string
  work_days: number
  work_hours: number
  overtime_hours: number
  night_hours?: number
  holiday_hours?: number
  overtime_over_60h?: number
  paid_leave_hours: number
  paid_leave_days: number
  paid_leave_amount?: number
  base_salary: number
  overtime_pay: number
  night_pay?: number
  holiday_pay?: number
  overtime_over_60h_pay?: number
  transport_allowance: number
  other_allowances: number
  non_billable_allowances?: number  // 非請求手当（通勤手当（非）、業務手当等）
  gross_salary: number
  social_insurance: number
  welfare_pension?: number          // 厚生年金保険料
  employment_insurance: number
  income_tax: number
  resident_tax: number
  rent_deduction?: number
  utilities_deduction?: number
  meal_deduction?: number
  advance_payment?: number
  year_end_adjustment?: number
  other_deductions: number
  net_salary: number
  billing_amount: number
  company_social_insurance: number
  company_employment_insurance: number
  company_workers_comp?: number
  total_company_cost: number
  gross_profit: number
  profit_margin: number
  created_at?: string
  employee_name?: string
  dispatch_company?: string
}

export interface PayrollRecordCreate {
  employee_id: string
  period: string
  work_days?: number
  work_hours?: number
  overtime_hours?: number
  paid_leave_hours?: number
  paid_leave_days?: number
  base_salary?: number
  overtime_pay?: number
  transport_allowance?: number
  other_allowances?: number
  gross_salary?: number
  social_insurance?: number
  employment_insurance?: number
  income_tax?: number
  resident_tax?: number
  other_deductions?: number
  net_salary?: number
  billing_amount?: number
}

export interface DashboardStats {
  total_employees: number
  active_employees: number
  total_companies: number
  average_profit: number
  average_margin: number
  total_monthly_revenue: number
  total_monthly_cost: number
  total_monthly_profit: number
  profit_trend: TrendData[]
  profit_distribution: DistributionData[]
  top_companies: CompanyStats[]
  recent_payrolls: PayrollRecord[]
  current_period?: string
}

export interface TrendData {
  period: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

export interface DistributionData {
  range: string
  count: number
  percentage: number
}

export interface CompanyStats {
  company_name: string
  employee_count: number
  average_hourly_rate: number
  average_billing_rate: number
  average_profit: number
  average_margin: number
  total_monthly_profit: number
  total_monthly_revenue?: number
  is_active?: boolean
}

export interface MonthlyStats {
  period: string
  total_employees: number
  total_revenue: number
  total_cost: number
  total_profit: number
  average_margin: number
  total_social_insurance: number
  total_paid_leave_cost: number
}

export interface UploadResponse {
  success: boolean
  filename: string
  total_records: number
  saved_records: number
  skipped_count?: number
  error_count?: number
  skipped_details?: Array<{
    employee_id: string
    period: string
    reason: string
  }>
  errors?: string[]
}

export interface SyncResponse {
  success: boolean
  message: string
  stats: {
    haken_added: number
    haken_updated: number
    haken_errors: number
    ukeoi_added: number
    ukeoi_updated: number
    ukeoi_errors: number
    total_added: number
    total_errors: number
  }
}
