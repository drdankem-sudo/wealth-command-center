// src/app/markets/page.tsx
import { ArrowLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase-server';
import { redirect } from 'next/navigation';
import NewsFeed from '@/components/markets/NewsFeed';
import FearGreedGauge from '@/components/markets/FearGreedGauge';
import EarningsCalendar from '@/components/markets/EarningsCalendar';
import CompanyProfile from '@/components/markets/CompanyProfile';
import LiveTicker from '@/components/LiveTicker';

export const revalidate = 60;

export default async function MarketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get user's stock tickers for personalized data
  const { data: userAssets } = await supabase
    .from('assets')
    .select('ticker_symbol, asset_class')
    .in('asset_class', ['Securities', 'NSE Equities'])
    .not('ticker_symbol', 'is', null);

  const userTickers = userAssets?.map(a => a.ticker_symbol!).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">

      {/* ─── LIVE TICKER BAR ─── */}
      <LiveTicker />

      {/* ─── HEADER ─── */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              <h1 className="text-xl md:text-3xl font-bold tracking-tight">Market Intelligence</h1>
            </div>
            <p className="text-slate-400 mt-1 text-sm">News, sentiment, earnings & company analysis</p>
          </div>
        </div>
        <Link
          href="/"
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Back to Vault
        </Link>
      </header>

      {/* ─── FEAR & GREED GAUGES ─── */}
      <div className="mb-8">
        <FearGreedGauge />
      </div>

      {/* ─── MAIN GRID: News + Company Profile ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <NewsFeed userTickers={userTickers} />
        <CompanyProfile userTickers={userTickers} />
      </div>

      {/* ─── EARNINGS CALENDAR ─── */}
      <div className="mb-8">
        <EarningsCalendar userTickers={userTickers} />
      </div>
    </div>
  );
}
