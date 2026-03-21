// src/components/PortfolioAnalytics.tsx
"use client";

import { useMemo } from 'react';
import { Activity, PieChart as PieIcon, Target, Shield } from 'lucide-react';
import { useCurrency } from './CurrencyProvider';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Asset {
  asset_class: string;
  balance: number;
  annual_growth_rate: number;
  annual_yield: number;
  target_allocation: number;
  monthly_income: number;
}

interface HistoryPoint {
  net_worth: number;
}

interface PortfolioAnalyticsProps {
  assets: Asset[];
  history: HistoryPoint[];
  totalNetWorth: number;
  riskFreeRate?: number; // annual, e.g. 4.5 for 4.5%
}

const SECTOR_COLORS: Record<string, string> = {
  'Securities': '#6366f1',
  'Crypto': '#f59e0b',
  'NSE Equities': '#8b5cf6',
  'Gold': '#eab308',
  'Real estate': '#10b981',
  'Farm/ranch': '#22c55e',
  'VC fund': '#ec4899',
  'Startup Equity': '#f97316',
  'Bonds/Tbills': '#06b6d4',
  'Sacco/MMF': '#14b8a6',
  'Cash': '#64748b',
  'Vehicle': '#ef4444',
  'Equipment': '#f43f5e',
  'Commodities': '#a855f7',
};

function MetricCard({ label, value, sublabel, icon, color = 'text-indigo-400' }: {
  label: string; value: string; sublabel?: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-slate-400 text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sublabel && <p className="text-slate-500 text-xs mt-1">{sublabel}</p>}
    </div>
  );
}

export default function PortfolioAnalytics({ assets, history, totalNetWorth, riskFreeRate = 4.5 }: PortfolioAnalyticsProps) {
  const { format } = useCurrency();

  const analytics = useMemo(() => {
    // ─── Sector breakdown ───
    const sectorMap: Record<string, number> = {};
    for (const a of assets) {
      const cls = a.asset_class || 'Other';
      sectorMap[cls] = (sectorMap[cls] || 0) + Number(a.balance || 0);
    }
    const sectorData = Object.entries(sectorMap)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        pct: totalNetWorth > 0 ? (value / totalNetWorth * 100) : 0,
        color: SECTOR_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);

    // ─── Portfolio returns (from history) ───
    let annualReturn = 0;
    let volatility = 0;
    let sharpeRatio = 0;

    if (history.length >= 2) {
      const returns: number[] = [];
      for (let i = 1; i < history.length; i++) {
        const prev = Number(history[i - 1].net_worth);
        const curr = Number(history[i].net_worth);
        if (prev > 0) returns.push((curr - prev) / prev);
      }

      if (returns.length > 0) {
        const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
        annualReturn = avgReturn * 365 * 100; // annualized %

        const variance = returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length;
        volatility = Math.sqrt(variance * 365) * 100; // annualized %

        // Sharpe = (return - risk_free) / volatility
        if (volatility > 0) {
          sharpeRatio = (annualReturn - riskFreeRate) / volatility;
        }
      }
    }

    // ─── Weighted portfolio yield ───
    const totalBalance = assets.reduce((s, a) => s + Number(a.balance || 0), 0);
    const weightedYield = totalBalance > 0
      ? assets.reduce((s, a) => s + (Number(a.balance || 0) * Number(a.annual_yield || 0)), 0) / totalBalance
      : 0;

    // ─── Income diversification ───
    const yieldIncome = assets.reduce((s, a) => s + (Number(a.balance || 0) * Number(a.annual_yield || 0) / 100), 0);
    const monthlyIncomeAnnualized = assets.reduce((s, a) => s + Number(a.monthly_income || 0), 0) * 12;
    const totalIncome = yieldIncome + monthlyIncomeAnnualized;

    // ─── Concentration risk (Herfindahl) ───
    const herfindahl = sectorData.reduce((s, d) => s + Math.pow(d.pct / 100, 2), 0);
    const diversificationScore = Math.max(0, Math.round((1 - herfindahl) * 100));

    return {
      sectorData,
      annualReturn,
      volatility,
      sharpeRatio,
      weightedYield,
      totalIncome,
      yieldIncome,
      monthlyIncomeAnnualized,
      diversificationScore,
    };
  }, [assets, history, totalNetWorth, riskFreeRate]);

  const sharpeLabel = analytics.sharpeRatio > 1 ? 'Excellent' : analytics.sharpeRatio > 0.5 ? 'Good' : analytics.sharpeRatio > 0 ? 'OK' : 'Negative';
  const sharpeColor = analytics.sharpeRatio > 1 ? 'text-emerald-400' : analytics.sharpeRatio > 0.5 ? 'text-blue-400' : analytics.sharpeRatio > 0 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-100">Portfolio Analytics</h2>
        </div>
      </div>

      <div className="p-6">
        {/* ─── Key Metrics ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Annual Return"
            value={history.length >= 2 ? `${analytics.annualReturn.toFixed(1)}%` : 'N/A'}
            sublabel={history.length < 2 ? 'Need more history' : undefined}
            icon={<Activity className="w-4 h-4 text-indigo-400" />}
            color={analytics.annualReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          <MetricCard
            label="Volatility"
            value={history.length >= 2 ? `${analytics.volatility.toFixed(1)}%` : 'N/A'}
            sublabel={analytics.volatility > 20 ? 'High' : analytics.volatility > 10 ? 'Moderate' : 'Low'}
            icon={<Activity className="w-4 h-4 text-amber-400" />}
            color="text-amber-400"
          />
          <MetricCard
            label="Sharpe Ratio"
            value={history.length >= 2 ? analytics.sharpeRatio.toFixed(2) : 'N/A'}
            sublabel={history.length >= 2 ? sharpeLabel : 'Need more history'}
            icon={<Shield className="w-4 h-4 text-blue-400" />}
            color={sharpeColor}
          />
          <MetricCard
            label="Diversification"
            value={`${analytics.diversificationScore}%`}
            sublabel={analytics.diversificationScore > 70 ? 'Well diversified' : analytics.diversificationScore > 40 ? 'Moderate' : 'Concentrated'}
            icon={<PieIcon className="w-4 h-4 text-emerald-400" />}
            color={analytics.diversificationScore > 70 ? 'text-emerald-400' : analytics.diversificationScore > 40 ? 'text-amber-400' : 'text-red-400'}
          />
        </div>

        {/* ─── Sector Breakdown ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie chart */}
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Sector Breakdown</h3>
            {analytics.sectorData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.sectorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {analytics.sectorData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      formatter={(value: any) => format(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">No assets</div>
            )}
          </div>

          {/* Sector list */}
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Allocation Detail</h3>
            <div className="space-y-2">
              {analytics.sectorData.map(s => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-slate-300 flex-1">{s.name}</span>
                  <span className="text-sm text-slate-400">{s.pct.toFixed(1)}%</span>
                  <span className="text-sm text-slate-100 font-medium w-24 text-right">{format(s.value)}</span>
                </div>
              ))}
            </div>

            {/* Income summary */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Income Sources</h4>
              {analytics.yieldIncome > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Yield-based</span>
                  <span className="text-emerald-400">{format(analytics.yieldIncome)}/yr</span>
                </div>
              )}
              {analytics.monthlyIncomeAnnualized > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Monthly income</span>
                  <span className="text-emerald-400">{format(analytics.monthlyIncomeAnnualized)}/yr</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-slate-800">
                <span className="text-slate-300">Total Passive</span>
                <span className="text-emerald-400">{format(analytics.totalIncome)}/yr</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
