import { render, screen } from '@testing-library/react'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/hooks'
import { useAppStore } from '@/store/appStore'
import { useTheme } from '@/components/ui/theme-provider'

// Mock the hooks used in the Header component
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/store/appStore', () => ({
  useAppStore: jest.fn(),
}))

jest.mock('@/components/ui/theme-provider', () => ({
  useTheme: jest.fn(),
}))

describe('Header', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      logout: jest.fn(),
      isAuthenticated: false,
    });
    (useAppStore as jest.Mock).mockReturnValue({
      payrollRecords: [],
    });
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'dark',
      setTheme: jest.fn(),
      resolvedTheme: 'dark',
    })
  })

  it('renders the header with the title', () => {
    render(<Header />)

    const titleElement = screen.getByText(/粗利 PRO/i)
    expect(titleElement).toBeInTheDocument()
  })
})
