'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, User, Calendar, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatYen, formatPercent } from '@/lib/utils'
import type { PayrollRecord, Employee } from '@/types'

interface RecentPayrollsProps {
  payrolls: PayrollRecord[]
  employees: Employee[]
}

export function RecentPayrolls({ payrolls, employees }: RecentPayrollsProps) {
  const getEmployee = (employeeId: string) => {
    return employees.find(e => e.employeeId === employeeId)
  }

  // 製造派遣 margin targets
  const getBadgeVariant = (margin: number) => {
    if (margin >= 18) return 'success'   // excellent
    if (margin >= 15) return 'success'   // target
    if (margin >= 12) return 'warning'   // close
    if (margin >= 10) return 'warning'   // needs improvement
    return 'danger'                      // below standard
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            最新の給与データ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payrolls.slice(0, 6).map((payroll, index) => {
              const employee = getEmployee(payroll.employeeId)
              const isPositive = payroll.grossProfit > 0

              // Check if there's significant 有給休暇
              const hasPaidLeave = payroll.paidLeaveDays > 0 || payroll.paidLeaveAmount > 0
              const paidLeaveAmount = payroll.paidLeaveAmount > 0
                ? payroll.paidLeaveAmount
                : payroll.paidLeaveHours * (employee?.hourlyRate || 0)

              // Calculate ratio: grossSalary vs billingAmount
              const salaryToBillingRatio = payroll.billingAmount > 0
                ? (payroll.grossSalary / payroll.billingAmount)
                : 0
              // If salary > billing by more than 50%, likely due to 有給
              const hasHighPaidLeave = salaryToBillingRatio > 1.5 && hasPaidLeave

              return (
                <motion.div
                  key={payroll.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{employee?.name || payroll.employeeId}</p>
                      <p className="text-sm text-muted-foreground">
                        {employee?.dispatchCompany}
                      </p>
                      {/* Show 有給 indicator if significant */}
                      {hasPaidLeave && (
                        <p className="text-xs text-amber-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          有給: {payroll.paidLeaveDays}日
                          {paidLeaveAmount > 0 && ` (${formatYen(paidLeaveAmount)})`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatYen(payroll.grossProfit)}
                      </p>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>請求: {formatYen(payroll.billingAmount)}</p>
                        <p className="text-xs">支給: {formatYen(payroll.grossSalary)}</p>
                      </div>
                      {/* Explanation when billing << salary */}
                      {hasHighPaidLeave && (
                        <p className="text-xs text-amber-500 flex items-center gap-1 justify-end mt-1">
                          <AlertCircle className="h-3 w-3" />
                          有給で請求少
                        </p>
                      )}
                    </div>

                    <Badge variant={getBadgeVariant(payroll.profitMargin)}>
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {formatPercent(payroll.profitMargin)}
                    </Badge>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
