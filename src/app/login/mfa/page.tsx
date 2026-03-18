// src/app/login/mfa/page.tsx
"use client";

import { useState } from 'react';
import { createClient } from '../../../utils/supabase-client';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, Smartphone } from 'lucide-react';

export default function MfaVerificationPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Get the list of 2FA factors for the logged-in user
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setError(factorsError.message);
      setLoading(false);
      return;
    }

    const totpFactor = factors.totp[0];
    if (!totpFactor) {
      setError("No 2FA device found. Please contact support.");
      setLoading(false);
      return;
    }

    // 2. Challenge the factor
    const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challenge.error) {
      setError(challenge.error.message);
      setLoading(false);
      return;
    }

    // 3. Verify the 6-digit code
    const verify = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.data.id,
      code: code
    });

    if (verify.error) {
      setError("Invalid code. Please try again.");
      setLoading(false);
    } else {
      // SUCCESS! The session is now AAL2 (Level 2).
      // The proxy.ts bouncer will now let us through to the dashboard.
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-500/10 p-4 rounded-full mb-4 text-indigo-500">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Second Factor Required</h1>
          <p className="text-slate-400 text-sm mt-2 text-center">
            Enter the 6-digit code from your Authenticator app to unlock the vault.
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-6">
          <div className="flex justify-center">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="bg-slate-950 border-2 border-slate-800 text-white text-4xl tracking-[0.5em] font-mono text-center w-full py-4 rounded-lg outline-none focus:border-indigo-500 transition-colors"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
            Unlock Command Center
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </form>

        <button 
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="w-full mt-6 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          Cancel & Log Out
        </button>
      </div>
    </div>
  );
}
