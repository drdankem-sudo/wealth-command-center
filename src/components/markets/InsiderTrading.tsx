// src/components/markets/InsiderTrading.tsx
"use client";

import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";

interface InsiderTransaction {
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number;
  symbol: string;
}

type FilterTab = "all" | "buys" | "sells";

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatShares(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)}K`;
  return abs.toLocaleString();
}

function classifyTransaction(code: string): "Buy" | "Sell" | "Option Exercise" {
  // Finnhub transaction codes: P = Purchase, S = Sale, M = Option Exercise, etc.
  if (code === "P") return "Buy";
  if (code === "S" || code === "F") return "Sell";
  if (code === "M" || code === "C" || code === "A") return "Option Exercise";
  // Default based on change sign would be handled by caller if needed
  return "Sell";
}

function txColor(type: "Buy" | "Sell" | "Option Exercise") {
  if (type === "Buy") return "text-emerald-400 bg-emerald-500/10";
  if (type === "Sell") return "text-red-400 bg-red-500/10";
  return "text-amber-400 bg-amber-500/10";
}

export default function InsiderTrading({
  userTickers,
}: {
  userTickers: string[];
}) {
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    if (userTickers.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(
      userTickers.map((ticker) =>
        fetch(`/api/markets?type=insider&symbol=${ticker}`)
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) {
              return data.map((tx: any) => ({ ...tx, symbol: ticker }));
            }
            return [];
          })
          .catch(() => [])
      )
    )
      .then((results) => {
        const all = results
          .flat()
          .filter(
            (tx: InsiderTransaction) => tx.name && tx.transactionCode
          )
          .sort(
            (a: InsiderTransaction, b: InsiderTransaction) =>
              new Date(b.filingDate).getTime() -
              new Date(a.filingDate).getTime()
          );
        setTransactions(all);
      })
      .finally(() => setLoading(false));
  }, [userTickers]);

  const filtered = transactions.filter((tx) => {
    const type = classifyTransaction(tx.transactionCode);
    if (filter === "buys") return type === "Buy";
    if (filter === "sells") return type === "Sell";
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "buys", label: "Buys Only" },
    { key: "sells", label: "Sells Only" },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-slate-100 font-bold">Insider Trading</h3>
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === t.key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-800 rounded w-3/4" />
                <div className="h-2 bg-slate-800 rounded w-1/2" />
              </div>
              <div className="h-4 bg-slate-800 rounded w-16" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {transactions.length === 0
              ? "No insider transactions found for your holdings"
              : "No transactions match the current filter"}
          </div>
        ) : (
          filtered.map((tx, i) => {
            const type = classifyTransaction(tx.transactionCode);
            const value = Math.abs(tx.change) * (tx.transactionPrice || 0);
            const isLarge = value >= 1_000_000;

            return (
              <div
                key={`${tx.symbol}-${tx.filingDate}-${tx.name}-${i}`}
                className="p-4 flex items-start gap-3 hover:bg-slate-800/50 transition-colors"
              >
                {/* Avatar placeholder */}
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-xs font-bold text-slate-400">
                  {tx.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-100 text-sm font-medium truncate">
                      {tx.name}
                    </span>
                    <span className="text-xs text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-medium">
                      {tx.symbol}
                    </span>
                    {isLarge && (
                      <span className="text-xs text-yellow-300 bg-yellow-500/15 px-1.5 py-0.5 rounded font-semibold">
                        LARGE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${txColor(type)}`}>
                      {type}
                    </span>
                    <span>{formatShares(tx.change)} shares</span>
                    {tx.transactionPrice > 0 && (
                      <span className="text-slate-400">
                        @ ${tx.transactionPrice.toFixed(2)}
                      </span>
                    )}
                    {value > 0 && (
                      <span className="text-slate-300 font-medium">
                        {formatValue(value)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-slate-600">
                    Filed {tx.filingDate}
                    {tx.transactionDate && tx.transactionDate !== tx.filingDate && (
                      <span> &middot; Traded {tx.transactionDate}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
