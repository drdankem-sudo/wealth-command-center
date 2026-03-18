"use client";
// src/app/page.tsx
import MfaEnroll from '@/components/MfaEnroll';
import { Wallet, TrendingUp, Landmark } from 'lucide-react';
import DashboardCharts from '../components/DashboardCharts';
import AddAssetForm from '../components/AddAssetForm';
import AssetLedger from '../components/AssetLedger';
import LogoutButton from '../components/LogoutButton';
import { createClient } from '@/utils/supabase-client';

// Tell Next.js to fetch fresh data every 30 seconds


export default async function Dashboard() {
  
  // SECURE CONNECTION: Using the new authenticated client
  const supabase = await createClient();

  // 1. Fetch live BTC Price (For the top metric card)
  const { data: btcData } = await supabase
    .from('live_prices')
    .select('current_price')
    .eq('ticker_symbol', 'BTC')
    .single();

  // 2. Fetch all your real assets AND their details (Now including the Family Office metrics!)
  const { data: assetsData } = await supabase
    .from('assets')
    .select('id, name, asset_class, ticker_symbol, shares, target_allocation, balance, annual_growth_rate, annual_yield, pending_yield_cash');

  // 3. Fetch Historical Net Worth (Ordered from oldest to newest)
  const { data: rawHistoryData } = await supabase
    .from('net_worth_history')
    .select('recorded_date, net_worth')
    .order('recorded_date', { ascending: true });

  // Format the dates so they look pretty on the chart
  const historyData = rawHistoryData?.map(snapshot => {
    const dateObj = new Date(snapshot.recorded_date);
    return {
      recorded_date: dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      net_worth: snapshot.net_worth
    };
  }) || [];

  // Format BTC Price
  const btcPrice = btcData ? btcData.current_price : 0;
  const formattedBtcPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(btcPrice);

  // Calculate True Net Worth
  const totalNetWorth = assetsData?.reduce((sum, asset) => sum + Number(asset.balance || 0), 0) || 0;
  const formattedNetWorth = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalNetWorth);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      
      {/* 🚨 THE UPGRADED HEADER WITH THE LOGOUT BUTTON 🚨 */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wealth Command Center</h1>
          <p className="text-slate-400 mt-1">Real-time asset tracking and performance</p>
        </div>
        
        <LogoutButton />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Metric Card 1: True Net Worth */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Total Net Worth</h3>
            <Wallet className="text-indigo-500 w-5 h-5" />
          </div>
          <p className="text-4xl font-bold">{formattedNetWorth}</p>
          <p className="text-emerald-500 text-sm mt-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" /> Live Calculation
          </p>
        </div>

        {/* Metric Card 2: Crypto Tracker */}
        <div className="bg-slate-900 border-2 border-emerald-500/50 p-6 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">LIVE DB CONNECTION</div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Bitcoin (BTC) Price</h3>
            <TrendingUp className="text-emerald-500 w-5 h-5" />
          </div>
          <p className="text-4xl font-bold text-white">{formattedBtcPrice}</p>
          <p className="text-slate-400 text-sm mt-2">Pulled directly from Supabase</p>
        </div>

        {/* Metric Card 3: Fixed Assets */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Fixed Assets</h3>
            <Landmark className="text-amber-500 w-5 h-5" />
          </div>
          <p className="text-4xl font-bold">$40,300.00</p>
          <p className="text-slate-400 text-sm mt-2">Real Estate & Vehicles</p>
        </div>

      </div>

      {/* Middle Section: Charts & Inputs */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        
        {/* Charts take up 3/4 of the width */}
        <div className="xl:col-span-3">
          <DashboardCharts 
            assetsData={assetsData || []} 
            historyData={historyData} 
          />
        </div>

        {/* Form takes up 1/4 of the width */}
        <div className="xl:col-span-1">
          <AddAssetForm />
        </div>

      </div>

      {/* Lower Section: The Smart Ledger */}
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
