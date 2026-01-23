/**
 * Test suite for AuthGuard component
 * Tests protected route access, redirects, loading states
 * Follows TDD: RED-GREEN-REFACTOR cycle
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/auth/AuthGuard'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

describe('AuthGuard Component', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('When auth is disabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_AUTH = 'false'
    })

    it('renders children directly without auth checks', () => {
      // Arrange
      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      })

      // Act
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      // Assert
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('renders children even when not authenticated', () => {
      // Arrange
      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      })

      // Act
      render(
        <AuthGuard>
          <div>Open Content</div>
        </AuthGuard>
      )

      // Assert
      expect(screen.getByText('Open Content')).toBeInTheDocument()
    })
  })

  describe('When auth is enabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true'
    })

    describe('Loading state', () => {
      it('shows loading spinner while checking authentication', () => {
        // Arrange
        ;(useAuth as jest.Mock).mockReturnValue({
          isAuthenticated: false,
          isLoading: true,
        })

        // Act
        render(
          <AuthGuard>
            <div>Protected Content</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('認証を確認中...')).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      })

      it('does not redirect while loading', () => {
        // Arrange
        ;(useAuth as jest.Mock).mockReturnValue({
          isAuthenticated: false,
          isLoading: true,
        })

        // Act
        render(
          <AuthGuard>
            <div>Protected Content</div>
          </AuthGuard>
        )

        // Assert
        expect(mockPush).not.toHaveBeenCalled()
      })
    })

    describe('Authenticated users', () => {
      beforeEach(() => {
        ;(useAuth as jest.Mock).mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
        })
      })

      it('renders children when authenticated', () => {
        // Act
        render(
          <AuthGuard>
            <div>Dashboard Content</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      })

      it('renders children on protected routes', () => {
        // Act
        render(
          <AuthGuard>
            <div>Employees Page</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('Employees Page')).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })

      it('redirects from login page to dashboard when authenticated', async () => {
        // Arrange
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/login')

        // Act
        render(
          <AuthGuard>
            <div>Login Page</div>
          </AuthGuard>
        )

        // Assert
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/')
        })
      })
    })

    describe('Unauthenticated users', () => {
      beforeEach(() => {
        ;(useAuth as jest.Mock).mockReturnValue({
          isAuthenticated: false,
          isLoading: false,
        })
      })

      it('shows loading state on protected route when not authenticated', () => {
        // Arrange
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/employees')

        // Act
        render(
          <AuthGuard>
            <div>Protected Content</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('ログインページに移動中...')).toBeInTheDocument()
      })

      it('redirects to login on protected routes when not authenticated', async () => {
        // Arrange
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/employees')

        // Act
        render(
          <AuthGuard>
            <div>Employees</div>
          </AuthGuard>
        )

        // Assert
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/login')
        })
      })

      it('renders login page without redirecting', () => {
        // Arrange
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/login')

        // Act
        render(
          <AuthGuard>
            <div>Login Form</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('Login Form')).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })

      it('redirects from dashboard to login when not authenticated', async () => {
        // Arrange
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/')

        // Act
        render(
          <AuthGuard>
            <div>Dashboard</div>
          </AuthGuard>
        )

        // Assert
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/login')
        })
      })
    })

    describe('Route normalization', () => {
      beforeEach(() => {
        ;(useAuth as jest.Mock).mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
        })
      })

      it('handles trailing slashes in paths', () => {
        // Arrange
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/employees/')

        // Act
        render(
          <AuthGuard>
            <div>Employees</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('Employees')).toBeInTheDocument()
      })

      it('treats root paths consistently', () => {
        // Arrange
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/')

        // Act
        render(
          <AuthGuard>
            <div>Home</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('Home')).toBeInTheDocument()
      })
    })

    describe('Public routes', () => {
      it('allows access to login route without authentication', () => {
        // Arrange
        ;(useAuth as jest.Mock).mockReturnValue({
          isAuthenticated: false,
          isLoading: false,
        })
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/login')

        // Act
        render(
          <AuthGuard>
            <div>Login Page</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('Login Page')).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })

      it('only allows login as public route', () => {
        // Arrange
        ;(useAuth as jest.Mock).mockReturnValue({
          isAuthenticated: false,
          isLoading: false,
        })
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/register') // Not a public route

        // Act
        render(
          <AuthGuard>
            <div>Register</div>
          </AuthGuard>
        )

        // Assert - should try to redirect to login
        expect(screen.getByText('ログインページに移動中...')).toBeInTheDocument()
      })
    })

    describe('Effect cleanup', () => {
      it('handles auth state changes correctly', async () => {
        // Arrange
        const { rerender } = render(
          <AuthGuard>
            <div>Content</div>
          </AuthGuard>
        )

        ;(useAuth as jest.Mock).mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
        })
        const { usePathname } = require('next/navigation')
        usePathname.mockReturnValue('/')

        // Act
        rerender(
          <AuthGuard>
            <div>Content</div>
          </AuthGuard>
        )

        // Assert
        expect(screen.getByText('Content')).toBeInTheDocument()
      })
    })
  })
})
