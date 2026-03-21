// src/components/MetricCards.tsx
"use client";

import { Wallet, TrendingUp, Landmark, DollarSign, AlertTriangle, TrendingDown } from 'lucide-react';
import { useCurrency } from './CurrencyProvider';
import CurrencyToggle from './CurrencyToggle';

interface MetricCardsProps {
  totalAssets: number;
  totalLiabilities: number;
  totalNetWorth: number;
  btcPrice: number;
  fixedAssetsTotal: number;
  annualYieldIncome: number;
  monthlyIncomeTotal: number;
  annualInterestCost: number;
  depreciatingTotal: number;
}

export default function MetricCards({
  totalAssets,
  totalLiabilities,
  totalNetWorth,
  btcPrice,
  fixedAssetsTotal,
  annualYieldIncome,
  monthlyIncomeTotal,
  annualInterestCost,
  depreciatingTotal,
}: MetricCardsProps) {
  const { format } = useCurrency();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8">

        {/* Card 1: Net Worth */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">True Net Worth</h3>
            <Wallet className="text-indigo-500 w-5 h-5" />
          </div>
          <p className={`text-2xl md:text-4xl font-bold ${totalNetWorth >= 0 ? '' : 'text-red-400'}`}>
            {format(totalNetWorth)}
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Assets {format(totalAssets)}
            {totalLiabilities > 0 && <> − Liabilities {format(totalLiabilities)}</>}
          </p>
        </div>

        {/* Card 2: BTC Price */}
        <div className="bg-slate-900 border-2 border-emerald-500/50 p-6 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">LIVE</div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Bitcoin (BTC)</h3>
            <TrendingUp className="text-emerald-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white">{format(btcPrice)}</p>
          <p className="text-slate-400 text-sm mt-2">From Supabase</p>
        </div>

        {/* Card 3: Annual Passive Income */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Annual Passive Income</h3>
            <DollarSign className="text-emerald-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold text-emerald-400">{format(annualYieldIncome)}</p>
          <p className="text-slate-400 text-sm mt-2">
            {monthlyIncomeTotal > 0
              ? `Includes ${format(monthlyIncomeTotal)}/mo from startups/rent`
              : annualInterestCost > 0
                ? `Net of ${format(annualInterestCost)}/yr interest cost`
                : 'Dividends, rent, startup income'}
          </p>
        </div>

        {/* Card 4: Fixed Assets */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Fixed Assets</h3>
            <Landmark className="text-amber-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold">{format(fixedAssetsTotal)}</p>
          <p className="text-slate-400 text-sm mt-2">Real Estate, Bonds, Cash & More</p>
        </div>

        {/* Card 5: Liabilities */}
        {totalLiabilities > 0 && (
          <div className="bg-slate-900 border border-red-900/30 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Total Liabilities</h3>
              <AlertTriangle className="text-red-500 w-5 h-5" />
            </div>
            <p className="text-2xl md:text-4xl font-bold text-red-400">{format(totalLiabilities)}</p>
            <p className="text-slate-400 text-sm mt-2">
              {annualInterestCost > 0 ? `${format(annualInterestCost)}/yr in interest` : 'Loans & credit'}
            </p>
          </div>
        )}

        {/* Card 6: Depreciating Assets or Currency Toggle */}
        {depreciatingTotal > 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Depreciating Assets</h3>
              <TrendingDown className="text-orange-500 w-5 h-5" />
            </div>
            <p className="text-2xl md:text-4xl font-bold text-orange-400">
              {format(depreciatingTotal)}
            </p>
            <p className="text-slate-400 text-sm mt-2">Vehicles, equipment</p>
          </div>
        ) : (
          <CurrencyToggle />
        )}

      </div>

      {/* Currency toggle below cards if depreciating slot is taken */}
      {depreciatingTotal > 0 && (
        <div className="mb-8 max-w-xs">
          <CurrencyToggle />
        </div>
      )}
    </>
  );
}
