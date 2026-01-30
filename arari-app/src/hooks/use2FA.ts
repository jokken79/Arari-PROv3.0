/**
 * 2FA (Two-Factor Authentication) Hooks
 * Manage TOTP setup, verification, and status
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';

// Types
export interface TwoFASetupResponse {
  totp_secret: string;
  qr_uri: string;
  backup_codes: string[];
}

export interface TwoFAVerifyRequest {
  totp_code: string;
  backup_codes: string[];
}

export interface TwoFAVerifyCodeRequest {
  totp_code?: string;
  backup_code?: string;
}

export interface TwoFAStatusResponse {
  totp_enabled: boolean;
  backup_codes_remaining: number;
}

export interface TwoFADisableRequest {
  password: string;
}

/**
 * Hook to initiate 2FA setup
 * Generates TOTP secret and backup codes
 */
export const use2FASetup = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/2fa/setup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      return response.json() as Promise<TwoFASetupResponse>;
    },
  });
};

/**
 * Hook to verify TOTP code and enable 2FA
 */
export const useVerify2FA = () => {
  return useMutation({
    mutationFn: async (data: TwoFAVerifyRequest) => {
      const response = await fetch(`${API_BASE_URL}/api/2fa/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to verify 2FA');
      }

      return response.json();
    },
  });
};

/**
 * Hook to verify TOTP or backup code during login
 */
export const useVerifyCode2FA = () => {
  return useMutation({
    mutationFn: async (data: TwoFAVerifyCodeRequest) => {
      const response = await fetch(`${API_BASE_URL}/api/2fa/verify-code`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to verify code');
      }

      return response.json();
    },
  });
};

/**
 * Hook to disable 2FA (requires password)
 */
export const useDisable2FA = () => {
  return useMutation({
    mutationFn: async (data: TwoFADisableRequest) => {
      const response = await fetch(`${API_BASE_URL}/api/2fa/disable`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      return response.json();
    },
  });
};

/**
 * Hook to get current 2FA status
 */
export const use2FAStatus = () => {
  return useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/2fa/status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch 2FA status');
      }

      return response.json() as Promise<TwoFAStatusResponse>;
    },
  });
};
