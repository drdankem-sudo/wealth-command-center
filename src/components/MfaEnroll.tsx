"use client";

import { useState } from 'react';
import { createClient } from '../utils/supabase/client'; // Ensure this points to your browser client
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Smartphone, Loader2 } from 'lucide-react';

export default function MfaEnroll() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const startEnrollment = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'WealthCommand',
      friendlyName: 'Commander Mobile'
    });

    if (error) {
      setError(error.message);
    } else {
      setFactorId(data.id);
      setQrCodeUrl(data.totp.qr_code);
    }
    setLoading(false);
  };

  const confirmEnrollment = async () => {
    setLoading(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    
    if (challenge.error) {
      setError(challenge.error.message);
    } else {
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode
      });

      if (verify.error) {
        setError(verify.error.message);
      } else {
        setSuccess(true);
        setQrCodeUrl(null);
      }
    }
    setLoading(false);
  };

  if (success) return (
    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 flex items-center gap-2">
      <ShieldCheck className="w-5 h-5" /> 2FA Active: Vault Secured.
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-indigo-500" /> 
        Device Authentication (2FA)
      </h3>

      {!qrCodeUrl ? (
        <button 
          onClick={startEnrollment}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Setup Authenticator App
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-slate-400">Scan this code in Google Authenticator</p>
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={qrCodeUrl} size={160} />
          </div>
          <input 
            placeholder="Enter 6-digit code"
            className="bg-slate-950 border border-slate-800 p-2 rounded text-center text-xl tracking-widest w-40 outline-none focus:border-indigo-500"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
          />
          <button 
            onClick={confirmEnrollment}
            className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg text-sm font-bold"
          >
            Verify & Activate
          </button>
        </div>
      )}
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}