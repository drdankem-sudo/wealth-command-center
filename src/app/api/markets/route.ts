// src/app/api/markets/route.ts
// Server-side proxy for market intelligence APIs — keeps keys safe

import { NextResponse, type NextRequest } from 'next/server';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';

async function finnhub(path: string) {
  const res = await fetch(`https://finnhub.io/api/v1${path}`, {
    headers: { 'X-Finnhub-Token': FINNHUB_KEY },
    next: { revalidate: 300 }, // cache 5 min
  });
  return res.json();
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');

  try {
    switch (type) {
      // ─── MARKET NEWS ───
      case 'news': {
        const category = request.nextUrl.searchParams.get('category') || 'general';
        const data = await finnhub(`/news?category=${encodeURIComponent(category)}&minId=0`);
        // Return top 20
        return NextResponse.json((data || []).slice(0, 20));
      }

      // ─── COMPANY NEWS (for a specific ticker) ───
      case 'company-news': {
        const symbol = request.nextUrl.searchParams.get('symbol');
        if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const data = await finnhub(`/company-news?symbol=${encodeURIComponent(symbol)}&from=${weekAgo}&to=${today}`);
        return NextResponse.json((data || []).slice(0, 10));
      }

      // ─── EARNINGS CALENDAR ───
      case 'earnings': {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const data = await finnhub(`/calendar/earnings?from=${today}&to=${nextMonth}`);
        return NextResponse.json(data?.earningsCalendar || []);
      }

      // ─── COMPANY PROFILE ───
      case 'profile': {
        const symbol = request.nextUrl.searchParams.get('symbol');
        if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
        const [profile, metrics] = await Promise.all([
          finnhub(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`),
          finnhub(`/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`),
        ]);
        return NextResponse.json({
          ...profile,
          metrics: metrics?.metric || {},
        });
      }

      // ─── ECONOMIC CALENDAR ───
      case 'economic': {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const data = await finnhub(`/calendar/economic?from=${today}&to=${nextMonth}`);
        return NextResponse.json((data?.economicCalendar || []).slice(0, 20));
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
