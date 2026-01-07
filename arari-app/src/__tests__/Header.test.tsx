import { render, screen } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock the hooks used in the Header component
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { username: 'admin', role: 'admin', email: 'admin@arari.jp' },
    logout: jest.fn(),
    isAuthenticated: true,
  })),
}))

jest.mock('@/hooks/useEmployees', () => ({
  useEmployees: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
}))

jest.mock('@/store/appStore', () => ({
  useAppStore: jest.fn(() => ({
    payrollRecords: [],
  })),
}))

jest.mock('@/components/ui/theme-provider', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    setTheme: jest.fn(),
    resolvedTheme: 'dark',
  })),
}))

// Mock TanStack Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}))

describe('Header', () => {
  it('renders the header with the title', () => {
    render(<Header />)

    const titleElement = screen.getByText(/粗利 PRO/i)
    expect(titleElement).toBeInTheDocument()
  })

  it('displays user info when logged in', () => {
    render(<Header />)

    // Check for admin user display
    expect(screen.getByText('管理者')).toBeInTheDocument()
  })
})
