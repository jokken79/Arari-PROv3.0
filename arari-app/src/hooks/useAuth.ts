'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE_URL } from '@/lib/api'

const API_URL = API_BASE_URL

interface User {
  id: number
  username: string
  full_name: string
  role: string
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
}

interface LoginCredentials {
  username: string
  password: string
}

interface LoginResponse {
  token: string
  token_type: string
  user: User
  expires_at?: string
  refresh_token?: string
  refresh_expires_at?: string
  must_change_password?: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  })

  // Track if component is mounted (for SSR safety)
  const isMounted = useRef(false)

  // Verify authentication by calling /api/auth/me
  // This works because the backend reads the HttpOnly cookie automatically
  const verifyAuth = useCallback(async (): Promise<boolean> => {
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include', // Send HttpOnly cookies
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const user = await response.json()
          // Store user info in localStorage for display purposes only
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user))
          }
          if (isMounted.current) {
            setAuthState({
              isAuthenticated: true,
              user,
              isLoading: false,
            })
          }
          return true
        } else {
          // Not authenticated - clear cached user info
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user')
          }
          if (isMounted.current) {
            setAuthState({
              isAuthenticated: false,
              user: null,
              isLoading: false,
            })
          }
          return false
        }
      } catch (error) {
        console.error(`Auth verification attempt ${attempt + 1} failed:`, error)

        const errorMessage = error instanceof Error ? error.message : ''
        const isNetworkError = errorMessage === 'Load failed' ||
                               errorMessage === 'Failed to fetch' ||
                               errorMessage.includes('aborted')

        if (isNetworkError && attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }

        // On final failure, try to use cached user data
        if (typeof window !== 'undefined') {
          const cachedUser = localStorage.getItem('user')
          if (cachedUser && isMounted.current) {
            try {
              const user = JSON.parse(cachedUser)
              setAuthState({
                isAuthenticated: true,
                user,
                isLoading: false,
              })
              console.log('Using cached user data due to network error')
              return true
            } catch {
              // Invalid cached data
            }
          }
        }

        if (isMounted.current) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          })
        }
        return false
      }
    }

    return false
  }, [])

  // Initialize auth state
  useEffect(() => {
    isMounted.current = true

    const initAuth = async () => {
      if (typeof window === 'undefined') {
        return
      }

      // Check if we have cached user data (for faster initial render)
      const cachedUser = localStorage.getItem('user')
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser)
          // Show cached data while verifying
          if (isMounted.current) {
            setAuthState({
              isAuthenticated: true,
              user,
              isLoading: true, // Still loading - verifying
            })
          }
        } catch {
          // Invalid cached data
        }
      }

      // Verify with server (this checks the HttpOnly cookie)
      await verifyAuth()
    }

    initAuth()

    return () => {
      isMounted.current = false
    }
  }, [verifyAuth])

  // Login function
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }> => {
    const maxRetries = 3
    let lastError = ''

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          credentials: 'include', // Allow server to set HttpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        })

        if (!response.ok) {
          const data = await response.json()
          return { success: false, error: data.detail || 'ログインに失敗しました' }
        }

        const data: LoginResponse = await response.json()

        // Store user info in localStorage for display (NOT the token!)
        localStorage.setItem('user', JSON.stringify(data.user))

        // Update state
        setAuthState({
          isAuthenticated: true,
          user: data.user,
          isLoading: false,
        })

        // Return success with password change flag
        return {
          success: true,
          mustChangePassword: data.must_change_password
        }
      } catch (error) {
        console.error(`Login attempt ${attempt + 1} failed:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        if (errorMessage === 'Load failed' || errorMessage === 'Failed to fetch') {
          lastError = 'サーバーに接続できません。ネットワーク接続を確認してください。'
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
            continue
          }
        } else {
          lastError = 'ログインに失敗しました'
          break
        }
      }
    }

    return { success: false, error: lastError || 'ログインに失敗しました' }
  }

  // Logout function
  const logout = async () => {
    const clearLocalState = () => {
      localStorage.removeItem('user')
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      })
      window.location.href = '/login'
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      // Call backend logout - this clears the HttpOnly cookies
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Send cookies so server can clear them
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        clearLocalState()
      } else {
        console.warn('Server logout returned error, clearing local state anyway')
        clearLocalState()
      }
    } catch (error) {
      console.error('Logout error:', error)
      clearLocalState()
    }
  }

  // Refresh token function (for extending session)
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Send refresh token cookie
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
          setAuthState({
            isAuthenticated: true,
            user: data.user,
            isLoading: false,
          })
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isLoading: authState.isLoading,
    login,
    logout,
    refreshToken,
    verifyAuth,
  }
}
