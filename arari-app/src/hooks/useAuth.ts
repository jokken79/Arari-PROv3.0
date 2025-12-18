'use client'

import { useState, useEffect, useCallback } from 'react'
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
  access_token: string
  token_type: string
  user: User
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    token: null,
  })

  // Verify token on mount
  const verifyToken = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const user = await response.json()
        setAuthState({
          isAuthenticated: true,
          user,
          isLoading: false,
          token,
        })
        return true
      } else {
        // Token invalid, clear storage
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          token: null,
        })
        return false
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        token: null,
      })
      return false
    }
  }, [])

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token')
      const userJson = localStorage.getItem('user')

      if (token && userJson) {
        try {
          const user = JSON.parse(userJson)
          // Verify token is still valid
          const isValid = await verifyToken(token)
          if (!isValid) {
            // Token expired or invalid
            setAuthState({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              token: null,
            })
          }
        } catch (error) {
          console.error('Failed to parse user data:', error)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            token: null,
          })
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          token: null,
        })
      }
    }

    initAuth()
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
      localStorage.setItem('auth_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Update state
      setAuthState({
        isAuthenticated: true,
        user: data.user,
        isLoading: false,
        token: data.access_token,
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
