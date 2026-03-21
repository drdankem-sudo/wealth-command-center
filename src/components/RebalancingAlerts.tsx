// src/components/RebalancingAlerts.tsx
"use client";

import { useMemo } from 'react';
import { Scale, AlertTriangle, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useCurrency } from './CurrencyProvider';

interface Asset {
  asset_class: string;
  balance: number;
  target_allocation: number;
}

interface RebalancingAlertsProps {
  assets: Asset[];
  totalNetWorth: number;
  driftThreshold?: number; // percentage points, default 5
}

interface DriftItem {
  assetClass: string;
  actual: number;
  target: number;
  drift: number;
  dollarAmount: number;
  action: 'buy' | 'sell' | 'ok';
  adjustAmount: number; // $ needed to rebalance
}

export default function RebalancingAlerts({ assets, totalNetWorth, driftThreshold = 5 }: RebalancingAlertsProps) {
  const { format } = useCurrency();

  const drifts = useMemo(() => {
    // Group by asset class
    const classMap: Record<string, { balance: number; target: number }> = {};

    for (const a of assets) {
      const cls = a.asset_class;
      if (!classMap[cls]) classMap[cls] = { balance: 0, target: 0 };
      classMap[cls].balance += Number(a.balance || 0);
      const target = Number(a.target_allocation || 0);
      if (target > classMap[cls].target) classMap[cls].target = target;
    }

    const items: DriftItem[] = Object.entries(classMap)
      .filter(([, v]) => v.target > 0 || v.balance > 0)
      .map(([assetClass, v]) => {
        const actual = totalNetWorth > 0 ? (v.balance / totalNetWorth * 100) : 0;
        const drift = actual - v.target;
        const adjustAmount = Math.abs(drift / 100) * totalNetWorth;

        return {
          assetClass,
          actual: Math.round(actual * 10) / 10,
          target: v.target,
          drift: Math.round(drift * 10) / 10,
          dollarAmount: v.balance,
          action: (drift > driftThreshold ? 'sell' : drift < -driftThreshold ? 'buy' : 'ok') as 'buy' | 'sell' | 'ok',
          adjustAmount,
        };
      })
      .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

    return items;
  }, [assets, totalNetWorth, driftThreshold]);

  const hasTargets = drifts.some(d => d.target > 0);
  const alertCount = drifts.filter(d => d.action !== 'ok').length;

  if (!hasTargets) return null; // Don't show if no targets are set

  return (
    <div className={`bg-slate-900 border rounded-xl shadow-sm overflow-hidden ${
      alertCount > 0 ? 'border-amber-500/30' : 'border-slate-800'
    }`}>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400" />
          <h3 className="text-slate-100 font-bold">Rebalancing Alerts</h3>
        </div>
        {alertCount > 0 ? (
          <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {alertCount} drift{alertCount > 1 ? 's' : ''} detected
          </span>
        ) : (
          <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Balanced
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {drifts.map(d => (
            <div
              key={d.assetClass}
              className={`flex items-center gap-4 p-3 rounded-lg ${
                d.action === 'buy' ? 'bg-emerald-500/5 border border-emerald-500/20' :
                d.action === 'sell' ? 'bg-red-500/5 border border-red-500/20' :
                'bg-slate-800/30 border border-slate-800'
              }`}
            >
              {/* Asset class name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100">{d.assetClass}</p>
                <p className="text-xs text-slate-500">{format(d.dollarAmount)}</p>
              </div>

              {/* Actual vs Target bars */}
              <div className="w-32 hidden sm:block">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Actual {d.actual}%</span>
                  <span>Target {d.target}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${
                      d.action === 'buy' ? 'bg-emerald-500' : d.action === 'sell' ? 'bg-red-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(d.actual, 100)}%` }}
                  />
                  {/* Target marker */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-white/50"
                    style={{ left: `${Math.min(d.target, 100)}%` }}
                  />
                </div>
              </div>

              {/* Drift indicator */}
              <div className="text-right min-w-[80px]">
                <div className={`flex items-center justify-end gap-1 text-sm font-bold ${
                  d.action === 'buy' ? 'text-emerald-400' : d.action === 'sell' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {d.action === 'buy' ? <ArrowUp className="w-3 h-3" /> : d.action === 'sell' ? <ArrowDown className="w-3 h-3" /> : null}
                  {d.drift > 0 ? '+' : ''}{d.drift}%
                </div>
                {d.action !== 'ok' && (
                  <p className="text-[10px] text-slate-500">
                    {d.action === 'buy' ? 'Buy' : 'Sell'} ~{format(d.adjustAmount)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-[10px] mt-4 text-center uppercase tracking-wider">
          Alerts trigger at ±{driftThreshold}% drift from target
        </p>
      </div>
    </div>
  );
}
