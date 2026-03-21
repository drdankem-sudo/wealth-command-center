// src/components/markets/CompanyProfile.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Building2, Search, TrendingUp, TrendingDown, DollarSign, BarChart3, Globe } from 'lucide-react';

interface ProfileData {
  name: string;
  ticker: string;
  logo: string;
  finnhubIndustry: string;
  country: string;
  marketCapitalization: number;
  weburl: string;
  metrics: {
    '52WeekHigh': number;
    '52WeekLow': number;
    peNormalizedAnnual: number;
    dividendYieldIndicatedAnnual: number;
    epsNormalizedAnnual: number;
    revenuePerShareTTM: number;
    currentRatioQuarterly: number;
    netMarginTTM: number;
    [key: string]: any;
  };
}

function MetricBox({ label, value, color = 'text-slate-100' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function CompanyProfile({ userTickers }: { userTickers: string[] }) {
  const [searchTicker, setSearchTicker] = useState('');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setLoading(true);
    setError('');
    setProfile(null);

    try {
      const res = await fetch(`/api/markets?type=profile&symbol=${encodeURIComponent(symbol.toUpperCase())}`);
      const data = await res.json();

      if (!data.name) {
        setError(`No data found for ${symbol.toUpperCase()}`);
      } else {
        setProfile(data);
      }
    } catch {
      setError('Failed to fetch profile');
    }
    setLoading(false);
  }, []);

  // Load first user ticker by default
  useEffect(() => {
    if (userTickers.length > 0) {
      fetchProfile(userTickers[0]);
    }
  }, [userTickers, fetchProfile]);

  const formatMarketCap = (cap: number) => {
    if (!cap) return '-';
    if (cap >= 1000) return `$${(cap / 1000).toFixed(1)}T`;
    if (cap >= 1) return `$${cap.toFixed(1)}B`;
    return `$${(cap * 1000).toFixed(0)}M`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-indigo-400" />
          <h3 className="text-slate-100 font-bold">Company Profile</h3>
        </div>

        {/* Search + Quick-pick from portfolio */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && fetchProfile(searchTicker)}
              placeholder="Ticker (e.g. AAPL)"
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 uppercase"
            />
          </div>
          <button
            onClick={() => fetchProfile(searchTicker)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Look Up
          </button>
        </div>

        {/* Quick-pick buttons for user's tickers */}
        {userTickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {userTickers.map(ticker => (
              <button
                key={ticker}
                onClick={() => { setSearchTicker(ticker); fetchProfile(ticker); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  profile?.ticker === ticker
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {ticker}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile content */}
      <div className="p-4">
        {loading && (
          <div className="py-12 text-center text-slate-500">Loading profile...</div>
        )}

        {error && (
          <div className="py-12 text-center text-red-400 text-sm">{error}</div>
        )}

        {profile && !loading && (
          <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              {profile.logo && (
                <img
                  src={profile.logo}
                  alt={profile.name}
                  className="w-12 h-12 rounded-lg bg-white p-1"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1">
                <h4 className="text-slate-100 font-bold text-lg">{profile.name}</h4>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span className="text-indigo-400 font-bold">{profile.ticker}</span>
                  <span>{profile.finnhubIndustry}</span>
                  <span>{profile.country}</span>
                </div>
              </div>
              {profile.weburl && (
                <a
                  href={profile.weburl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </a>
              )}
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricBox
                label="Market Cap"
                value={formatMarketCap(profile.marketCapitalization)}
                color="text-indigo-400"
              />
              <MetricBox
                label="P/E Ratio"
                value={profile.metrics.peNormalizedAnnual ? profile.metrics.peNormalizedAnnual.toFixed(1) : '-'}
              />
              <MetricBox
                label="52-Week High"
                value={profile.metrics['52WeekHigh'] ? `$${profile.metrics['52WeekHigh'].toFixed(2)}` : '-'}
                color="text-emerald-400"
              />
              <MetricBox
                label="52-Week Low"
                value={profile.metrics['52WeekLow'] ? `$${profile.metrics['52WeekLow'].toFixed(2)}` : '-'}
                color="text-red-400"
              />
              <MetricBox
                label="Dividend Yield"
                value={profile.metrics.dividendYieldIndicatedAnnual ? `${profile.metrics.dividendYieldIndicatedAnnual.toFixed(2)}%` : '-'}
                color="text-amber-400"
              />
              <MetricBox
                label="EPS"
                value={profile.metrics.epsNormalizedAnnual ? `$${profile.metrics.epsNormalizedAnnual.toFixed(2)}` : '-'}
              />
              <MetricBox
                label="Net Margin"
                value={profile.metrics.netMarginTTM ? `${profile.metrics.netMarginTTM.toFixed(1)}%` : '-'}
              />
              <MetricBox
                label="Revenue/Share"
                value={profile.metrics.revenuePerShareTTM ? `$${profile.metrics.revenuePerShareTTM.toFixed(2)}` : '-'}
              />
            </div>
          </div>
        )}

        {!profile && !loading && !error && (
          <div className="py-12 text-center text-slate-500 text-sm">
            Search for a ticker or select from your portfolio above
          </div>
        )}
      </div>
    </div>
  );
}
