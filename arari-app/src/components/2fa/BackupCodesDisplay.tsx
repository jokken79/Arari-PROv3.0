/**
 * Backup Codes Display Component
 * Shows and allows download of 2FA backup codes
 */

import React, { useState } from 'react';

interface BackupCodesDisplayProps {
  backupCodes: string[];
  onCopyToClipboard?: () => void;
}

export const BackupCodesDisplay: React.FC<BackupCodesDisplayProps> = ({ backupCodes, onCopyToClipboard }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    onCopyToClipboard?.();

    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const codesText = `ArariPRO 2FA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nIMPORTANT: Keep these codes in a safe place. Each code can only be used once.`;
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(codesText)}`);
    element.setAttribute('download', 'backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-yellow-900 mb-2">🔐 Backup Codes</h3>
        <p className="text-sm text-yellow-800">
          Save these codes in a secure location. You can use them to recover your account if you lose access to your authenticator app.
        </p>
      </div>

      <div className="bg-white rounded p-4 mb-4 font-mono text-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {backupCodes.map((code, index) => (
            <div
              key={index}
              className="bg-gray-50 p-2 rounded text-center font-bold tracking-wider hover:bg-gray-100 transition"
            >
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopyToClipboard}
          className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition font-medium text-sm"
        >
          {copied ? '✓ Copied' : '📋 Copy to Clipboard'}
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition font-medium text-sm"
        >
          ⬇️ Download
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-yellow-200">
        <p className="text-xs text-yellow-800">
          ⚠️ <strong>IMPORTANT:</strong> Each backup code can only be used once. Store them securely and never share them with anyone.
        </p>
      </div>
    </div>
  );
};
