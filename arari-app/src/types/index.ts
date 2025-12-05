// Employee (派遣社員) type
export interface Employee {
  id: string
  employeeId: string          // 社員番号
  name: string                // 氏名
  nameKana: string            // 氏名（カナ）
  dispatchCompany: string     // 派遣先
  department: string          // 部署
  hourlyRate: number          // 時給
  billingRate: number         // 単価
  employeeType?: 'haken' | 'ukeoi'  // 従業員タイプ: 派遣=haken, 請負=ukeoi
  status: 'active' | 'inactive' | 'pending'
  hireDate: string            // 入社日
  createdAt: string
  updatedAt: string
}

// Payroll Record (給料明細) type
export interface PayrollRecord {
  id: string
  employeeId: string
  period: string              // YYYY年M月
  workDays: number            // 出勤日数
  workHours: number           // 労働時間
  overtimeHours: number       // 残業時間
  paidLeaveHours: number      // 有給時間
  paidLeaveDays: number       // 有給日数
  baseSalary: number          // 基本給
  overtimePay: number         // 残業代
  transportAllowance: number  // 通勤費
  otherAllowances: number     // その他手当
  grossSalary: number         // 総支給額
  socialInsurance: number     // 社会保険料（本人負担）
  employmentInsurance: number // 雇用保険料
  incomeTax: number           // 所得税
  residentTax: number         // 住民税
  otherDeductions: number     // その他控除
  netSalary: number           // 差引支給額
  // Billing info
  billingAmount: number       // 請求金額 (to client)
  // Calculated fields
  companySocialInsurance: number  // 社会保険（会社負担）= 本人負担と同額
  companyEmploymentInsurance: number // 雇用保険（会社負担）0.95%
  companyWorkersComp: number  // 労災保険（会社負担100%）0.3%
  totalCompanyCost: number    // 会社総コスト
  grossProfit: number         // 粗利
  profitMargin: number        // マージン率
}

// Monthly Summary type
export interface MonthlySummary {
  period: string
  year: number
  month: number
  totalEmployees: number
  totalRevenue: number        // 総売上
  totalSalaryCost: number     // 総給与コスト
  totalSocialInsurance: number // 総社会保険（会社負担）
  totalEmploymentInsurance: number // 総雇用保険 0.95%
  totalWorkersComp: number    // 総労災保険 0.3%
  totalPaidLeaveCost: number  // 総有給コスト
  totalTransportCost: number  // 総通勤費（gross_salaryに含む）
  totalCompanyCost: number    // 会社総コスト
  totalGrossProfit: number    // 総粗利
  averageMargin: number       // 平均マージン率
  topProfitEmployees: {
    employeeId: string
    name: string
    profit: number
  }[]
  bottomProfitEmployees: {
    employeeId: string
    name: string
    profit: number
  }[]
}

// Company (派遣先) Summary type
export interface CompanySummary {
  companyName: string
  employeeCount: number
  averageHourlyRate: number
  averageBillingRate: number
  averageProfit: number
  averageMargin: number
  totalMonthlyProfit: number
  employees: Employee[]
}

// Dashboard Statistics type
export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  totalCompanies: number
  averageProfit: number
  averageMargin: number
  totalMonthlyRevenue: number
  totalMonthlyCost: number
  totalMonthlyProfit: number
  profitTrend: {
    period: string
    profit: number
    revenue: number
    cost: number
  }[]
  profitDistribution: {
    range: string
    count: number
    percentage: number
  }[]
  topCompanies: CompanySummary[]
  recentPayrolls: PayrollRecord[]
}

// Upload file type
export interface UploadedFile {
  id: string
  filename: string
  uploadedAt: string
  recordsCount: number
  period: string
  status: 'processing' | 'completed' | 'error'
  errorMessage?: string
}

// Chart data types
export interface ChartDataPoint {
  name: string
  value: number
  fill?: string
}

export interface TrendDataPoint {
  period: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

// Filter options
export interface FilterOptions {
  period?: string
  company?: string
  status?: string
  minMargin?: number
  maxMargin?: number
  search?: string
}

// Sort options
export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// Pagination
export interface PaginationOptions {
  page: number
  limit: number
  total: number
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Theme type
export type Theme = 'light' | 'dark' | 'system'
