// src/components/markets/NewsFeed.tsx
"use client";

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';

interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  category: string;
  related: string;
}

function timeAgo(unixTimestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - unixTimestamp);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NewsFeed({ userTickers }: { userTickers: string[] }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [companyNews, setCompanyNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'market' | 'portfolio'>('market');

  useEffect(() => {
    // Fetch general market news
    fetch('/api/markets?type=news&category=general')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setNews(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch news for user's specific tickers (top 3)
    const topTickers = userTickers.slice(0, 3);
    if (topTickers.length > 0) {
      Promise.all(
        topTickers.map(ticker =>
          fetch(`/api/markets?type=company-news&symbol=${ticker}`)
            .then(r => r.json())
            .catch(() => [])
        )
      ).then(results => {
        const all = results
          .flat()
          .filter((item: any) => item.headline)
          .sort((a: any, b: any) => b.datetime - a.datetime)
          .slice(0, 15);
        setCompanyNews(all);
      });
    }
  }, [userTickers]);

  const activeNews = tab === 'market' ? news : companyNews;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-indigo-400" />
          <h3 className="text-slate-100 font-bold">Market Intelligence</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('market')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              tab === 'market' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Market
          </button>
          {userTickers.length > 0 && (
            <button
              onClick={() => setTab('portfolio')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                tab === 'portfolio' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Your Holdings
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading market news...</div>
        ) : activeNews.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {tab === 'portfolio' ? 'No recent news for your holdings' : 'No news available'}
          </div>
        ) : (
          activeNews.map((item, i) => (
            <a
              key={item.id || i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 p-4 hover:bg-slate-800/50 transition-colors group"
            >
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  className="w-20 h-16 rounded-lg object-cover shrink-0 bg-slate-800"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-slate-100 text-sm font-medium line-clamp-2 group-hover:text-indigo-400 transition-colors">
                  {item.headline}
                </h4>
                <p className="text-slate-500 text-xs mt-1 line-clamp-1">{item.summary}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                  <span className="text-slate-400 font-medium">{item.source}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(item.datetime)}
                  </span>
                  {item.related && (
                    <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      {item.related.split(',').slice(0, 3).join(', ')}
                    </span>
                  )}
                  <ExternalLink className="w-3 h-3 ml-auto text-slate-600 group-hover:text-indigo-400" />
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
