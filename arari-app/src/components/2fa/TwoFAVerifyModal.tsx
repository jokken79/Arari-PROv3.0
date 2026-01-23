/**
 * 2FA Verification Modal for Login
 * Allows users to verify their identity during login with TOTP or backup codes
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerifyCodeInput, VerificationMethod } from './VerifyCodeInput';
import { useVerifyCode2FA } from '@/hooks/use2FA';

interface TwoFAVerifyModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFAVerifyModal: React.FC<TwoFAVerifyModalProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [method, setMethod] = useState<VerificationMethod>('totp');
  const { mutate: verifyCode, isPending: isVerifying } = useVerifyCode2FA();

  const handleVerifyCode = async (code: string, verificationMethod: VerificationMethod) => {
    setVerifyError(null);

    try {
      const payload =
        verificationMethod === 'totp'
          ? { totp_code: code }
          : { backup_code: code };

      verifyCode(payload, {
        onSuccess: () => {
          // Success - login will proceed
          onSuccess();
        },
        onError: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : '認証コードが正しくありません';
          setVerifyError(errorMessage);
        },
      });
    } catch (err) {
      setVerifyError('認証に失敗しました。もう一度お試しください。');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-800/90 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/30 p-8 backdrop-blur-xl border border-slate-100 dark:border-slate-700/50"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500">
            <Key className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              二段階認証
            </h2>
            <Badge variant="default" className="mt-1">
              セキュリティ認証
            </Badge>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          登録済みの認証器からコードを入力してください
        </p>
      </div>

      {/* Error Message */}
      {verifyError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 mb-6"
        >
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{verifyError}</span>
        </motion.div>
      )}

      {/* Verification Input */}
      <div className="mb-6">
        <VerifyCodeInput
          onVerify={(code: string, verMethod: VerificationMethod) => {
            setMethod(verMethod);
            handleVerifyCode(code, verMethod);
          }}
          isLoading={isVerifying}
          error={verifyError}
        />
      </div>

      {/* Loading State */}
      {isVerifying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-4"
        >
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 mr-2" />
          <span className="text-sm text-slate-500 dark:text-slate-400">認証中...</span>
        </motion.div>
      )}

      {/* Cancel Button */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          ログイン画面に戻る
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">
        コード入力欄の下部にバックアップコード入力オプションがあります
      </p>
    </motion.div>
  );
};
