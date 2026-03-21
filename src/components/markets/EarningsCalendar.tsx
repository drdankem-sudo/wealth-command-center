// src/components/markets/EarningsCalendar.tsx
"use client";

import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EarningsEvent {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

export default function EarningsCalendar({ userTickers }: { userTickers: string[] }) {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/markets?type=earnings')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort by date, show user's tickers first
          const sorted = data.sort((a: EarningsEvent, b: EarningsEvent) => {
            const aIsUser = userTickers.includes(a.symbol) ? 0 : 1;
            const bIsUser = userTickers.includes(b.symbol) ? 0 : 1;
            if (aIsUser !== bIsUser) return aIsUser - bIsUser;
            return a.date.localeCompare(b.date);
          });
          setEarnings(sorted.slice(0, 30));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userTickers]);

  const formatRevenue = (val: number | null) => {
    if (val === null) return '-';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-amber-400" />
        <h3 className="text-slate-100 font-bold">Earnings Calendar</h3>
        <span className="text-slate-500 text-xs ml-auto">Next 30 days</span>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading earnings data...</div>
        ) : earnings.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No upcoming earnings</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800 bg-slate-900 sticky top-0">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Symbol</th>
                <th className="p-3 font-medium">Quarter</th>
                <th className="p-3 font-medium hidden sm:table-cell">EPS Est.</th>
                <th className="p-3 font-medium hidden sm:table-cell">EPS Actual</th>
                <th className="p-3 font-medium hidden lg:table-cell">Rev Est.</th>
                <th className="p-3 font-medium hidden lg:table-cell">Rev Actual</th>
                <th className="p-3 font-medium">Surprise</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e, i) => {
                const isUserStock = userTickers.includes(e.symbol);
                const epsSurprise = e.epsActual !== null && e.epsEstimate !== null
                  ? e.epsActual - e.epsEstimate
                  : null;

                return (
                  <tr
                    key={`${e.symbol}-${e.date}-${i}`}
                    className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${
                      isUserStock ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    <td className="p-3 text-sm text-slate-400">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {e.hour && <span className="text-xs text-slate-600 ml-1">{e.hour === 'bmo' ? 'AM' : e.hour === 'amc' ? 'PM' : ''}</span>}
                    </td>
                    <td className="p-3">
                      <span className={`font-bold text-sm ${isUserStock ? 'text-indigo-400' : 'text-slate-100'}`}>
                        {e.symbol}
                      </span>
                      {isUserStock && (
                        <span className="ml-2 bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                          YOURS
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-slate-400">Q{e.quarter} {e.year}</td>
                    <td className="p-3 text-sm text-slate-400 hidden sm:table-cell">
                      {e.epsEstimate !== null ? `$${e.epsEstimate.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-sm hidden sm:table-cell">
                      {e.epsActual !== null ? (
                        <span className={epsSurprise !== null && epsSurprise >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          ${e.epsActual.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-600">Pending</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-slate-400 hidden lg:table-cell">
                      {formatRevenue(e.revenueEstimate)}
                    </td>
                    <td className="p-3 text-sm hidden lg:table-cell">
                      {e.revenueActual !== null ? (
                        <span className="text-slate-300">{formatRevenue(e.revenueActual)}</span>
                      ) : (
                        <span className="text-slate-600">Pending</span>
                      )}
                    </td>
                    <td className="p-3">
                      {epsSurprise !== null ? (
                        <span className={`flex items-center gap-1 text-xs font-bold ${
                          epsSurprise > 0 ? 'text-emerald-400' : epsSurprise < 0 ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {epsSurprise > 0 ? <TrendingUp className="w-3 h-3" /> : epsSurprise < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {epsSurprise > 0 ? '+' : ''}{epsSurprise.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
