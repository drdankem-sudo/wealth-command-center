// src/components/markets/MacroDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Activity,
  Flame,
} from "lucide-react";

interface Indicator {
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  icon: React.ReactNode;
  section: "indices" | "rates" | "commodities";
}

const INDICATORS = [
  // Indices
  { name: "S&P 500", symbol: "^GSPC", section: "indices" as const, icon: <BarChart3 className="w-4 h-4 text-blue-400" /> },
  { name: "Nasdaq", symbol: "^IXIC", section: "indices" as const, icon: <BarChart3 className="w-4 h-4 text-purple-400" /> },
  { name: "Dow Jones", symbol: "^DJI", section: "indices" as const, icon: <BarChart3 className="w-4 h-4 text-cyan-400" /> },
  // Rates & Volatility
  { name: "10Y Treasury", symbol: "^TNX", section: "rates" as const, icon: <DollarSign className="w-4 h-4 text-amber-400" /> },
  { name: "VIX", symbol: "^VIX", section: "rates" as const, icon: <Activity className="w-4 h-4 text-red-400" /> },
  { name: "Dollar Index", symbol: "DX-Y.NYB", section: "rates" as const, icon: <DollarSign className="w-4 h-4 text-green-400" /> },
  // Commodities
  { name: "Crude Oil", symbol: "CL=F", section: "commodities" as const, icon: <Flame className="w-4 h-4 text-orange-400" /> },
];

const SECTION_LABELS: Record<string, string> = {
  indices: "Indices",
  rates: "Rates & Volatility",
  commodities: "Commodities",
};

export default function MacroDashboard() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      INDICATORS.map((ind) =>
        fetch(`/api/ticker?symbol=${encodeURIComponent(ind.symbol)}`)
          .then((r) => r.json())
          .then((data) => ({
            ...ind,
            price: data?.price ?? null,
            change: data?.change ?? null,
          }))
          .catch(() => ({
            ...ind,
            price: null,
            change: null,
          }))
      )
    ).then((results) => {
      setIndicators(results);
      setLoading(false);
    });
  }, []);

  const formatPrice = (price: number | null, symbol: string) => {
    if (price === null) return "—";
    // Treasury yield and VIX are typically small numbers shown with 2 decimals
    if (symbol === "^TNX" || symbol === "^VIX") return price.toFixed(2);
    // Dollar index
    if (symbol === "DX-Y.NYB") return price.toFixed(2);
    // Large indices — no decimals, with commas
    if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return price.toFixed(2);
  };

  const sections = ["indices", "rates", "commodities"] as const;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <Globe className="w-5 h-5 text-blue-400" />
        <h3 className="text-slate-100 font-bold">Macro Dashboard</h3>
      </div>

      <div className="p-4 space-y-5">
        {loading ? (
          /* Skeleton loading state */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-800/50 rounded-lg p-4 animate-pulse"
              >
                <div className="h-3 w-16 bg-slate-700 rounded mb-3" />
                <div className="h-5 w-20 bg-slate-700 rounded mb-2" />
                <div className="h-3 w-12 bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          sections.map((section) => {
            const items = indicators.filter((ind) => ind.section === section);
            if (items.length === 0) return null;
            return (
              <div key={section}>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {SECTION_LABELS[section]}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((ind) => {
                    const isUp = ind.change !== null && ind.change >= 0;
                    const isDown = ind.change !== null && ind.change < 0;
                    return (
                      <div
                        key={ind.symbol}
                        className="bg-slate-800/50 rounded-lg p-4 flex flex-col gap-1"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {ind.icon}
                          <span className="text-xs text-slate-400 truncate">
                            {ind.name}
                          </span>
                        </div>
                        <span className="text-lg font-semibold text-slate-100">
                          {formatPrice(ind.price, ind.symbol)}
                        </span>
                        <div className="flex items-center gap-1">
                          {ind.change !== null ? (
                            <>
                              {isUp ? (
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span
                                className={`text-xs font-medium ${
                                  isUp ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {isUp ? "+" : ""}
                                {ind.change.toFixed(2)}%
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          {ind.symbol}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
