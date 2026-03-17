import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET() {
  try {
    console.log("Starting Market Sync...");

    // 1. UPDATE CRYPTO (Your original BTC code)
    const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const btcData = await btcRes.json();
    await supabase.from('live_prices').upsert([
      { ticker_symbol: 'BTC', current_price: btcData.bitcoin.usd, last_updated: new Date().toISOString() }
    ]);

    // 2. UPDATE EQUITIES (The New Engine)
    // Find all assets in your database that have a ticker symbol
    const { data: stocks, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .not('ticker_symbol', 'is', null);

    if (fetchError) throw fetchError;

    if (stocks && stocks.length > 0) {
      for (const stock of stocks) {
        // Ping Finnhub for the live quote
        const stockRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${stock.ticker_symbol}&token=${process.env.FINNHUB_API_KEY}`);
        const stockQuote = await stockRes.json();
        
        const currentPrice = stockQuote.c; // 'c' is the current price attribute in Finnhub

        // If we got a valid price and you own shares, calculate the new balance
        if (currentPrice && stock.shares > 0) {
          const calculatedBalance = currentPrice * stock.shares;
          
          await supabase
            .from('assets')
            .update({ balance: calculatedBalance })
            .eq('id', stock.id); // Update this specific stock in the database
            
          console.log(`Updated ${stock.ticker_symbol}: ${stock.shares} shares @ $${currentPrice} = $${calculatedBalance}`);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Equities and Crypto Synced!" });

  } catch (error: any) {
    console.error("Sync Failed:", error.message);
    // 3. RECORD DAILY WEALTH SNAPSHOT
    // Calculate total assets
    const { data: allAssets } = await supabase.from('assets').select('balance');
    const totalWealth = allAssets?.reduce((sum, asset) => sum + Number(asset.balance || 0), 0) || 0;

    // Upsert into history (if today already exists, it just updates today's number)
    await supabase.from('net_worth_history').upsert([
      { recorded_date: new Date().toISOString().split('T')[0], net_worth: totalWealth }
    ], { onConflict: 'recorded_date' });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}