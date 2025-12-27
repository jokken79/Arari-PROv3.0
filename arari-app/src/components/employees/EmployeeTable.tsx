'use client'

import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Search,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
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
  defaultSortField?: SortField
  defaultSortDirection?: SortDirection
}

type SortField = 'employeeId' | 'name' | 'dispatchCompany' | 'hourlyRate' | 'billingRate' | 'profit' | 'margin'
type SortDirection = 'asc' | 'desc'

const ROW_HEIGHT = 60 // Fixed row height for virtualization

export function EmployeeTable({
  employees,
  onView,
  onEdit,
  onDelete,
  defaultSortField = 'employeeId',
  defaultSortDirection = 'asc'
}: EmployeeTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>(defaultSortField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection)
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<'haken' | 'ukeoi' | 'all'>('haken')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<string>('all')

  // Ref for the scrollable container
  const parentRef = useRef<HTMLDivElement>(null)

  const filteredAndSortedEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      const searchLower = search.toLowerCase()

      // Apply employee type filter
      if (employeeTypeFilter !== 'all' && emp.employeeType !== employeeTypeFilter) {
        return false
      }

      // Apply status filter (show only active if checkbox is checked)
      if (showActiveOnly && emp.status !== 'active') {
        return false
      }

      // Filter out invalid rates (0 or less)
      if (emp.hourlyRate <= 0 || emp.billingRate <= 0) {
        return false
      }

      // Apply company filter (only for haken employees)
      if (employeeTypeFilter === 'haken' && selectedCompany !== 'all') {
        if (emp.dispatchCompany !== selectedCompany) {
          return false
        }
      }

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
        case 'employeeId':
          aValue = a.employeeId
          bValue = b.employeeId
          break
        case 'dispatchCompany':
          aValue = a.dispatchCompany
          bValue = b.dispatchCompany
          break
        case 'hourlyRate':
          aValue = a.hourlyRate
          bValue = b.hourlyRate
          break
        case 'billingRate':
          aValue = a.billingRate
          bValue = b.billingRate
          break
        default:
          aValue = a.name
          bValue = b.name
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
  }, [employees, search, sortField, sortDirection, employeeTypeFilter, showActiveOnly, selectedCompany])

  // Setup virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedEmployees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Render 10 extra items above/below viewport
  })

  // Get unique dispatch companies for haken employees
  const availableCompanies = useMemo(() => {
    const companies = new Set<string>()
    employees
      .filter(emp => emp.employeeType === 'haken')
      .forEach(emp => {
        companies.add(emp.dispatchCompany)
      })
    return Array.from(companies).sort()
  }, [employees])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortField === field
    if (isActive) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="w-4 h-4 text-cyan-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-cyan-400" />
      )
    }
    // Show inactive sort indicator
    return (
      <div className="w-4 h-4 flex flex-col items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">
        <ChevronUp className="w-3 h-3 -mb-1" />
        <ChevronDown className="w-3 h-3 -mt-1" />
      </div>
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

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
                aria-label="従業員を検索"
              />
            </div>

            <select
              value={employeeTypeFilter}
              onChange={(e) => {
                setEmployeeTypeFilter(e.target.value as 'haken' | 'ukeoi' | 'all')
                setSelectedCompany('all')
              }}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
              aria-label="従業員タイプでフィルター"
            >
              <option value="haken">派遣社員のみ</option>
              <option value="ukeoi">請負社員のみ</option>
              <option value="all">全て表示</option>
            </select>

            {employeeTypeFilter === 'haken' && (
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                aria-label="派遣先企業でフィルター"
              >
                <option value="all">全企業</option>
                {availableCompanies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted transition-colors">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span>在職中のみ</span>
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          {/* Fixed Header */}
          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="従業員一覧">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`${col.width} px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted transition-colors group`}
                      onClick={() => handleSort(col.key)}
                      aria-label={`${col.label}でソート`}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.key} />
                      </div>
                    </th>
                  ))}
                  <th scope="col" className="w-20 px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    操作
                  </th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Virtualized Body */}
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ height: Math.min(filteredAndSortedEmployees.length * ROW_HEIGHT, 600) }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const employee = filteredAndSortedEmployees[virtualRow.index]
                const profit = employee.billingRate - employee.hourlyRate
                const margin = (profit / employee.billingRate) * 100

                return (
                  <div
                    key={employee.id}
                    className="absolute top-0 left-0 w-full border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => onView?.(employee)}
                  >
                    <div className="flex items-center h-full">
                      <div className="w-28 px-4 text-[14px] font-mono">
                        {employee.employeeId}
                      </div>
                      <div className="w-36 px-4">
                        <p className="text-[14px] font-medium truncate">{employee.nameKana || employee.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {employee.nameKana ? employee.name : ''}
                        </p>
                      </div>
                      <div className="w-40 px-4 text-[14px] truncate">
                        {employee.dispatchCompany}
                      </div>
                      <div className="w-28 px-4 text-[14px] font-medium">
                        {formatYen(employee.hourlyRate)}
                      </div>
                      <div className="w-28 px-4 text-[14px] font-medium">
                        {formatYen(employee.billingRate)}
                      </div>
                      <div className="w-28 px-4">
                        <span className="text-[14px] font-bold text-emerald-500">
                          {formatYen(profit)}
                        </span>
                      </div>
                      <div className="w-32 px-4">
                        <Badge className={getProfitBgColor(margin)}>
                          {formatPercent(margin)}
                        </Badge>
                      </div>
                      <div className="w-20 px-4 flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            onView?.(employee)
                          }}
                          aria-label={`${employee.name}の詳細を表示`}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit?.(employee)
                          }}
                          aria-label={`${employee.name}を編集`}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete?.(employee)
                          }}
                          aria-label={`${employee.name}を削除`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Empty state */}
          {filteredAndSortedEmployees.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {search ? `「${search}」に一致する従業員はいません` : '従業員がいません'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
