// src/components/LiveTicker.tsx
"use client";

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TickerItem {
  symbol: string;
  label: string;
  price: number | null;
  change?: number | null;
  prefix?: string;
}

// Fetch all ticker data client-side (avoids blocking server render)
async function fetchTickerData(): Promise<TickerItem[]> {
  const items: TickerItem[] = [];

  // 1. S&P 500 (SPY), Treasury (^TNX) + popular ETFs via Finnhub proxy
  // We fetch through our own API to avoid exposing keys
  try {
    const symbols = ['SPY', 'QQQ', 'VTI'];
    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const res = await fetch(`/api/ticker?symbol=${sym}`);
        if (!res.ok) return null;
        return res.json();
      })
    );

    const labels: Record<string, string> = { SPY: 'S&P 500', QQQ: 'NASDAQ 100', VTI: 'Total Market' };
    symbols.forEach((sym, i) => {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        items.push({
          symbol: sym,
          label: labels[sym] || sym,
          price: result.value.price,
          change: result.value.change,
          prefix: '$',
        });
      }
    });
  } catch {}

  // 2. BTC + ETH via CoinGecko (free, no key)
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
    const data = await res.json();
    if (data.bitcoin) {
      items.push({ symbol: 'BTC', label: 'Bitcoin', price: data.bitcoin.usd, change: data.bitcoin.usd_24h_change, prefix: '$' });
    }
    if (data.ethereum) {
      items.push({ symbol: 'ETH', label: 'Ethereum', price: data.ethereum.usd, change: data.ethereum.usd_24h_change, prefix: '$' });
    }
  } catch {}

  // 3. KES/USD via ExchangeRate-API (free, no key)
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    if (data?.rates?.KES) {
      items.push({ symbol: 'KES/USD', label: 'KES/USD', price: data.rates.KES, prefix: 'KES ' });
    }
  } catch {}

  // 4. Gold via our ticker API
  try {
    const res = await fetch('/api/ticker?symbol=GOLD');
    if (res.ok) {
      const data = await res.json();
      if (data.price) {
        items.push({ symbol: 'XAU', label: 'Gold', price: data.price, prefix: '$' });
      }
    }
  } catch {}

  return items;
}

export default function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickerData().then((data) => {
      setItems(data);
      setLoading(false);
    });

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchTickerData().then(setItems);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border-b border-slate-800 py-2 px-4 mb-6 rounded-lg overflow-hidden">
        <div className="flex items-center gap-6 animate-pulse">
          <span className="text-slate-600 text-sm">Loading market data...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const formatPrice = (price: number, prefix: string = '$') => {
    if (prefix === 'KES ') return `KES ${price.toFixed(2)}`;
    if (price >= 10000) return `${prefix}${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 100) return `${prefix}${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    return `${prefix}${price.toFixed(2)}`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 py-2 px-4 mb-6 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mr-2 shrink-0">LIVE</span>

        {items.map((item, i) => (
          <div key={item.symbol} className="flex items-center gap-1 shrink-0">
            {i > 0 && <span className="text-slate-700 mx-2">|</span>}
            <span className="text-slate-400 text-xs font-medium">{item.label}</span>
            <span className="text-slate-100 text-sm font-bold">
              {item.price !== null ? formatPrice(item.price, item.prefix) : '—'}
            </span>
            {item.change !== null && item.change !== undefined && (
              <span className={`flex items-center text-xs font-medium ${item.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {item.change >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(item.change).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
