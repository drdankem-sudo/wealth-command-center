// src/components/markets/EconomicCalendar.tsx
"use client";

import { useEffect, useState } from 'react';
import { CalendarDays, AlertCircle } from 'lucide-react';

interface EconomicEvent {
  country: string;
  date: string;
  event: string;
  impact: string;
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string;
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-slate-400 bg-slate-500/10',
};

// Key events worth highlighting
const KEY_EVENTS = [
  'interest rate', 'fed', 'cpi', 'inflation', 'gdp', 'unemployment',
  'nonfarm', 'payroll', 'pce', 'fomc', 'retail sales', 'consumer confidence',
  'housing', 'ism', 'pmi', 'treasury',
];

function isKeyEvent(eventName: string): boolean {
  const lower = eventName.toLowerCase();
  return KEY_EVENTS.some(k => lower.includes(k));
}

export default function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'key' | 'us'>('key');

  useEffect(() => {
    fetch('/api/markets?type=economic')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEvents(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    if (filter === 'us') return e.country === 'US';
    if (filter === 'key') return isKeyEvent(e.event) || e.impact === 'high';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-400" />
          <h3 className="text-slate-100 font-bold">Economic Calendar</h3>
        </div>
        <div className="flex gap-1">
          {(['key', 'us', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f === 'key' ? 'Key Events' : f === 'us' ? 'US Only' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading economic events...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No upcoming events</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800 bg-slate-900 sticky top-0">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Event</th>
                <th className="p-3 font-medium hidden sm:table-cell">Country</th>
                <th className="p-3 font-medium">Impact</th>
                <th className="p-3 font-medium hidden sm:table-cell">Previous</th>
                <th className="p-3 font-medium hidden sm:table-cell">Estimate</th>
                <th className="p-3 font-medium">Actual</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const isKey = isKeyEvent(e.event);
                return (
                  <tr
                    key={`${e.event}-${e.date}-${i}`}
                    className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${
                      isKey ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className="p-3 text-sm text-slate-400 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isKey && <AlertCircle className="w-3 h-3 text-emerald-400 shrink-0" />}
                        <span className={`text-sm ${isKey ? 'text-slate-100 font-medium' : 'text-slate-300'}`}>
                          {e.event}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-slate-400 hidden sm:table-cell">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">{e.country}</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${IMPACT_COLORS[e.impact] || IMPACT_COLORS.low}`}>
                        {e.impact || 'low'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-400 hidden sm:table-cell">
                      {e.prev !== null ? `${e.prev}${e.unit || ''}` : '-'}
                    </td>
                    <td className="p-3 text-sm text-slate-400 hidden sm:table-cell">
                      {e.estimate !== null ? `${e.estimate}${e.unit || ''}` : '-'}
                    </td>
                    <td className="p-3 text-sm">
                      {e.actual !== null ? (
                        <span className={
                          e.estimate !== null
                            ? e.actual > e.estimate ? 'text-emerald-400 font-bold' : e.actual < e.estimate ? 'text-red-400 font-bold' : 'text-slate-300'
                            : 'text-slate-300'
                        }>
                          {e.actual}{e.unit || ''}
                        </span>
                      ) : (
                        <span className="text-slate-600">Pending</span>
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
