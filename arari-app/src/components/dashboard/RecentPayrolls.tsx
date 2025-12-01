'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, User } from 'lucide-react'
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

  const getBadgeVariant = (margin: number) => {
    if (margin >= 30) return 'success'
    if (margin >= 20) return 'warning'
    return 'danger'
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
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatYen(payroll.grossProfit)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        売上: {formatYen(payroll.billingAmount)}
                      </p>
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
