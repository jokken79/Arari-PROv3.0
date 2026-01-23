/**
 * 2FA Setup Component
 * Main component for setting up two-factor authentication
 */

import React, { useState } from 'react';
import { use2FASetup, useVerify2FA, TwoFASetupResponse } from '@/hooks/use2FA';
import { QRCodeDisplay } from './QRCodeDisplay';
import { BackupCodesDisplay } from './BackupCodesDisplay';
import { VerifyCodeInput, VerificationMethod } from './VerifyCodeInput';

type SetupStep = 'start' | 'show-qr' | 'verify' | 'success';

interface TwoFASetupProps {
  onComplete?: () => void;
}

export const TwoFASetup: React.FC<TwoFASetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<SetupStep>('start');
  const [setupData, setSetupData] = useState<TwoFASetupResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const { mutate: setupMutate, isPending: isSettingUp } = use2FASetup();
  const { mutate: verifyMutate, isPending: isVerifying } = useVerify2FA();

  const handleStartSetup = () => {
    setupMutate(undefined, {
      onSuccess: (data) => {
        setSetupData(data);
        setStep('show-qr');
      },
      onError: (error) => {
        setVerifyError(error instanceof Error ? error.message : 'Setup failed');
      },
    });
  };

  const handleVerifyCode = async (code: string, method: VerificationMethod) => {
    if (!setupData) return;

    setVerifyError(null);

    verifyMutate(
      {
        totp_code: method === 'totp' ? code : undefined,
        backup_codes: setupData.backup_codes,
      },
      {
        onSuccess: () => {
          setStep('success');
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        },
        onError: (error) => {
          setVerifyError(error instanceof Error ? error.message : 'Verification failed');
        },
      }
    );
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Step: Start */}
      {step === 'start' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-2xl font-bold">🔐 Enable Two-Factor Authentication</h2>
          <p className="text-gray-600">
            Add an extra layer of security to your account by requiring a code from your authenticator app when you log in.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">What you'll need:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ An authenticator app (Google Authenticator, Authy, Microsoft Authenticator)</li>
              <li>✓ A secure place to save backup codes</li>
              <li>✓ 5 minutes to complete setup</li>
            </ul>
          </div>

          <button
            onClick={handleStartSetup}
            disabled={isSettingUp}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {isSettingUp ? 'Generating...' : 'Start Setup'}
          </button>
        </div>
      )}

      {/* Step: Show QR */}
      {step === 'show-qr' && setupData && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
          <h2 className="text-2xl font-bold">Step 1: Scan QR Code</h2>

          <QRCodeDisplay
            qrUri={setupData.qr_uri}
            totpSecret={setupData.totp_secret}
            userName="ArariPRO"
          />

          <button
            onClick={() => setStep('verify')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
          >
            I've Scanned the Code
          </button>
        </div>
      )}

      {/* Step: Verify */}
      {step === 'verify' && setupData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold mb-4">Step 2: Verify Code</h2>
            <p className="text-gray-600 mb-6">
              Enter the 6-digit code from your authenticator app to verify setup:
            </p>

            <VerifyCodeInput
              onVerify={handleVerifyCode}
              isLoading={isVerifying}
              error={verifyError}
            />
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold mb-4">Step 3: Save Backup Codes</h2>
            <p className="text-gray-600 mb-6">
              Save these backup codes in a secure location before continuing:
            </p>

            <BackupCodesDisplay backupCodes={setupData.backup_codes} />
          </div>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-green-900">✓ 2FA Enabled!</h2>
          <p className="text-green-800">
            Two-factor authentication is now active on your account. You'll need to enter a code from your authenticator app
            when you log in.
          </p>

          <div className="bg-white rounded p-4 text-sm text-gray-700 space-y-2">
            <p>
              <strong>Next steps:</strong>
            </p>
            <ul className="text-left space-y-1">
              <li>✓ Keep your backup codes safe</li>
              <li>✓ Your authenticator app will generate codes automatically</li>
              <li>✓ Each code expires after 30 seconds</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setStep('start');
              setSetupData(null);
              setVerifyError(null);
            }}
            className="w-full px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
