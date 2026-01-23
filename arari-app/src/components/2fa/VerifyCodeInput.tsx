/**
 * Verify Code Input Component
 * Allows user to enter TOTP or backup code for verification
 */

import React, { useState } from 'react';

export type VerificationMethod = 'totp' | 'backup';

interface VerifyCodeInputProps {
  onVerify: (code: string, method: VerificationMethod) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  successMessage?: string | null;
}

export const VerifyCodeInput: React.FC<VerifyCodeInputProps> = ({ onVerify, isLoading = false, error, successMessage }) => {
  const [method, setMethod] = useState<VerificationMethod>('totp');
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!code.trim()) {
      setLocalError(`Please enter a ${method === 'totp' ? '6-digit' : 'backup'} code`);
      return;
    }

    if (method === 'totp' && code.length !== 6) {
      setLocalError('TOTP code must be 6 digits');
      return;
    }

    if (method === 'totp' && !/^\d{6}$/.test(code)) {
      setLocalError('TOTP code must contain only digits');
      return;
    }

    try {
      await onVerify(code, method);
      setCode('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const currentError = error || localError;

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-bold mb-4">Enter Verification Code</h3>

      {/* Method Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setMethod('totp');
            setCode('');
            setLocalError(null);
          }}
          className={`flex-1 px-4 py-2 rounded font-medium transition ${
            method === 'totp'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🔐 Authenticator
        </button>
        <button
          onClick={() => {
            setMethod('backup');
            setCode('');
            setLocalError(null);
          }}
          className={`flex-1 px-4 py-2 rounded font-medium transition ${
            method === 'backup'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🔑 Backup Code
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {method === 'totp' ? '6-Digit Code' : 'Backup Code'}
          </label>
          <input
            type={method === 'totp' ? 'number' : 'text'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={method === 'totp' ? '000000' : 'Enter backup code'}
            maxLength={method === 'totp' ? 6 : 20}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded border border-gray-300 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            autoComplete="off"
            autoFocus
          />
        </div>

        {/* Error Message */}
        {currentError && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-600 text-sm">❌ {currentError}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-green-600 text-sm">✓ {successMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !code.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {/* Helper Text */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          {method === 'totp'
            ? 'Enter the 6-digit code from your authenticator app'
            : 'Use one of your backup codes if you no longer have access to your authenticator'}
        </p>
      </div>
    </div>
  );
};
