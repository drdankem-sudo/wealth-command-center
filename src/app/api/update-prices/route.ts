import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── SECURITY: Verify request is from Vercel Cron or authorized caller ───
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("Starting Market Sync...");
    const livePricedIds = new Set<string>();

    // ─── 1. UPDATE CRYPTO via CoinGecko ───
    const { data: cryptoAssets } = await supabase
      .from('assets')
      .select('id, ticker_symbol, shares')
      .eq('asset_class', 'Crypto')
      .not('ticker_symbol', 'is', null);

    if (cryptoAssets && cryptoAssets.length > 0) {
      const coinMap: Record<string, string> = {};
      for (const a of cryptoAssets) {
        const coinId = a.ticker_symbol === 'BTC' ? 'bitcoin'
          : a.ticker_symbol === 'ETH' ? 'ethereum'
          : a.ticker_symbol === 'SOL' ? 'solana'
          : a.ticker_symbol!.toLowerCase();
        coinMap[coinId] = a.ticker_symbol!;
      }

      const ids = Object.keys(coinMap).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      const data = await res.json();

      for (const asset of cryptoAssets) {
        const coinId = asset.ticker_symbol === 'BTC' ? 'bitcoin'
          : asset.ticker_symbol === 'ETH' ? 'ethereum'
          : asset.ticker_symbol === 'SOL' ? 'solana'
          : asset.ticker_symbol!.toLowerCase();

        if (data[coinId]?.usd && asset.shares > 0) {
          const price = data[coinId].usd;
          await supabase.from('assets').update({ balance: price * asset.shares }).eq('id', asset.id);
          livePricedIds.add(asset.id);
          console.log(`Crypto ${asset.ticker_symbol}: ${asset.shares} @ $${price}`);
        }
      }

      if (data.bitcoin?.usd) {
        await supabase.from('live_prices').upsert([
          { ticker_symbol: 'BTC', current_price: data.bitcoin.usd, last_updated: new Date().toISOString() }
        ]);
      }
    }

    // ─── 2. UPDATE US EQUITIES via Finnhub + auto-update dividend yield ───
    const { data: usStocks } = await supabase
      .from('assets')
      .select('id, ticker_symbol, shares')
      .eq('asset_class', 'Securities')
      .not('ticker_symbol', 'is', null);

    if (usStocks && usStocks.length > 0 && process.env.FINNHUB_API_KEY) {
      for (const stock of usStocks) {
        try {
          // Fetch price
          const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(stock.ticker_symbol!)}`, {
            headers: { 'X-Finnhub-Token': process.env.FINNHUB_API_KEY }
          });
          const quote = await quoteRes.json();

          // Fetch dividend yield
          const metricRes = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(stock.ticker_symbol!)}&metric=all`, {
            headers: { 'X-Finnhub-Token': process.env.FINNHUB_API_KEY }
          });
          const metric = await metricRes.json();
          const dividendYield = metric?.metric?.dividendYieldIndicatedAnnual || null;

          if (quote.c && stock.shares > 0) {
            const updateFields: Record<string, number> = { balance: quote.c * stock.shares };
            if (dividendYield !== null) updateFields.annual_yield = dividendYield;
            await supabase.from('assets').update(updateFields).eq('id', stock.id);
            livePricedIds.add(stock.id);
            console.log(`US Stock ${stock.ticker_symbol}: ${stock.shares} @ $${quote.c}, yield=${dividendYield ?? 'N/A'}%`);
          }
        } catch (err) {
          console.error(`Failed to price ${stock.ticker_symbol}:`, err);
        }
      }
    }

    // ─── 3. UPDATE NSE EQUITIES via RapidAPI ───
    const { data: nseStocks } = await supabase
      .from('assets')
      .select('id, ticker_symbol, shares')
      .eq('asset_class', 'NSE Equities')
      .not('ticker_symbol', 'is', null);

    if (nseStocks && nseStocks.length > 0 && process.env.RAPIDAPI_KEY) {
      for (const stock of nseStocks) {
        try {
          const res = await fetch(`https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks/${encodeURIComponent(stock.ticker_symbol!)}/realtime`, {
            headers: {
              'x-rapidapi-key': process.env.RAPIDAPI_KEY,
              'x-rapidapi-host': 'nairobi-stock-exchange-nse.p.rapidapi.com'
            }
          });
          const data = await res.json();
          if (data?.price && stock.shares > 0) {
            await supabase.from('assets').update({ balance: data.price * stock.shares }).eq('id', stock.id);
            livePricedIds.add(stock.id);
            console.log(`NSE ${stock.ticker_symbol}: ${stock.shares} @ KES ${data.price}`);
          }
        } catch (err) {
          console.error(`Failed to price NSE ${stock.ticker_symbol}:`, err);
        }
      }
    }

    // ─── 4. UPDATE GOLD via goldapi.io ───
    const { data: goldAssets } = await supabase
      .from('assets')
      .select('id, shares')
      .eq('asset_class', 'Gold');

    if (goldAssets && goldAssets.length > 0 && process.env.GOLD_API_KEY) {
      try {
        const res = await fetch('https://www.goldapi.io/api/XAU/USD', {
          headers: { 'x-access-token': process.env.GOLD_API_KEY }
        });
        const data = await res.json();
        if (data?.price) {
          for (const gold of goldAssets) {
            if (gold.shares > 0) {
              await supabase.from('assets').update({ balance: data.price * gold.shares }).eq('id', gold.id);
              livePricedIds.add(gold.id);
              console.log(`Gold: ${gold.shares} oz @ $${data.price}`);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch gold price:", err);
      }
    }

    // ─── 5. UPDATE COMMODITIES via commodities-api ───
    const { data: commodityAssets } = await supabase
      .from('assets')
      .select('id, ticker_symbol, shares')
      .eq('asset_class', 'Commodities')
      .not('ticker_symbol', 'is', null);

    if (commodityAssets && commodityAssets.length > 0 && process.env.COMMODITIES_API_KEY) {
      for (const commodity of commodityAssets) {
        try {
          const res = await fetch(`https://commodities-api.com/api/latest?access_key=${process.env.COMMODITIES_API_KEY}&base=USD&symbols=${encodeURIComponent(commodity.ticker_symbol!)}`);
          const data = await res.json();
          if (data?.data?.rates?.[commodity.ticker_symbol!] && commodity.shares > 0) {
            const price = 1 / data.data.rates[commodity.ticker_symbol!];
            await supabase.from('assets').update({ balance: price * commodity.shares }).eq('id', commodity.id);
            livePricedIds.add(commodity.id);
            console.log(`Commodity ${commodity.ticker_symbol}: ${commodity.shares} @ $${price.toFixed(2)}`);
          }
        } catch (err) {
          console.error(`Failed to price commodity ${commodity.ticker_symbol}:`, err);
        }
      }
    }

    // ─── 6. APPRECIATION / DEPRECIATION ENGINE ───
    // Works for ALL assets: positive growth = appreciation, negative = depreciation
    const { data: allAssets } = await supabase
      .from('assets')
      .select('id, balance, annual_growth_rate, annual_yield, pending_yield_cash');

    if (allAssets) {
      for (const asset of allAssets) {
        if (livePricedIds.has(asset.id)) continue;

        const growthRate = Number(asset.annual_growth_rate || 0);
        const yieldRate = Number(asset.annual_yield || 0);
        let balance = Number(asset.balance || 0);
        let pendingYield = Number(asset.pending_yield_cash || 0);
        let changed = false;

        // Daily compound growth/depreciation: balance *= (1 + rate/100)^(1/365)
        if (growthRate !== 0 && balance > 0) {
          balance *= Math.pow(1 + growthRate / 100, 1 / 365);
          if (balance < 0) balance = 0; // Floor at zero
          changed = true;
        }

        // Accrue daily yield (only for positive-yield assets)
        if (yieldRate > 0 && balance > 0) {
          pendingYield += balance * (yieldRate / 100) / 365;
          changed = true;
        }

        if (changed) {
          await supabase.from('assets').update({
            balance: Math.round(balance * 100) / 100,
            pending_yield_cash: Math.round(pendingYield * 100) / 100
          }).eq('id', asset.id);
          console.log(`Asset ${asset.id}: balance=$${balance.toFixed(2)}, yield=$${pendingYield.toFixed(2)}`);
        }
      }
    }

    // ─── 7. LIABILITY INTEREST ACCRUAL ───
    // Daily interest: balance += balance * (APR/100) / 365
    const { data: allLiabilities } = await supabase
      .from('liabilities')
      .select('id, balance, interest_rate');

    if (allLiabilities) {
      for (const liability of allLiabilities) {
        const rate = Number(liability.interest_rate || 0);
        let balance = Number(liability.balance || 0);

        if (rate > 0 && balance > 0) {
          const dailyInterest = balance * (rate / 100) / 365;
          balance += dailyInterest;
          await supabase.from('liabilities').update({
            balance: Math.round(balance * 100) / 100
          }).eq('id', liability.id);
          console.log(`Liability ${liability.id}: +$${dailyInterest.toFixed(2)} interest, new balance=$${balance.toFixed(2)}`);
        }
      }
    }

    // ─── 8. RECORD DAILY WEALTH SNAPSHOT (assets - liabilities) ───
    const { data: snapshotAssets } = await supabase.from('assets').select('user_id, balance');
    const { data: snapshotLiabilities } = await supabase.from('liabilities').select('user_id, balance');

    if (snapshotAssets) {
      const userTotals: Record<string, number> = {};
      for (const a of snapshotAssets) {
        userTotals[a.user_id] = (userTotals[a.user_id] || 0) + Number(a.balance || 0);
      }
      // Subtract liabilities
      if (snapshotLiabilities) {
        for (const l of snapshotLiabilities) {
          userTotals[l.user_id] = (userTotals[l.user_id] || 0) - Number(l.balance || 0);
        }
      }

      const today = new Date().toISOString().split('T')[0];
      for (const [userId, total] of Object.entries(userTotals)) {
        await supabase.from('net_worth_history').upsert([
          { user_id: userId, recorded_date: today, net_worth: total }
        ], { onConflict: 'recorded_date' });
      }
    }

    return NextResponse.json({ success: true, message: "Full market sync complete." });

  } catch (error: unknown) {
    console.error("Sync Failed:", error);
    return NextResponse.json({ error: 'Internal sync error' }, { status: 500 });
  }
}
