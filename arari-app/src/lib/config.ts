/**
 * 粗利 PRO - Centralized Configuration
 *
 * This file provides a single source of truth for all configuration values.
 * All components should import from here instead of using hardcoded values.
 */

// API Configuration
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').trim()
export const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '8000'
export const FRONTEND_PORT = process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000'

// Feature Flags
export const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true'
export const ENABLE_NOTIFICATIONS = process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false'

// Environment
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// API Endpoints helper
export const apiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_BASE_URL}${cleanEndpoint}`
}

// Runtime config validation (client-only)
if (typeof window !== 'undefined') {
  const trimmed = API_BASE_URL.trim()

  if (trimmed.endsWith('/api')) {
    console.warn(
      '[Config] NEXT_PUBLIC_API_URL should be the base origin (e.g., http://localhost:8000) without /api.'
    )
  }

  if (/^https?:\/\/backend(:\d+)?/i.test(trimmed)) {
    console.warn(
      '[Config] NEXT_PUBLIC_API_URL points to "backend" hostname, which is not reachable from the browser. Use a public host like http://localhost:8000 or your domain.'
    )
  }
}

// Export for convenience
export default {
  API_BASE_URL,
  API_PORT,
  FRONTEND_PORT,
  ENABLE_AUTH,
  ENABLE_NOTIFICATIONS,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  apiUrl,
}
