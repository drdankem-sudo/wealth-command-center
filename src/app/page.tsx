// src/app/page.tsx
import MfaEnroll from '@/components/MfaEnroll';
import { Wallet, TrendingUp, Landmark, DollarSign, Settings, AlertTriangle, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from '../components/DashboardCharts';
import AddAssetForm from '../components/AddAssetForm';
import AddLiabilityForm from '../components/AddLiabilityForm';
import AssetLedger from '../components/AssetLedger';
import LiabilityLedger from '../components/LiabilityLedger';
import EscapeVelocity from '../components/EscapeVelocity';
import LiveTicker from '../components/LiveTicker';
import CurrencyToggle from '../components/CurrencyToggle';
import LogoutButton from '../components/LogoutButton';
import { createClient } from '@/utils/supabase-server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const revalidate = 30;

export default async function Dashboard() {
  const supabase = await createClient();

  // BTC price from global live_prices table (needs service client to bypass RLS)
  const serviceSupabase = createServiceClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const { data: btcData } = await serviceSupabase
    .from('live_prices')
    .select('current_price')
    .eq('ticker_symbol', 'BTC')
    .single();

  // All user assets with full financial fields
  const { data: assetsData } = await supabase
    .from('assets')
    .select('id, name, asset_class, ticker_symbol, shares, target_allocation, balance, annual_growth_rate, annual_yield, pending_yield_cash, monthly_income');

  // All user liabilities
  const { data: liabilitiesData } = await supabase
    .from('liabilities')
    .select('id, name, liability_type, balance, interest_rate, monthly_payment');

  // Historical net worth
  const { data: rawHistoryData } = await supabase
    .from('net_worth_history')
    .select('recorded_date, net_worth')
    .order('recorded_date', { ascending: true });

  const historyData = rawHistoryData?.map(snapshot => {
    const dateObj = new Date(snapshot.recorded_date);
    return {
      recorded_date: dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      net_worth: snapshot.net_worth
    };
  }) || [];

  // Fetch KES rate server-side for the currency toggle card
  let kesRate: number | null = null;
  try {
    const fxRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { next: { revalidate: 3600 } });
    const fxData = await fxRes.json();
    kesRate = fxData?.rates?.KES || null;
  } catch {}

  // ─── Computed Metrics ───
  const btcPrice = btcData ? btcData.current_price : 0;
  const formattedBtcPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(btcPrice);

  const totalAssets = assetsData?.reduce((sum, a) => sum + Number(a.balance || 0), 0) || 0;
  const totalLiabilities = liabilitiesData?.reduce((sum, l) => sum + Number(l.balance || 0), 0) || 0;
  const totalNetWorth = totalAssets - totalLiabilities;
  const formattedNetWorth = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalNetWorth);

  const illiquidClasses = ['Real estate', 'Farm/ranch', 'VC fund', 'Startup Equity', 'Gold', 'Commodities', 'Bonds/Tbills', 'Sacco/MMF', 'Cash'];
  const fixedAssetsTotal = assetsData
    ?.filter(a => illiquidClasses.includes(a.asset_class))
    .reduce((sum, a) => sum + Number(a.balance || 0), 0) || 0;
  const formattedFixed = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(fixedAssetsTotal);

  // Annual yield income = yield-based + monthly income × 12
  const yieldBasedIncome = assetsData
    ?.reduce((sum, a) => sum + (Number(a.balance || 0) * Number(a.annual_yield || 0) / 100), 0) || 0;
  const monthlyIncomeTotal = assetsData
    ?.reduce((sum, a) => sum + Number(a.monthly_income || 0), 0) || 0;
  const annualYieldIncome = yieldBasedIncome + (monthlyIncomeTotal * 12);
  const formattedYield = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(annualYieldIncome);

  const formattedLiabilities = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalLiabilities);

  const annualInterestCost = liabilitiesData
    ?.reduce((sum, l) => sum + (Number(l.balance || 0) * Number(l.interest_rate || 0) / 100), 0) || 0;

  // Depreciating assets total
  const depreciatingTotal = assetsData
    ?.filter(a => Number(a.annual_growth_rate || 0) < 0)
    .reduce((sum, a) => sum + Number(a.balance || 0), 0) || 0;

  // Portfolio weighted averages for Monte Carlo
  const weightedGrowthRate = totalAssets > 0
    ? (assetsData?.reduce((sum, a) => sum + (Number(a.balance || 0) * Number(a.annual_growth_rate || 0)), 0) || 0) / totalAssets
    : 7;
  const weightedYieldRate = totalAssets > 0
    ? (assetsData?.reduce((sum, a) => sum + (Number(a.balance || 0) * Number(a.annual_yield || 0)), 0) || 0) / totalAssets
    : 4;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">

      {/* ─── LIVE TICKER BAR ─── */}
      <LiveTicker />

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Wealth Command Center</h1>
          <p className="text-slate-400 mt-1 text-sm">Real-time asset tracking and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            title="Vault Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8">

        {/* Card 1: Net Worth (assets minus liabilities) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">True Net Worth</h3>
            <Wallet className="text-indigo-500 w-5 h-5" />
          </div>
          <p className={`text-2xl md:text-4xl font-bold ${totalNetWorth >= 0 ? '' : 'text-red-400'}`}>{formattedNetWorth}</p>
          <p className="text-slate-500 text-xs mt-2">
            Assets ${totalAssets.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            {totalLiabilities > 0 && <> − Liabilities ${totalLiabilities.toLocaleString('en-US', { maximumFractionDigits: 0 })}</>}
          </p>
        </div>

        {/* Card 2: BTC Price */}
        <div className="bg-slate-900 border-2 border-emerald-500/50 p-6 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">LIVE</div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Bitcoin (BTC)</h3>
            <TrendingUp className="text-emerald-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white">{formattedBtcPrice}</p>
          <p className="text-slate-400 text-sm mt-2">From Supabase</p>
        </div>

        {/* Card 3: Annual Passive Income */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Annual Passive Income</h3>
            <DollarSign className="text-emerald-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold text-emerald-400">{formattedYield}</p>
          <p className="text-slate-400 text-sm mt-2">
            {monthlyIncomeTotal > 0
              ? `Includes $${monthlyIncomeTotal.toLocaleString()}/mo from startups/rent`
              : annualInterestCost > 0
                ? `Net of $${annualInterestCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} interest cost`
                : 'Dividends, rent, startup income'}
          </p>
        </div>

        {/* Card 4: Fixed Assets */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Fixed Assets</h3>
            <Landmark className="text-amber-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold">{formattedFixed}</p>
          <p className="text-slate-400 text-sm mt-2">Real Estate, Bonds, Cash & More</p>
        </div>

        {/* Card 5: Liabilities */}
        {totalLiabilities > 0 && (
          <div className="bg-slate-900 border border-red-900/30 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Total Liabilities</h3>
              <AlertTriangle className="text-red-500 w-5 h-5" />
            </div>
            <p className="text-2xl md:text-4xl font-bold text-red-400">{formattedLiabilities}</p>
            <p className="text-slate-400 text-sm mt-2">
              {annualInterestCost > 0 ? `$${annualInterestCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr in interest` : 'Loans & credit'}
            </p>
          </div>
        )}

        {/* Card 6: Depreciating Assets (or Currency if no depreciation) */}
        {depreciatingTotal > 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Depreciating Assets</h3>
              <TrendingDown className="text-orange-500 w-5 h-5" />
            </div>
            <p className="text-2xl md:text-4xl font-bold text-orange-400">
              ${depreciatingTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-slate-400 text-sm mt-2">Vehicles, equipment</p>
          </div>
        ) : (
          <CurrencyToggle kesRate={kesRate} />
        )}

      </div>

      {/* ─── Currency toggle if depreciating exists (shows below cards) ─── */}
      {depreciatingTotal > 0 && (
        <div className="mb-8 max-w-xs">
          <CurrencyToggle kesRate={kesRate} />
        </div>
      )}

      {/* ─── CHARTS & ADD FORMS ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        <div className="xl:col-span-3">
          <DashboardCharts
            assetsData={assetsData || []}
            historyData={historyData}
          />
        </div>
        <div className="xl:col-span-1 space-y-6">
          <AddAssetForm />
          <AddLiabilityForm />
        </div>
      </div>

      {/* ─── ESCAPE VELOCITY FORECASTER ─── */}
      <div className="mb-8">
        <EscapeVelocity portfolio={{
          totalAssets,
          totalLiabilities,
          weightedGrowthRate,
          weightedYieldRate,
          annualYieldIncome,
        }} />
      </div>

      {/* ─── ASSET LEDGER ─── */}
      <AssetLedger assets={assetsData || []} />

      {/* ─── LIABILITY LEDGER ─── */}
      <LiabilityLedger liabilities={liabilitiesData || []} />

      <div className="mt-12 border-t border-slate-800 pt-8">
        <h2 className="text-xl font-bold text-slate-100 mb-6">Vault Security</h2>
        <div className="max-w-md">
          <MfaEnroll />
        </div>
      </div>
    </div>
  );
}
