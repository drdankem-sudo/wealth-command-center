// src/components/CurrencyToggle.tsx
"use client";

import { ArrowRightLeft } from 'lucide-react';
import { useCurrency } from './CurrencyProvider';

export default function CurrencyToggle() {
  const { currency, rate, toggle } = useCurrency();

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 font-medium">Currency</h3>
        <ArrowRightLeft className="text-blue-500 w-5 h-5" />
      </div>

      <button
        onClick={toggle}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <span className={`text-lg font-bold ${currency === 'USD' ? 'text-emerald-400' : 'text-slate-400'}`}>
          USD
        </span>
        <ArrowRightLeft className="w-4 h-4 text-slate-500" />
        <span className={`text-lg font-bold ${currency === 'KES' ? 'text-emerald-400' : 'text-slate-400'}`}>
          KES
        </span>
      </button>

      <p className="text-center text-slate-400 text-sm mt-3">
        1 USD = <span className="text-blue-400 font-bold">KES {rate.toFixed(2)}</span>
      </p>

      <p className="text-center text-slate-600 text-[10px] mt-2 uppercase tracking-wider">
        Live from ExchangeRate-API
      </p>
    </div>
  );
}
