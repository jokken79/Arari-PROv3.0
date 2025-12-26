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
    return { error: error instanceof Error ? error.message : 'Unknown error' }
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

// ============== Upload API ==============

export const uploadApi = {
  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
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
