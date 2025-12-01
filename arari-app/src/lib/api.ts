/**
 * API client for 粗利 PRO backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
  getAll: async (search?: string, company?: string) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (company) params.append('company', company)
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
  paid_leave_hours: number
  paid_leave_days: number
  base_salary: number
  overtime_pay: number
  transport_allowance: number
  other_allowances: number
  gross_salary: number
  social_insurance: number
  employment_insurance: number
  income_tax: number
  resident_tax: number
  other_deductions: number
  net_salary: number
  billing_amount: number
  company_social_insurance: number
  company_employment_insurance: number
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
  errors?: string[]
}
