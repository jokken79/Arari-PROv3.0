import { render, screen } from '@testing-library/react'
import { EmployeeTable } from '@/components/employees/EmployeeTable'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/employees',
}))

// Mock data - using employee_type: 'haken' to match default filter
const mockEmployees = [
  {
    employee_id: 'EMP001',
    name: '田中太郎',
    dispatch_company: '加藤木材工業',
    hourly_rate: 1500,
    billing_rate: 1700,
    status: 'active',
    hire_date: '2024-01-15',
    employee_type: 'haken',
  },
  {
    employee_id: 'EMP002',
    name: '佐藤花子',
    dispatch_company: '株式会社オーツカ',
    hourly_rate: 1600,
    billing_rate: 1782,
    status: 'active',
    hire_date: '2024-02-01',
    employee_type: 'haken',
  },
]

describe('EmployeeTable', () => {
  const mockOnSelectEmployee = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the employee table component with title', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Check that component renders with title
    expect(screen.getByText('従業員一覧')).toBeInTheDocument()
  })

  it('renders table headers', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Check for table headers
    expect(screen.getByText('社員番号')).toBeInTheDocument()
  })

  it('renders component when no employees', () => {
    render(
      <EmployeeTable
        employees={[]}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Should still render the component with table
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('has filter controls', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Check for filter options
    expect(screen.getByText('派遣社員のみ')).toBeInTheDocument()
  })
})
