// src/components/markets/FearGreedGauge.tsx
"use client";

import { useEffect, useState } from 'react';
import { Gauge, Bitcoin } from 'lucide-react';

interface FearGreedData {
  score: number;
  label: string;
  timestamp?: string;
}

function getColor(score: number): string {
  if (score <= 25) return '#ef4444'; // Extreme Fear - red
  if (score <= 45) return '#f97316'; // Fear - orange
  if (score <= 55) return '#eab308'; // Neutral - yellow
  if (score <= 75) return '#84cc16'; // Greed - lime
  return '#22c55e'; // Extreme Greed - green
}

function GaugeVisual({ score, label, title, icon }: { score: number; label: string; title: string; icon: React.ReactNode }) {
  const color = getColor(score);
  // SVG arc for the gauge
  const angle = (score / 100) * 180 - 90; // -90 to 90 degrees
  const radians = (angle * Math.PI) / 180;
  const needleX = 50 + 35 * Math.cos(radians);
  const needleY = 55 + 35 * Math.sin(radians);

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-slate-400 font-medium text-sm">{title}</h3>
      </div>

      <div className="flex flex-col items-center">
        <svg viewBox="0 0 100 65" className="w-40 h-24">
          {/* Background arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Colored arc segments */}
          <path d="M 10 55 A 40 40 0 0 1 25 22" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
          <path d="M 25 22 A 40 40 0 0 1 42 15.5" fill="none" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
          <path d="M 42 15.5 A 40 40 0 0 1 58 15.5" fill="none" stroke="#eab308" strokeWidth="8" strokeLinecap="round" />
          <path d="M 58 15.5 A 40 40 0 0 1 75 22" fill="none" stroke="#84cc16" strokeWidth="8" strokeLinecap="round" />
          <path d="M 75 22 A 40 40 0 0 1 90 55" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" />
          {/* Needle */}
          <line x1="50" y1="55" x2={needleX} y2={needleY} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="55" r="3" fill={color} />
        </svg>

        <div className="text-center mt-2">
          <p className="text-3xl font-bold" style={{ color }}>{score}</p>
          <p className="text-sm font-medium" style={{ color }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function FearGreedGauge() {
  const [market, setMarket] = useState<FearGreedData | null>(null);
  const [crypto, setCrypto] = useState<FearGreedData | null>(null);

  useEffect(() => {
    // CNN Fear & Greed (market)
    fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata')
      .then(r => r.json())
      .then(data => {
        if (data?.fear_and_greed) {
          const score = Math.round(data.fear_and_greed.score);
          setMarket({ score, label: data.fear_and_greed.rating || getLabel(score) });
        }
      })
      .catch(() => {
        // Fallback: use a static display
        setMarket(null);
      });

    // Crypto Fear & Greed
    fetch('https://api.alternative.me/fng/?limit=1')
      .then(r => r.json())
      .then(data => {
        if (data?.data?.[0]) {
          const score = Number(data.data[0].value);
          setCrypto({ score, label: data.data[0].value_classification });
        }
      })
      .catch(() => setCrypto(null));
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {market ? (
        <GaugeVisual
          score={market.score}
          label={market.label}
          title="Market Fear & Greed"
          icon={<Gauge className="w-5 h-5 text-amber-400" />}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm flex items-center justify-center text-slate-500 text-sm">
          Market gauge loading...
        </div>
      )}

      {crypto ? (
        <GaugeVisual
          score={crypto.score}
          label={crypto.label}
          title="Crypto Fear & Greed"
          icon={<Bitcoin className="w-5 h-5 text-orange-400" />}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm flex items-center justify-center text-slate-500 text-sm">
          Crypto gauge loading...
        </div>
      )}
    </div>
  );
}

function getLabel(score: number): string {
  if (score <= 25) return 'Extreme Fear';
  if (score <= 45) return 'Fear';
  if (score <= 55) return 'Neutral';
  if (score <= 75) return 'Greed';
  return 'Extreme Greed';
}
