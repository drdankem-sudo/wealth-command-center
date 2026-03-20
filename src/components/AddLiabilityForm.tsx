// src/components/AddLiabilityForm.tsx
"use client";

import { addLiability } from '../app/liability-actions';
import { useRef, useState } from 'react';

export default function AddLiabilityForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<{ error?: string; success?: boolean } | null>(null);

  return (
    <div className="bg-slate-900 border border-red-900/30 p-6 rounded-xl shadow-sm">
      <h3 className="text-red-400 font-medium mb-4">Add Liability</h3>

      <form
        ref={formRef}
        action={async (formData) => {
          setStatus(null);
          const result = await addLiability(formData);
          if (result?.error) {
            setStatus({ error: result.error });
          } else {
            setStatus({ success: true });
            formRef.current?.reset();
            setTimeout(() => setStatus(null), 3000);
          }
        }}
        className="flex flex-col gap-4"
      >
        <input
          type="text"
          name="name"
          placeholder="Liability Name (e.g. Home Mortgage)"
          required
          className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-red-500"
        />

        <select
          name="liabilityType"
          required
          className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-red-500"
        >
          <option value="">Select Type...</option>
          <option value="Mortgage">Mortgage</option>
          <option value="Car Loan">Car Loan</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Student Loan">Student Loan</option>
          <option value="Personal Loan">Personal Loan</option>
          <option value="Other">Other</option>
        </select>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Outstanding Balance ($)</label>
            <input type="number" name="balance" placeholder="e.g. 250000" required step="0.01" className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-red-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Annual Interest Rate (%)</label>
              <input type="number" name="interestRate" placeholder="e.g. 6.5" step="0.01" className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-red-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Monthly Payment ($)</label>
              <input type="number" name="monthlyPayment" placeholder="e.g. 1500" step="0.01" className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-red-500" />
            </div>
          </div>
        </div>

        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors mt-2">
          Log Liability
        </button>

        {status?.error && (
          <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center">
            Failed to add liability. Please try again.
          </p>
        )}
        {status?.success && (
          <p className="text-emerald-400 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-center">
            Liability recorded.
          </p>
        )}
      </form>
    </div>
  );
}
