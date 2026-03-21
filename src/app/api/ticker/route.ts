// src/app/api/ticker/route.ts
// Lightweight proxy for ticker data — avoids exposing API keys to the client

import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  if (!symbol || !/^[A-Z0-9.^]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  try {
    // Gold special case
    if (symbol === 'GOLD') {
      if (!process.env.GOLD_API_KEY) {
        return NextResponse.json({ price: null });
      }
      const res = await fetch('https://www.goldapi.io/api/XAU/USD', {
        headers: { 'x-access-token': process.env.GOLD_API_KEY },
        next: { revalidate: 300 }, // cache 5 min
      });
      const data = await res.json();
      return NextResponse.json({ price: data?.price || null });
    }

    // Everything else: Finnhub
    if (!process.env.FINNHUB_API_KEY) {
      return NextResponse.json({ price: null, change: null });
    }

    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`, {
      headers: { 'X-Finnhub-Token': process.env.FINNHUB_API_KEY },
      next: { revalidate: 60 }, // cache 1 min
    });
    const data = await res.json();

    return NextResponse.json({
      price: data?.c || null,
      change: data?.dp || null, // dp = percent change
    });

  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
