// src/app/actions.ts
"use server";

import { createClient } from '../utils/supabase-server';
import { revalidatePath } from 'next/cache';

// --- FUNCTION 1: ADD (AND CONSOLIDATE) ASSET ---
export async function addAsset(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const name = formData.get('name') as string;
  const asset_class = formData.get('assetClass') as string;

  let balance = 0;
  let ticker_symbol = null;
  let shares = 0;
  const growth_rate = Number(formData.get('growthRate')) || 0;
  const yield_rate = Number(formData.get('yieldRate')) || 0;
  const target_alloc = Number(formData.get('targetAllocation')) || 0;

  if (asset_class === 'Securities' || asset_class === 'Crypto' || asset_class === 'NSE Equities') {
    ticker_symbol = (formData.get('ticker') as string).toUpperCase();
    const incomingShares = Number(formData.get('shares'));

    // SCAN THE VAULT: Do we already own this?
    const { data: existingAssets } = await supabase
      .from('assets')
      .select('id, shares')
      .eq('ticker_symbol', ticker_symbol)
      .eq('user_id', user.id);

    const existingAsset = existingAssets && existingAssets.length > 0 ? existingAssets[0] : null;

    shares = existingAsset ? existingAsset.shares + incomingShares : incomingShares;

    // AUTO-PRICE
    try {
      if (asset_class === 'NSE Equities') {
        if (process.env.RAPIDAPI_KEY) {
          const res = await fetch(`https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks/${ticker_symbol}/realtime`, {
            headers: {
              'x-rapidapi-key': process.env.RAPIDAPI_KEY,
              'x-rapidapi-host': 'nairobi-stock-exchange-nse.p.rapidapi.com'
            }
          });
          const data = await res.json();
          if (data && data.price) balance = data.price * shares;
        }
      } else if (asset_class === 'Securities') {
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
      const { error } = await supabase.from('assets').update({ shares, balance }).eq('id', existingAsset.id);
      if (error) return { error: 'update_failed' };
    } else {
      const { error } = await supabase.from('assets').insert([{
        user_id: user.id, name, asset_class, balance, ticker_symbol, shares, target_allocation: target_alloc, annual_growth_rate: growth_rate, annual_yield: yield_rate
      }]);
      if (error) return { error: 'insert_failed' };
    }

  } else if (asset_class === 'Gold') {
    // Gold: shares = troy ounces, fetch live price
    shares = Number(formData.get('shares')) || 0;
    ticker_symbol = 'XAU';

    try {
      if (process.env.GOLD_API_KEY && shares > 0) {
        const res = await fetch('https://www.goldapi.io/api/XAU/USD', {
          headers: { 'x-access-token': process.env.GOLD_API_KEY }
        });
        const data = await res.json();
        if (data && data.price) balance = data.price * shares;
      }
    } catch (err) {
      console.error("Failed to fetch gold price:", err);
    }

    // If no API price, fall back to manual balance
    if (balance === 0) balance = Number(formData.get('balance')) || 0;

    const { error } = await supabase.from('assets').insert([{
      user_id: user.id, name, asset_class, balance, ticker_symbol, shares, target_allocation: target_alloc, annual_growth_rate: growth_rate, annual_yield: yield_rate
    }]);
    if (error) return { error: 'insert_failed' };

  } else {
    // Manual entry for Real Estate, Farms, Bonds, etc.
    balance = Number(formData.get('balance'));
    const { error } = await supabase.from('assets').insert([{
      user_id: user.id, name, asset_class, balance, ticker_symbol, shares, target_allocation: target_alloc, annual_growth_rate: growth_rate, annual_yield: yield_rate
    }]);
    if (error) return { error: 'insert_failed' };
  }

  revalidatePath('/');
  return { success: true };
}

// --- FUNCTION 2: DELETE ASSET ---
export async function deleteAsset(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const id = formData.get('id') as string;
  const { error } = await supabase.from('assets').delete().eq('id', id).eq('user_id', user.id);
  if (error) return { error: 'delete_failed' };
  revalidatePath('/');
  return { success: true };
}

// --- FUNCTION 3: UPDATE ASSET ---
export async function updateAsset(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

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
      if (asset_class === 'NSE Equities' && process.env.RAPIDAPI_KEY) {
        const res = await fetch(`https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks/${ticker_symbol}/realtime`, {
          headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': 'nairobi-stock-exchange-nse.p.rapidapi.com' }
        });
        const data = await res.json();
        if (data && data.price) updateData.balance = data.price * newShares;
      } else if (asset_class === 'Securities') {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker_symbol}&token=${process.env.FINNHUB_API_KEY}`);
        const data = await res.json();
        if (data && data.c) updateData.balance = data.c * newShares;
      } else if (asset_class === 'Crypto') {
        const coinId = ticker_symbol === 'BTC' ? 'bitcoin' : ticker_symbol.toLowerCase();
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        const data = await res.json();
        if (data[coinId]) updateData.balance = data[coinId].usd * newShares;
      } else if (asset_class === 'Gold' && process.env.GOLD_API_KEY) {
        const res = await fetch('https://www.goldapi.io/api/XAU/USD', {
          headers: { 'x-access-token': process.env.GOLD_API_KEY }
        });
        const data = await res.json();
        if (data && data.price) updateData.balance = data.price * newShares;
      }
    } catch (err) {
      console.error("Failed to fetch live price on update:", err);
    }
  } else if (newBalanceRaw) {
    updateData.balance = Number(newBalanceRaw);
  }

  const { error } = await supabase.from('assets').update(updateData).eq('id', id).eq('user_id', user.id);
  if (error) return { error: 'update_failed' };
  revalidatePath('/');
  return { success: true };
}
