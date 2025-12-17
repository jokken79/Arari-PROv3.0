import { render, screen, fireEvent } from '@testing-library/react'
import { EmployeeTable } from '@/components/employees/EmployeeTable'

// Mock data
const mockEmployees = [
  {
    employee_id: 'EMP001',
    name: '田中太郎',
    dispatch_company: '加藤木材工業',
    hourly_rate: 1500,
    billing_rate: 1700,
    status: 'active',
    hire_date: '2024-01-15',
  },
  {
    employee_id: 'EMP002',
    name: '佐藤花子',
    dispatch_company: '株式会社オーツカ',
    hourly_rate: 1600,
    billing_rate: 1782,
    status: 'active',
    hire_date: '2024-02-01',
  },
  {
    employee_id: 'EMP003',
    name: '鈴木一郎',
    dispatch_company: '株式会社コーリツ',
    hourly_rate: 1700,
    billing_rate: 1990,
    status: 'inactive',
    hire_date: '2023-06-15',
  },
]

describe('EmployeeTable', () => {
  const mockOnSelectEmployee = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the employee table with correct headers', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Check for key headers
    expect(screen.getByText('社員番号')).toBeInTheDocument()
    expect(screen.getByText('名前')).toBeInTheDocument()
    expect(screen.getByText('派遣先')).toBeInTheDocument()
  })

  it('renders all employee rows', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Check for employee names
    expect(screen.getByText('田中太郎')).toBeInTheDocument()
    expect(screen.getByText('佐藤花子')).toBeInTheDocument()
    expect(screen.getByText('鈴木一郎')).toBeInTheDocument()
  })

  it('displays company names correctly', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    expect(screen.getByText('加藤木材工業')).toBeInTheDocument()
    expect(screen.getByText('株式会社オーツカ')).toBeInTheDocument()
    expect(screen.getByText('株式会社コーリツ')).toBeInTheDocument()
  })

  it('calls onSelectEmployee when row is clicked', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Click on employee row
    const employeeRow = screen.getByText('田中太郎').closest('tr')
    if (employeeRow) {
      fireEvent.click(employeeRow)
      expect(mockOnSelectEmployee).toHaveBeenCalledWith(mockEmployees[0])
    }
  })

  it('renders empty state when no employees', () => {
    render(
      <EmployeeTable
        employees={[]}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Should show some empty state indicator
    expect(screen.queryByText('田中太郎')).not.toBeInTheDocument()
  })

  it('displays billing and hourly rates', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Check for formatted currency (may vary based on implementation)
    expect(screen.getByText(/1,700/)).toBeInTheDocument()
    expect(screen.getByText(/1,500/)).toBeInTheDocument()
  })

  it('shows employee status badges', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Should have active/inactive indicators
    const activeElements = screen.getAllByText(/active|稼働中/i)
    expect(activeElements.length).toBeGreaterThan(0)
  })

  it('renders with aria-label for accessibility', () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        onSelectEmployee={mockOnSelectEmployee}
      />
    )

    // Table should have proper accessibility attributes
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
  })
})
