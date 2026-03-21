// src/components/CurrencyProvider.tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface CurrencyContextType {
  currency: 'USD' | 'KES';
  rate: number;
  toggle: () => void;
  format: (usdAmount: number, opts?: { compact?: boolean }) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  rate: 1,
  toggle: () => {},
  format: (v) => `$${v.toLocaleString()}`,
  symbol: '$',
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

export default function CurrencyProvider({
  children,
  initialKesRate,
}: {
  children: ReactNode;
  initialKesRate: number | null;
}) {
  const [currency, setCurrency] = useState<'USD' | 'KES'>('USD');
  const [rate, setRate] = useState<number>(initialKesRate || 130);

  // Fetch rate if not provided
  useEffect(() => {
    if (initialKesRate) {
      setRate(initialKesRate);
      return;
    }
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r => r.json())
      .then(data => {
        if (data?.rates?.KES) setRate(data.rates.KES);
      })
      .catch(() => {});
  }, [initialKesRate]);

  const toggle = useCallback(() => {
    setCurrency(c => c === 'USD' ? 'KES' : 'USD');
  }, []);

  const format = useCallback((usdAmount: number, opts?: { compact?: boolean }) => {
    const value = currency === 'KES' ? usdAmount * rate : usdAmount;
    const prefix = currency === 'KES' ? 'KES ' : '$';

    if (opts?.compact) {
      if (Math.abs(value) >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
      if (Math.abs(value) >= 1_000) return `${prefix}${(value / 1_000).toFixed(0)}k`;
      return `${prefix}${value.toFixed(0)}`;
    }

    return `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }, [currency, rate]);

  const symbol = currency === 'KES' ? 'KES ' : '$';

  return (
    <CurrencyContext.Provider value={{ currency, rate, toggle, format, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}
