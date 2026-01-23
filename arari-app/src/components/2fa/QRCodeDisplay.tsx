/**
 * QR Code Display Component
 * Shows QR code for 2FA setup
 */

import React, { useEffect, useState } from 'react';

interface QRCodeDisplayProps {
  qrUri: string;
  totpSecret: string;
  userName?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ qrUri, totpSecret, userName = 'ArariPRO' }) => {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generate QR code image from URI using QR code API
    const generateQRCode = async () => {
      try {
        // Using qr-code-styling or similar library would be ideal
        // For now, use a simple QR code service
        const encodedURI = encodeURIComponent(qrUri);
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedURI}`;

        setQrImage(qrImageUrl);
        setLoading(false);
      } catch (err) {
        setError('Failed to generate QR code');
        setLoading(false);
      }
    };

    generateQRCode();
  }, [qrUri]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Generating QR Code...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-gray-600 mt-2">Manual entry: {totpSecret}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
        {qrImage && (
          <img src={qrImage} alt="2FA QR Code" className="w-64 h-64" loading="lazy" />
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg w-full">
        <p className="text-sm text-gray-600 mb-2">Can't scan? Enter this code manually:</p>
        <code className="block bg-white p-3 rounded font-mono text-center font-bold text-lg tracking-widest break-all">
          {totpSecret}
        </code>
      </div>

      <p className="text-xs text-gray-500 text-center max-w-sm">
        Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
      </p>
    </div>
  );
};
