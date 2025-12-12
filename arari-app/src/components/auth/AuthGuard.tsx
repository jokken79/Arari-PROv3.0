'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login']

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Check if auth is enabled via environment variable
  const isAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true'

  useEffect(() => {
    // Skip auth checks if auth is disabled
    if (!isAuthEnabled) return

    // Skip check if still loading or on public route
    if (isLoading) return

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

    // Redirect to login if not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login')
    }

    // Redirect to dashboard if authenticated and on login page
    if (isAuthenticated && pathname === '/login') {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, pathname, router, isAuthEnabled])

  // If auth is disabled, render children directly
  if (!isAuthEnabled) {
    return <>{children}</>
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">認証を確認中...</p>
        </div>
      </div>
    )
  }

  // Don't render protected content if not authenticated (will redirect)
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">ログインページに移動中...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
