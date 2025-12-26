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
  token: string | null
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
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    token: null,
  })

  // Track if component is mounted (for SSR safety)
  const isMounted = useRef(false)

  // Verify token on mount
  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const user = await response.json()
        if (isMounted.current) {
          setAuthState({
            isAuthenticated: true,
            user,
            isLoading: false,
            token,
          })
        }
        return true
      } else {
        // Token invalid, clear storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
        }
        if (isMounted.current) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            token: null,
          })
        }
        return false
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      if (isMounted.current) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          token: null,
        })
      }
      return false
    }
  }, [])

  // Initialize auth state from localStorage
  useEffect(() => {
    isMounted.current = true

    const initAuth = async () => {
      // SSR safety check
      if (typeof window === 'undefined') {
        return
      }

      try {
        const token = localStorage.getItem('auth_token')
        const userJson = localStorage.getItem('user')

        if (token && userJson) {
          try {
            // Verify token is still valid
            const isValid = await verifyToken(token)
            if (!isValid && isMounted.current) {
              // Token expired or invalid - already handled in verifyToken
            }
          } catch (error) {
            console.error('Failed to parse user data:', error)
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
            if (isMounted.current) {
              setAuthState({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                token: null,
              })
            }
          }
        } else {
          // No token found - set not authenticated immediately
          if (isMounted.current) {
            setAuthState({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              token: null,
            })
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted.current) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            token: null,
          })
        }
      }
    }

    initAuth()

    return () => {
      isMounted.current = false
    }
  }, [verifyToken])

  // Login function
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
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

      // Store token and user in localStorage
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Update state
      setAuthState({
        isAuthenticated: true,
        user: data.user,
        isLoading: false,
        token: data.token,
      })

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'ログインに失敗しました' }
    }
  }

  // Logout function
  const logout = async () => {
    try {
      // Call backend logout endpoint
      if (authState.token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authState.token}`,
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and state
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        token: null,
      })

      // Redirect to login
      window.location.href = '/login'
    }
  }

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isLoading: authState.isLoading,
    token: authState.token,
    login,
    logout,
  }
}
