// src/app/page.tsx
import MfaEnroll from '@/components/MfaEnroll';
import { Wallet, TrendingUp, Landmark, DollarSign } from 'lucide-react';
import DashboardCharts from '../components/DashboardCharts';
import AddAssetForm from '../components/AddAssetForm';
import AssetLedger from '../components/AssetLedger';
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
    .select('id, name, asset_class, ticker_symbol, shares, target_allocation, balance, annual_growth_rate, annual_yield, pending_yield_cash');

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

  // ─── Computed Metrics ───
  const btcPrice = btcData ? btcData.current_price : 0;
  const formattedBtcPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(btcPrice);

  const totalNetWorth = assetsData?.reduce((sum, a) => sum + Number(a.balance || 0), 0) || 0;
  const formattedNetWorth = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalNetWorth);

  const illiquidClasses = ['Real estate', 'Farm/ranch', 'VC fund', 'Gold', 'Commodities', 'Bonds/Tbills', 'Sacco/MMF', 'Cash'];
  const fixedAssetsTotal = assetsData
    ?.filter(a => illiquidClasses.includes(a.asset_class))
    .reduce((sum, a) => sum + Number(a.balance || 0), 0) || 0;
  const formattedFixed = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(fixedAssetsTotal);

  const annualYieldIncome = assetsData
    ?.reduce((sum, a) => sum + (Number(a.balance || 0) * Number(a.annual_yield || 0) / 100), 0) || 0;
  const formattedYield = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(annualYieldIncome);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Wealth Command Center</h1>
          <p className="text-slate-400 mt-1 text-sm">Real-time asset tracking and performance</p>
        </div>
        <LogoutButton />
      </header>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">

        {/* Card 1: Net Worth */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Total Net Worth</h3>
            <Wallet className="text-indigo-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold">{formattedNetWorth}</p>
          <p className="text-emerald-500 text-sm mt-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" /> Live Calculation
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

        {/* Card 3: Fixed / Illiquid Assets */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Fixed Assets</h3>
            <Landmark className="text-amber-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold">{formattedFixed}</p>
          <p className="text-slate-400 text-sm mt-2">Real Estate, Bonds, Cash & More</p>
        </div>

        {/* Card 4: Annual Yield Income */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Annual Yield Income</h3>
            <DollarSign className="text-emerald-500 w-5 h-5" />
          </div>
          <p className="text-2xl md:text-4xl font-bold text-emerald-400">{formattedYield}</p>
          <p className="text-slate-400 text-sm mt-2">Projected from yield rates</p>
        </div>

      </div>

      {/* ─── CHARTS & ADD FORM ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        <div className="xl:col-span-3">
          <DashboardCharts
            assetsData={assetsData || []}
            historyData={historyData}
          />
        </div>
        <div className="xl:col-span-1">
          <AddAssetForm />
        </div>
      </div>

      {/* ─── LEDGER ─── */}
      <AssetLedger assets={assetsData || []} />

      <div className="mt-12 border-t border-slate-800 pt-8">
        <h2 className="text-xl font-bold text-slate-100 mb-6">Vault Security</h2>
        <div className="max-w-md">
          <MfaEnroll />
        </div>
      </div>
    </div>
  );
}
