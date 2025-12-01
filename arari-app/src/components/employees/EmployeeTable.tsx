'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatYen, formatPercent, getProfitBgColor } from '@/lib/utils'
import type { Employee } from '@/types'

interface EmployeeTableProps {
  employees: Employee[]
  onView?: (employee: Employee) => void
  onEdit?: (employee: Employee) => void
  onDelete?: (employee: Employee) => void
}

type SortField = 'employeeId' | 'name' | 'dispatchCompany' | 'hourlyRate' | 'billingRate' | 'profit' | 'margin'
type SortDirection = 'asc' | 'desc'

export function EmployeeTable({ employees, onView, onEdit, onDelete }: EmployeeTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('employeeId')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  const filteredAndSortedEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      const searchLower = search.toLowerCase()
      return (
        emp.employeeId.toLowerCase().includes(searchLower) ||
        emp.name.toLowerCase().includes(searchLower) ||
        emp.nameKana.toLowerCase().includes(searchLower) ||
        emp.dispatchCompany.toLowerCase().includes(searchLower)
      )
    })

    result.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortField) {
        case 'profit':
          aValue = a.billingRate - a.hourlyRate
          bValue = b.billingRate - b.hourlyRate
          break
        case 'margin':
          aValue = ((a.billingRate - a.hourlyRate) / a.billingRate) * 100
          bValue = ((b.billingRate - b.hourlyRate) / b.billingRate) * 100
          break
        default:
          aValue = a[sortField]
          bValue = b[sortField]
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue)
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return result
  }, [employees, search, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  const columns = [
    { key: 'employeeId' as SortField, label: '社員番号', width: 'w-28' },
    { key: 'name' as SortField, label: '氏名', width: 'w-36' },
    { key: 'dispatchCompany' as SortField, label: '派遣先', width: 'w-40' },
    { key: 'hourlyRate' as SortField, label: '時給', width: 'w-28' },
    { key: 'billingRate' as SortField, label: '単価', width: 'w-28' },
    { key: 'profit' as SortField, label: '粗利/時', width: 'w-28' },
    { key: 'margin' as SortField, label: 'マージン率', width: 'w-32' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            従業員一覧
            <Badge variant="secondary">{filteredAndSortedEmployees.length}名</Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.width} px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted transition-colors`}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="w-20 px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredAndSortedEmployees.map((employee, index) => {
                    const profit = employee.billingRate - employee.hourlyRate
                    const margin = (profit / employee.billingRate) * 100

                    return (
                      <motion.tr
                        key={employee.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-mono">
                          {employee.employeeId}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.nameKana}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{employee.dispatchCompany}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {formatYen(employee.hourlyRate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {formatYen(employee.billingRate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-emerald-500">
                            {formatYen(profit)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getProfitBgColor(margin)}>
                            {formatPercent(margin)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onView?.(employee)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onEdit?.(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => onDelete?.(employee)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
