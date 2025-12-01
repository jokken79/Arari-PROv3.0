import type { Employee, PayrollRecord, DashboardStats, CompanySummary } from '@/types'

// Sample employees data
export const sampleEmployees: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: '田中 太郎',
    nameKana: 'タナカ タロウ',
    dispatchCompany: 'ABC株式会社',
    department: '製造部',
    hourlyRate: 1200,
    billingRate: 1800,
    status: 'active',
    hireDate: '2023-04-01',
    createdAt: '2023-04-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: '鈴木 花子',
    nameKana: 'スズキ ハナコ',
    dispatchCompany: 'XYZ工業',
    department: '品質管理',
    hourlyRate: 1350,
    billingRate: 2100,
    status: 'active',
    hireDate: '2023-06-15',
    createdAt: '2023-06-15',
    updatedAt: '2024-01-01',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    name: '佐藤 次郎',
    nameKana: 'サトウ ジロウ',
    dispatchCompany: 'ABC株式会社',
    department: '物流部',
    hourlyRate: 1150,
    billingRate: 1650,
    status: 'active',
    hireDate: '2023-08-01',
    createdAt: '2023-08-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    name: '高橋 美咲',
    nameKana: 'タカハシ ミサキ',
    dispatchCompany: 'テック産業',
    department: '組立ライン',
    hourlyRate: 1400,
    billingRate: 2200,
    status: 'active',
    hireDate: '2023-03-01',
    createdAt: '2023-03-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    name: '伊藤 健太',
    nameKana: 'イトウ ケンタ',
    dispatchCompany: 'XYZ工業',
    department: '製造部',
    hourlyRate: 1250,
    billingRate: 1900,
    status: 'active',
    hireDate: '2023-09-01',
    createdAt: '2023-09-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '6',
    employeeId: 'EMP006',
    name: '渡辺 さくら',
    nameKana: 'ワタナベ サクラ',
    dispatchCompany: 'グローバル製造',
    department: '検査部',
    hourlyRate: 1300,
    billingRate: 2000,
    status: 'active',
    hireDate: '2023-05-15',
    createdAt: '2023-05-15',
    updatedAt: '2024-01-01',
  },
  {
    id: '7',
    employeeId: 'EMP007',
    name: '山本 大輔',
    nameKana: 'ヤマモト ダイスケ',
    dispatchCompany: 'ABC株式会社',
    department: '製造部',
    hourlyRate: 1180,
    billingRate: 1750,
    status: 'active',
    hireDate: '2023-07-01',
    createdAt: '2023-07-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '8',
    employeeId: 'EMP008',
    name: '中村 愛',
    nameKana: 'ナカムラ アイ',
    dispatchCompany: 'テック産業',
    department: '事務',
    hourlyRate: 1100,
    billingRate: 1600,
    status: 'active',
    hireDate: '2023-10-01',
    createdAt: '2023-10-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '9',
    employeeId: 'EMP009',
    name: '小林 翔太',
    nameKana: 'コバヤシ ショウタ',
    dispatchCompany: 'グローバル製造',
    department: '製造部',
    hourlyRate: 1280,
    billingRate: 1950,
    status: 'active',
    hireDate: '2023-04-15',
    createdAt: '2023-04-15',
    updatedAt: '2024-01-01',
  },
  {
    id: '10',
    employeeId: 'EMP010',
    name: '加藤 真由美',
    nameKana: 'カトウ マユミ',
    dispatchCompany: 'XYZ工業',
    department: '品質管理',
    hourlyRate: 1320,
    billingRate: 2050,
    status: 'active',
    hireDate: '2023-02-01',
    createdAt: '2023-02-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '11',
    employeeId: 'EMP011',
    name: '吉田 誠',
    nameKana: 'ヨシダ マコト',
    dispatchCompany: 'ABC株式会社',
    department: '物流部',
    hourlyRate: 1220,
    billingRate: 1850,
    status: 'active',
    hireDate: '2023-11-01',
    createdAt: '2023-11-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '12',
    employeeId: 'EMP012',
    name: '山田 優子',
    nameKana: 'ヤマダ ユウコ',
    dispatchCompany: 'テック産業',
    department: '組立ライン',
    hourlyRate: 1380,
    billingRate: 2150,
    status: 'active',
    hireDate: '2023-01-15',
    createdAt: '2023-01-15',
    updatedAt: '2024-01-01',
  },
]

// Generate payroll records for multiple months
function generatePayrollRecord(
  employee: Employee,
  period: string,
  workHours: number,
  overtimeHours: number,
  paidLeaveHours: number
): PayrollRecord {
  const baseSalary = employee.hourlyRate * workHours
  const overtimePay = employee.hourlyRate * 1.25 * overtimeHours
  const transportAllowance = 15000 // Fixed transport allowance
  const otherAllowances = 5000
  const grossSalary = baseSalary + overtimePay + transportAllowance + otherAllowances

  // Deductions
  const socialInsurance = Math.round(grossSalary * 0.15) // ~15% of gross
  const employmentInsurance = Math.round(grossSalary * 0.006) // ~0.6%
  const incomeTax = Math.round(grossSalary * 0.05)
  const residentTax = Math.round(grossSalary * 0.1)
  const otherDeductions = 0
  const netSalary = grossSalary - socialInsurance - employmentInsurance - incomeTax - residentTax - otherDeductions

  // Billing (revenue from client)
  const totalBillableHours = workHours + overtimeHours
  const billingAmount = employee.billingRate * totalBillableHours

  // Company costs
  const companySocialInsurance = socialInsurance // Same as employee portion
  const companyEmploymentInsurance = Math.round(grossSalary * 0.009) // ~0.9%
  const paidLeaveCost = paidLeaveHours * employee.hourlyRate

  const totalCompanyCost = grossSalary + companySocialInsurance + companyEmploymentInsurance + paidLeaveCost

  // Gross profit
  const grossProfit = billingAmount - totalCompanyCost
  const profitMargin = billingAmount > 0 ? (grossProfit / billingAmount) * 100 : 0

  return {
    id: `${employee.employeeId}-${period}`,
    employeeId: employee.employeeId,
    period,
    workDays: Math.round(workHours / 8),
    workHours,
    overtimeHours,
    paidLeaveHours,
    paidLeaveDays: paidLeaveHours / 8,
    baseSalary,
    overtimePay,
    transportAllowance,
    otherAllowances,
    grossSalary,
    socialInsurance,
    employmentInsurance,
    incomeTax,
    residentTax,
    otherDeductions,
    netSalary,
    billingAmount,
    companySocialInsurance,
    companyEmploymentInsurance,
    totalCompanyCost,
    grossProfit,
    profitMargin,
  }
}

// Generate sample payroll records for 6 months
export const samplePayrollRecords: PayrollRecord[] = []

const periods = ['2024年8月', '2024年9月', '2024年10月', '2024年11月', '2024年12月', '2025年1月']

periods.forEach(period => {
  sampleEmployees.forEach(employee => {
    // Randomize hours a bit
    const baseWorkHours = 160 + Math.floor(Math.random() * 16) - 8
    const overtimeHours = Math.floor(Math.random() * 30)
    const paidLeaveHours = Math.floor(Math.random() * 16)

    samplePayrollRecords.push(
      generatePayrollRecord(employee, period, baseWorkHours, overtimeHours, paidLeaveHours)
    )
  })
})

// Generate dashboard stats from data
export function generateDashboardStats(employees: Employee[], payrollRecords: PayrollRecord[]): DashboardStats {
  const latestPeriod = Array.from(new Set(payrollRecords.map(r => r.period))).sort().reverse()[0]
  const latestRecords = payrollRecords.filter(r => r.period === latestPeriod)

  // Company summaries
  const companyMap = new Map<string, CompanySummary>()

  employees.forEach(emp => {
    const existing = companyMap.get(emp.dispatchCompany)
    if (existing) {
      existing.employeeCount++
      existing.employees.push(emp)
    } else {
      companyMap.set(emp.dispatchCompany, {
        companyName: emp.dispatchCompany,
        employeeCount: 1,
        averageHourlyRate: 0,
        averageBillingRate: 0,
        averageProfit: 0,
        averageMargin: 0,
        totalMonthlyProfit: 0,
        employees: [emp],
      })
    }
  })

  // Calculate company averages
  companyMap.forEach((summary) => {
    const emps = summary.employees
    summary.averageHourlyRate = emps.reduce((sum, e) => sum + e.hourlyRate, 0) / emps.length
    summary.averageBillingRate = emps.reduce((sum, e) => sum + e.billingRate, 0) / emps.length
    summary.averageProfit = summary.averageBillingRate - summary.averageHourlyRate
    summary.averageMargin = (summary.averageProfit / summary.averageBillingRate) * 100

    // Get monthly profit from payroll records
    const companyRecords = latestRecords.filter(r =>
      emps.some(e => e.employeeId === r.employeeId)
    )
    summary.totalMonthlyProfit = companyRecords.reduce((sum, r) => sum + r.grossProfit, 0)
  })

  const topCompanies = Array.from(companyMap.values())
    .sort((a, b) => b.totalMonthlyProfit - a.totalMonthlyProfit)
    .slice(0, 5)

  // Profit trend by period
  const profitTrend = periods.map(period => {
    const periodRecords = payrollRecords.filter(r => r.period === period)
    return {
      period: period.replace('年', '/').replace('月', ''),
      revenue: periodRecords.reduce((sum, r) => sum + r.billingAmount, 0),
      cost: periodRecords.reduce((sum, r) => sum + r.totalCompanyCost, 0),
      profit: periodRecords.reduce((sum, r) => sum + r.grossProfit, 0),
      margin: periodRecords.length > 0
        ? periodRecords.reduce((sum, r) => sum + r.profitMargin, 0) / periodRecords.length
        : 0,
    }
  })

  // Profit distribution
  const profitRanges = [
    { range: '~¥30,000', min: -Infinity, max: 30000 },
    { range: '¥30,000~50,000', min: 30000, max: 50000 },
    { range: '¥50,000~70,000', min: 50000, max: 70000 },
    { range: '¥70,000~100,000', min: 70000, max: 100000 },
    { range: '¥100,000~', min: 100000, max: Infinity },
  ]

  const profitDistribution = profitRanges.map(range => {
    const count = latestRecords.filter(
      r => r.grossProfit >= range.min && r.grossProfit < range.max
    ).length
    return {
      range: range.range,
      count,
      percentage: latestRecords.length > 0 ? (count / latestRecords.length) * 100 : 0,
    }
  })

  return {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'active').length,
    totalCompanies: companyMap.size,
    averageProfit: latestRecords.length > 0
      ? latestRecords.reduce((sum, r) => sum + r.grossProfit, 0) / latestRecords.length
      : 0,
    averageMargin: latestRecords.length > 0
      ? latestRecords.reduce((sum, r) => sum + r.profitMargin, 0) / latestRecords.length
      : 0,
    totalMonthlyRevenue: latestRecords.reduce((sum, r) => sum + r.billingAmount, 0),
    totalMonthlyCost: latestRecords.reduce((sum, r) => sum + r.totalCompanyCost, 0),
    totalMonthlyProfit: latestRecords.reduce((sum, r) => sum + r.grossProfit, 0),
    profitTrend,
    profitDistribution,
    topCompanies,
    recentPayrolls: latestRecords.slice(0, 10),
  }
}
