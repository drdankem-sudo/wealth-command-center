// src/components/EscapeVelocity.tsx
"use client";

import { useState, useMemo, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Rocket, TrendingUp } from 'lucide-react';

interface PortfolioData {
  totalAssets: number;
  totalLiabilities: number;
  weightedGrowthRate: number; // weighted average annual growth across portfolio
  weightedYieldRate: number;  // weighted average annual yield across portfolio
  annualYieldIncome: number;
}

// ─── Box-Muller: Generate normally distributed random number ───
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

// ─── Run a single Monte Carlo simulation ───
function runSimulation(
  startingNetWorth: number,
  annualGrowth: number,
  annualYield: number,
  volatility: number,
  years: number,
  monthlyExpenses: number
): { year: number; netWorth: number; passiveIncome: number }[] {
  const results: { year: number; netWorth: number; passiveIncome: number }[] = [];
  let netWorth = startingNetWorth;
  const currentYear = new Date().getFullYear();

  for (let y = 0; y <= years; y++) {
    const passiveIncome = netWorth * (annualYield / 100);
    results.push({
      year: currentYear + y,
      netWorth: Math.round(netWorth),
      passiveIncome: Math.round(passiveIncome),
    });

    // Simulate one year of growth with randomness
    const actualGrowth = normalRandom(annualGrowth, volatility);
    netWorth = netWorth * (1 + actualGrowth / 100);
    // Add yield income, subtract expenses
    netWorth += passiveIncome - (monthlyExpenses * 12);
    if (netWorth < 0) netWorth = 0;
  }

  return results;
}

// ─── Run N simulations and compute percentiles ───
function runMonteCarlo(
  startingNetWorth: number,
  annualGrowth: number,
  annualYield: number,
  volatility: number,
  years: number,
  monthlyExpenses: number,
  numSimulations: number
) {
  const allSims: { year: number; netWorth: number; passiveIncome: number }[][] = [];

  for (let i = 0; i < numSimulations; i++) {
    allSims.push(runSimulation(startingNetWorth, annualGrowth, annualYield, volatility, years, monthlyExpenses));
  }

  const currentYear = new Date().getFullYear();
  const chartData: {
    year: number;
    p10: number; p25: number; p50: number; p75: number; p90: number;
    p10Income: number; p50Income: number; p90Income: number;
    expenses: number;
  }[] = [];

  let escapeYearP50: number | null = null;

  for (let y = 0; y <= years; y++) {
    const netWorths = allSims.map(s => s[y].netWorth).sort((a, b) => a - b);
    const incomes = allSims.map(s => s[y].passiveIncome).sort((a, b) => a - b);

    const pctile = (arr: number[], p: number) => arr[Math.floor(arr.length * p / 100)];

    const p50Income = pctile(incomes, 50);
    const annualExpenses = monthlyExpenses * 12;

    if (escapeYearP50 === null && p50Income >= annualExpenses && annualExpenses > 0) {
      escapeYearP50 = currentYear + y;
    }

    chartData.push({
      year: currentYear + y,
      p10: pctile(netWorths, 10),
      p25: pctile(netWorths, 25),
      p50: pctile(netWorths, 50),
      p75: pctile(netWorths, 75),
      p90: pctile(netWorths, 90),
      p10Income: pctile(incomes, 10),
      p50Income: p50Income,
      p90Income: pctile(incomes, 90),
      expenses: annualExpenses,
    });
  }

  return { chartData, escapeYearP50 };
}

export default function EscapeVelocity({ portfolio }: { portfolio: PortfolioData }) {
  const [monthlyExpenses, setMonthlyExpenses] = useState(5000);
  const [volatility, setVolatility] = useState(12);
  const [projectionYears] = useState(25);
  const [showIncome, setShowIncome] = useState(false);

  const startingNetWorth = portfolio.totalAssets - portfolio.totalLiabilities;
  const annualGrowth = portfolio.weightedGrowthRate || 7;
  const annualYield = portfolio.weightedYieldRate || 4;

  const { chartData, escapeYearP50 } = useMemo(() => {
    return runMonteCarlo(
      startingNetWorth,
      annualGrowth,
      annualYield,
      volatility,
      projectionYears,
      monthlyExpenses,
      1000
    );
  }, [startingNetWorth, annualGrowth, annualYield, volatility, projectionYears, monthlyExpenses]);

  const formatCurrency = useCallback((value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
    return `$${value}`;
  }, []);

  const currentYear = new Date().getFullYear();
  const yearsToEscape = escapeYearP50 ? escapeYearP50 - currentYear : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950/30">
        <div className="flex items-center gap-3 mb-1">
          <Rocket className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-slate-100">Escape Velocity Forecaster</h2>
        </div>
        <p className="text-slate-400 text-sm ml-9">
          When your passive income exceeds your lifestyle expenses — powered by 1,000 Monte Carlo simulations
        </p>
      </div>

      <div className="p-6">
        {/* ─── CONTROLS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider">Monthly Lifestyle Cost</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1000}
                max={50000}
                step={500}
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-indigo-400 font-bold text-lg min-w-[80px] text-right">
                ${monthlyExpenses.toLocaleString()}
              </span>
            </div>
            <p className="text-slate-600 text-xs mt-1">${(monthlyExpenses * 12).toLocaleString()}/year</p>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider">Market Volatility</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={volatility}
                onChange={(e) => setVolatility(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="text-amber-400 font-bold text-lg min-w-[50px] text-right">
                {volatility}%
              </span>
            </div>
            <p className="text-slate-600 text-xs mt-1">{volatility <= 10 ? 'Conservative' : volatility <= 18 ? 'Moderate' : 'Aggressive'}</p>
          </div>

          <div className="flex flex-col justify-center">
            <button
              onClick={() => setShowIncome(!showIncome)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showIncome
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {showIncome ? 'Showing: Passive Income' : 'Showing: Net Worth'}
            </button>
          </div>
        </div>

        {/* ─── ESCAPE STATUS ─── */}
        <div className={`p-4 rounded-xl mb-6 border ${
          escapeYearP50
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-amber-500/5 border-amber-500/20'
        }`}>
          {escapeYearP50 ? (
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Rocket className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-400 font-bold text-lg">
                  Escape Velocity: {escapeYearP50}
                </p>
                <p className="text-slate-400 text-sm">
                  In the median scenario, your passive income exceeds ${monthlyExpenses.toLocaleString()}/mo
                  in <span className="text-emerald-400 font-bold">{yearsToEscape} years</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-400 font-bold text-lg">
                  Escape velocity not reached in {projectionYears} years
                </p>
                <p className="text-slate-400 text-sm">
                  Try lowering lifestyle costs or increasing yield-generating assets
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── CHART ─── */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {showIncome ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomeP90" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incomeP50" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                  labelFormatter={(year) => `Year ${year}`}
                />
                <Area type="monotone" dataKey="p90Income" stroke="transparent" fill="url(#incomeP90)" name="P90 Income" />
                <Area type="monotone" dataKey="p50Income" stroke="#10b981" strokeWidth={3} fill="url(#incomeP50)" name="Median Income" />
                <Area type="monotone" dataKey="p10Income" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" fill="transparent" name="P10 Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" fill="transparent" name="Annual Expenses" />
                {escapeYearP50 && (
                  <ReferenceLine x={escapeYearP50} stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'ESCAPE', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                )}
              </AreaChart>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="nwP90" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="nwP50" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                  labelFormatter={(year) => `Year ${year}`}
                />
                <Area type="monotone" dataKey="p90" stroke="transparent" fill="url(#nwP90)" name="P90 (Optimistic)" />
                <Area type="monotone" dataKey="p75" stroke="#6366f1" strokeWidth={1} fill="transparent" strokeDasharray="2 2" name="P75" />
                <Area type="monotone" dataKey="p50" stroke="#6366f1" strokeWidth={3} fill="url(#nwP50)" name="P50 (Median)" />
                <Area type="monotone" dataKey="p25" stroke="#6366f1" strokeWidth={1} fill="transparent" strokeDasharray="2 2" name="P25" />
                <Area type="monotone" dataKey="p10" stroke="#6366f1" strokeWidth={1} fill="transparent" strokeDasharray="4 4" name="P10 (Pessimistic)" />
                {escapeYearP50 && (
                  <ReferenceLine x={escapeYearP50} stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'ESCAPE', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* ─── LEGEND ─── */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-slate-400">
          {showIncome ? (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Median Passive Income</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500/40 inline-block border-t border-dashed border-emerald-500" /> P10 (Pessimistic)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block border-t border-dashed border-red-500" /> Your Annual Expenses</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" /> Median Net Worth</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-300/40 inline-block" /> P10-P90 Range</span>
              {escapeYearP50 && (
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block border-t border-dashed" /> Escape Velocity</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
