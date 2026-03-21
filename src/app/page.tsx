// src/app/page.tsx
import MfaEnroll from '@/components/MfaEnroll';
import { Settings, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from '../components/DashboardCharts';
import AddAssetForm from '../components/AddAssetForm';
import AddLiabilityForm from '../components/AddLiabilityForm';
import AssetLedger from '../components/AssetLedger';
import LiabilityLedger from '../components/LiabilityLedger';
import EscapeVelocity from '../components/EscapeVelocity';
import LiveTicker from '../components/LiveTicker';
import MetricCards from '../components/MetricCards';
import PortfolioAnalytics from '../components/PortfolioAnalytics';
import RebalancingAlerts from '../components/RebalancingAlerts';
import CurrencyProvider from '../components/CurrencyProvider';
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

  // Fetch KES rate server-side
  let kesRate: number | null = null;
  try {
    const fxRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { next: { revalidate: 3600 } });
    const fxData = await fxRes.json();
    kesRate = fxData?.rates?.KES || null;
  } catch {}

  // ─── Computed Metrics ───
  const btcPrice = btcData ? btcData.current_price : 0;

  const totalAssets = assetsData?.reduce((sum, a) => sum + Number(a.balance || 0), 0) || 0;
  const totalLiabilities = liabilitiesData?.reduce((sum, l) => sum + Number(l.balance || 0), 0) || 0;
  const totalNetWorth = totalAssets - totalLiabilities;

  const illiquidClasses = ['Real estate', 'Farm/ranch', 'VC fund', 'Startup Equity', 'Gold', 'Commodities', 'Bonds/Tbills', 'Sacco/MMF', 'Cash'];
  const fixedAssetsTotal = assetsData
    ?.filter(a => illiquidClasses.includes(a.asset_class))
    .reduce((sum, a) => sum + Number(a.balance || 0), 0) || 0;

  const yieldBasedIncome = assetsData
    ?.reduce((sum, a) => sum + (Number(a.balance || 0) * Number(a.annual_yield || 0) / 100), 0) || 0;
  const monthlyIncomeTotal = assetsData
    ?.reduce((sum, a) => sum + Number(a.monthly_income || 0), 0) || 0;
  const annualYieldIncome = yieldBasedIncome + (monthlyIncomeTotal * 12);

  const annualInterestCost = liabilitiesData
    ?.reduce((sum, l) => sum + (Number(l.balance || 0) * Number(l.interest_rate || 0) / 100), 0) || 0;

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
    <CurrencyProvider initialKesRate={kesRate}>
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
              href="/markets"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors"
              title="Market Intelligence"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Markets</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              title="Vault Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <LogoutButton />
          </div>
        </header>

        {/* ─── METRIC CARDS (client component — currency-aware) ─── */}
        <MetricCards
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
          totalNetWorth={totalNetWorth}
          btcPrice={btcPrice}
          fixedAssetsTotal={fixedAssetsTotal}
          annualYieldIncome={annualYieldIncome}
          monthlyIncomeTotal={monthlyIncomeTotal}
          annualInterestCost={annualInterestCost}
          depreciatingTotal={depreciatingTotal}
        />

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

        {/* ─── PORTFOLIO ANALYTICS + REBALANCING ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2">
            <PortfolioAnalytics
              assets={assetsData || []}
              history={rawHistoryData || []}
              totalNetWorth={totalNetWorth}
            />
          </div>
          <div>
            <RebalancingAlerts
              assets={assetsData || []}
              totalNetWorth={totalNetWorth}
            />
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

        {/* ─── ASSET LEDGER (currency-aware) ─── */}
        <AssetLedger assets={assetsData || []} />

        {/* ─── LIABILITY LEDGER (currency-aware) ─── */}
        <LiabilityLedger liabilities={liabilitiesData || []} />

        <div className="mt-12 border-t border-slate-800 pt-8">
          <h2 className="text-xl font-bold text-slate-100 mb-6">Vault Security</h2>
          <div className="max-w-md">
            <MfaEnroll />
          </div>
        </div>
      </div>
    </CurrencyProvider>
  );
}
