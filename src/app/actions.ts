// src/app/actions.ts
"use server";

import { createClient } from '../utils/supabase-server';
import { revalidatePath } from 'next/cache';

// --- FUNCTION 1: ADD (AND CONSOLIDATE) ASSET ---
export async function addAsset(formData: FormData) {
  const supabase = await createClient();
  
  // Get the logged-in Commander's ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const name = formData.get('name') as string;
  const asset_class = formData.get('assetClass') as string;
  
  let balance = 0;
  let ticker_symbol = null;
  let shares = 0;
  const growth_rate = Number(formData.get('growthRate')) || 0;
  const yield_rate = Number(formData.get('yieldRate')) || 0;

  if (asset_class === 'Securities' || asset_class === 'Crypto') {
    ticker_symbol = (formData.get('ticker') as string).toUpperCase();
    const incomingShares = Number(formData.get('shares'));

    // SCAN THE VAULT: Do we already own this? (Now scoped to just YOUR assets)
    const { data: existingAssets } = await supabase
      .from('assets')
      .select('id, shares')
      .eq('ticker_symbol', ticker_symbol)
      .eq('user_id', user.id);

    const existingAsset = existingAssets && existingAssets.length > 0 ? existingAssets[0] : null;

    shares = existingAsset ? existingAsset.shares + incomingShares : incomingShares;

    // AUTO-PRICE
    try {
      if (asset_class === 'Securities') {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker_symbol}&token=${process.env.FINNHUB_API_KEY}`);
        const data = await res.json();
        if (data && data.c) balance = data.c * shares; 
      } else if (asset_class === 'Crypto') {
        const coinId = ticker_symbol === 'BTC' ? 'bitcoin' : ticker_symbol.toLowerCase();
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        const data = await res.json();
        if (data[coinId]) balance = data[coinId].usd * shares;
      }
    } catch (err) {
      console.error("Failed to fetch live price:", err);
    }

    if (existingAsset) {
      await supabase.from('assets').update({ shares, balance }).eq('id', existingAsset.id);
    } else {
      // 🚨 INJECTING USER ID HERE
      await supabase.from('assets').insert([{ 
        user_id: user.id, name, asset_class, balance, ticker_symbol, shares, target_allocation: 0, annual_growth_rate: growth_rate, annual_yield: yield_rate 
      }]);
    }

  } else {
    // Manual entry for Real Estate, Farms, etc.
    balance = Number(formData.get('balance')); 
    await supabase.from('assets').insert([{ 
      user_id: user.id, name, asset_class, balance, ticker_symbol, shares, target_allocation: 0, annual_growth_rate: growth_rate, annual_yield: yield_rate 
    }]);
  }

  revalidatePath('/');
}

// --- FUNCTION 2: DELETE ASSET ---
export async function deleteAsset(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  await supabase.from('assets').delete().eq('id', id);
  revalidatePath('/');
}

// --- FUNCTION 3: UPDATE ASSET ---
export async function updateAsset(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const newSharesRaw = formData.get('shares');
  const newBalanceRaw = formData.get('balance');
  const ticker_symbol = formData.get('ticker') as string;
  const asset_class = formData.get('assetClass') as string;

  const updateData: any = {};

  if (ticker_symbol && ticker_symbol !== 'undefined' && ticker_symbol !== 'null' && newSharesRaw) {
    const newShares = Number(newSharesRaw);
    updateData.shares = newShares;

    try {
      if (asset_class === 'Securities') {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker_symbol}&token=${process.env.FINNHUB_API_KEY}`);
        const data = await res.json();
        if (data && data.c) updateData.balance = data.c * newShares;
      } else if (asset_class === 'Crypto') {
        const coinId = ticker_symbol === 'BTC' ? 'bitcoin' : ticker_symbol.toLowerCase();
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        const data = await res.json();
        if (data[coinId]) updateData.balance = data[coinId].usd * newShares;
      }
    } catch (err) {
      console.error("Failed to fetch live price on update:", err);
    }
  } else if (newBalanceRaw) {
    updateData.balance = Number(newBalanceRaw);
  }

  await supabase.from('assets').update(updateData).eq('id', id);
  revalidatePath('/');
}
