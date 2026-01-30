/**
 * Test suite for 2FA hooks
 * Tests TOTP setup, verification, status checking, and disabling
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  use2FASetup, useVerify2FA, useVerifyCode2FA, useDisable2FA, use2FAStatus,
  TwoFASetupResponse, TwoFAVerifyRequest, TwoFAStatusResponse,
} from './use2FA'

global.fetch = jest.fn()

describe('2FA Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const mockSetupResponse: TwoFASetupResponse = {
    totp_secret: 'JBSWY3DPEBLW64TMMQ======',
    qr_uri: 'otpauth://totp/ArariPRO:user@example.com',
    backup_codes: Array(10).fill('code'),
  }

  describe('use2FASetup Hook', () => {
    it('initiates 2FA setup successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSetupResponse,
      })

      const { result } = renderHook(() => use2FASetup(), { wrapper })
      result.current.mutate()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.backup_codes).toHaveLength(10)
    })

    it('sends POST request with credentials', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSetupResponse,
      })

      const { result } = renderHook(() => use2FASetup(), { wrapper })
      result.current.mutate()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/2fa/setup'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
    })

    it('handles 500 error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })

      const { result } = renderHook(() => use2FASetup(), { wrapper })
      result.current.mutate()

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useVerify2FA Hook', () => {
    it('verifies TOTP code', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() => useVerify2FA(), { wrapper })
      result.current.mutate({
        totp_code: '123456',
        backup_codes: Array(10).fill('code'),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('handles invalid code (401)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const { result } = renderHook(() => useVerify2FA(), { wrapper })
      result.current.mutate({
        totp_code: '123456',
        backup_codes: Array(10).fill('code'),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useVerifyCode2FA Hook', () => {
    it('verifies TOTP during login', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() => useVerifyCode2FA(), { wrapper })
      result.current.mutate({ totp_code: '123456' })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('verifies backup code', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() => useVerifyCode2FA(), { wrapper })
      result.current.mutate({ backup_code: 'ABC123' })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })

  describe('useDisable2FA Hook', () => {
    it('disables 2FA', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() => useDisable2FA(), { wrapper })
      result.current.mutate({ password: 'password123' })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('handles incorrect password (401)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const { result } = renderHook(() => useDisable2FA(), { wrapper })
      result.current.mutate({ password: 'wrong' })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('use2FAStatus Query Hook', () => {
    it('fetches 2FA status', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totp_enabled: false, backup_codes_remaining: 0 }),
      })

      const { result } = renderHook(() => use2FAStatus(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data?.totp_enabled).toBe(false)
    })

    it('returns status data consistently', async () => {
      const mockStatus = { totp_enabled: false, backup_codes_remaining: 0 }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStatus,
      })

      const { result } = renderHook(() => use2FAStatus(), { wrapper })

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      expect(result.current.data).toEqual(mockStatus)
      expect(global.fetch).toHaveBeenCalled()
    })
  })
})
