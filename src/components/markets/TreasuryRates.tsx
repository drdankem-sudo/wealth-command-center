// src/components/markets/TreasuryRates.tsx
"use client";

import { useEffect, useState } from 'react';
import { Landmark, TrendingUp, TrendingDown } from 'lucide-react';

interface TreasuryRate {
  maturity: string;
  rate: number;
  label: string;
}

export default function TreasuryRates() {
  const [rates, setRates] = useState<TreasuryRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // US Treasury API — free, no key required
    fetch('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=1&filter=security_desc:eq:Treasury Bills,security_desc:eq:Treasury Notes,security_desc:eq:Treasury Bonds')
      .then(r => r.json())
      .then(data => {
        // Fallback: use the Finnhub proxy for treasury yield
        if (!data?.data?.length) throw new Error('no data');
        // Parse the response
        const parsed: TreasuryRate[] = data.data.map((d: any) => ({
          maturity: d.security_desc,
          rate: Number(d.avg_interest_rate_amt),
          label: d.security_desc,
        }));
        setRates(parsed);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: fetch key rates from Finnhub via our proxy
        Promise.all([
          fetch('/api/ticker?symbol=SHY').then(r => r.json()).catch(() => null),  // 1-3yr Treasury
          fetch('/api/ticker?symbol=IEF').then(r => r.json()).catch(() => null),  // 7-10yr Treasury
          fetch('/api/ticker?symbol=TLT').then(r => r.json()).catch(() => null),  // 20+yr Treasury
        ]).then(([shy, ief, tlt]) => {
          const fallback: TreasuryRate[] = [];
          if (shy?.price) fallback.push({ maturity: 'SHY', rate: shy.price, label: '1-3 Year (SHY)' });
          if (ief?.price) fallback.push({ maturity: 'IEF', rate: ief.price, label: '7-10 Year (IEF)' });
          if (tlt?.price) fallback.push({ maturity: 'TLT', rate: tlt.price, label: '20+ Year (TLT)' });
          setRates(fallback);
          setLoading(false);
        });
      });
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <Landmark className="w-5 h-5 text-amber-400" />
        <h3 className="text-slate-100 font-bold">US Treasury Rates</h3>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading rates...</div>
        ) : rates.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Treasury data unavailable</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rates.map(r => (
              <div key={r.maturity} className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{r.label}</p>
                <p className="text-2xl font-bold text-amber-400">
                  {r.rate.toFixed(2)}{r.rate < 20 ? '%' : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-slate-600 text-[10px] mt-3 uppercase tracking-wider">
          Source: US Treasury / Finnhub
        </p>
      </div>
    </div>
  );
}
