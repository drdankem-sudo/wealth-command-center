// src/components/markets/MarketBrief.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Brain, RefreshCw, Sparkles } from 'lucide-react';

interface MarketBriefProps {
  userTickers: string[];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const CACHE_KEY = 'ai-market-brief';

function getCachedBrief(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.date === todayKey()) return parsed.brief;
    return null;
  } catch {
    return null;
  }
}

function setCachedBrief(brief: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey(), brief }));
  } catch {
    // localStorage might be full or unavailable
  }
}

function renderBrief(text: string) {
  // Split into lines, render section headers as bold and bullets as list items
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;

    // Section headers: lines starting with ** or ## or ending with :
    if (/^#{1,3}\s+/.test(trimmed)) {
      const headerText = trimmed.replace(/^#{1,3}\s+/, '');
      return (
        <h3 key={i} className="text-sm font-semibold text-emerald-400 mt-4 mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {headerText}
        </h3>
      );
    }

    if (/^\*\*(.+)\*\*:?$/.test(trimmed)) {
      const headerText = trimmed.replace(/^\*\*/, '').replace(/\*\*:?$/, '');
      return (
        <h3 key={i} className="text-sm font-semibold text-emerald-400 mt-4 mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {headerText}
        </h3>
      );
    }

    // Bullet points: lines starting with - or *
    if (/^[-*]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*]\s+/, '');
      return (
        <div key={i} className="flex gap-2 text-sm text-slate-300 ml-2 my-0.5">
          <span className="text-emerald-500 mt-0.5 shrink-0">&#8226;</span>
          <span dangerouslySetInnerHTML={{ __html: inlineBold(bulletText) }} />
        </div>
      );
    }

    // Regular paragraph
    return (
      <p key={i} className="text-sm text-slate-300 my-1" dangerouslySetInnerHTML={{ __html: inlineBold(trimmed) }} />
    );
  });
}

/** Convert **bold** markdown to <strong> tags */
function inlineBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-100 font-medium">$1</strong>');
}

export default function MarketBrief({ userTickers }: MarketBriefProps) {
  const [brief, setBrief] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const generateBrief = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCachedBrief();
      if (cached) {
        setBrief(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all three data sources in parallel
      const [newsRes, economicRes, earningsRes] = await Promise.all([
        fetch('/api/markets?type=news&category=general').then(r => r.json()).catch(() => []),
        fetch('/api/markets?type=economic').then(r => r.json()).catch(() => []),
        fetch('/api/markets?type=earnings').then(r => r.json()).catch(() => []),
      ]);

      // Trim data to avoid oversized payloads
      const news = Array.isArray(newsRes) ? newsRes.slice(0, 10) : [];
      const economic = Array.isArray(economicRes) ? economicRes.slice(0, 15) : [];
      const earnings = Array.isArray(earningsRes) ? earningsRes.slice(0, 10) : [];

      // Call AI summarization endpoint
      const response = await fetch('/api/market-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          news,
          economic,
          earnings,
          tickers: userTickers,
          date: todayKey(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate brief (${response.status})`);
      }

      const data = await response.json();
      const generatedBrief = data.brief || data.content || '';

      if (!generatedBrief) {
        throw new Error('Empty response from AI');
      }

      setBrief(generatedBrief);
      setCachedBrief(generatedBrief);
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch (err: any) {
      setError(err.message || 'Failed to generate market brief');
    } finally {
      setLoading(false);
    }
  }, [userTickers]);

  useEffect(() => {
    generateBrief();
  }, [generateBrief]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">AI Market Brief</h2>
            <p className="text-xs text-slate-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {remaining !== null && (
            <span className="text-[10px] text-slate-500">
              {remaining}/5 left today
            </span>
          )}
          <button
            onClick={() => generateBrief(true)}
            disabled={loading || remaining === 0}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200
                       bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-800 rounded w-full" />
          <div className="h-4 bg-slate-800 rounded w-5/6" />
          <div className="h-3 bg-slate-800/60 rounded w-2/3 mt-4" />
          <div className="h-4 bg-slate-800 rounded w-full" />
          <div className="h-4 bg-slate-800 rounded w-4/5" />
          <div className="h-3 bg-slate-800/60 rounded w-1/2 mt-4" />
          <div className="h-4 bg-slate-800 rounded w-full" />
          <div className="h-4 bg-slate-800 rounded w-3/4" />
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button
            onClick={() => generateBrief(true)}
            className="text-sm text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700
                       px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && brief && (
        <div className="border-t border-slate-800 pt-4">
          {renderBrief(brief)}
        </div>
      )}
    </div>
  );
}
