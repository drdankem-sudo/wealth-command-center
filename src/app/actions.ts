// src/app/actions.ts
"use server";

import { createClient } from '../utils/supabase-server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ─── INPUT VALIDATION SCHEMAS ───
const VALID_ASSET_CLASSES = [
  'Securities', 'Crypto', 'NSE Equities', 'Gold', 'Commodities',
  'Real estate', 'Farm/ranch', 'VC fund', 'Bonds/Tbills', 'Sacco/MMF', 'Cash',
  'Vehicle', 'Equipment'
] as const;

const TICKER_REGEX = /^[A-Z0-9._-]{1,12}$/;

// Default depreciation rates for auto-depreciating asset classes
const DEFAULT_DEPRECIATION: Record<string, number> = {
  'Vehicle': -15,    // -15% per year
  'Equipment': -25,  // -25% per year
};

const AddAssetSchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
  assetClass: z.enum(VALID_ASSET_CLASSES, { message: 'Invalid asset class' }),
  ticker: z.string().regex(TICKER_REGEX, 'Invalid ticker format').optional().or(z.literal('')),
  shares: z.number().min(0).max(1_000_000_000).optional(),
  balance: z.number().min(0).max(100_000_000_000).optional(),
  growthRate: z.number().min(-100).max(100).optional(), // negative = depreciation
  yieldRate: z.number().min(0).max(100).optional(),
  targetAllocation: z.number().min(0).max(100).optional(),
});

const DeleteSchema = z.object({
  id: z.string().uuid('Invalid asset ID'),
});

const UpdateSchema = z.object({
  id: z.string().uuid('Invalid asset ID'),
  shares: z.number().min(0).max(1_000_000_000).optional(),
  balance: z.number().min(0).max(100_000_000_000).optional(),
  ticker: z.string().max(12).optional().or(z.literal('')),
  assetClass: z.string().max(30).optional().or(z.literal('')),
});

// ─── SAFE FETCH HELPERS ───
async function fetchFinnhub(ticker: string): Promise<{ price: number | null; dividendYield: number | null }> {
  if (!process.env.FINNHUB_API_KEY) return { price: null, dividendYield: null };
  try {
    // Fetch quote + profile2 for dividend yield
    const [quoteRes, profileRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}`, {
        headers: { 'X-Finnhub-Token': process.env.FINNHUB_API_KEY }
      }),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`, {
        headers: { 'X-Finnhub-Token': process.env.FINNHUB_API_KEY }
      }),
    ]);
    const quote = await quoteRes.json();
    const profile = await profileRes.json();

    return {
      price: quote?.c || null,
      dividendYield: profile?.metric?.dividendYieldIndicatedAnnual || null,
    };
  } catch { return { price: null, dividendYield: null }; }
}

async function fetchCrypto(ticker: string): Promise<number | null> {
  try {
    const coinId = ticker === 'BTC' ? 'bitcoin' : ticker === 'ETH' ? 'ethereum' : ticker === 'SOL' ? 'solana' : ticker.toLowerCase();
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`);
    const data = await res.json();
    return data[coinId]?.usd || null;
  } catch { return null; }
}

async function fetchNSE(ticker: string): Promise<number | null> {
  if (!process.env.RAPIDAPI_KEY) return null;
  try {
    const res = await fetch(`https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks/${encodeURIComponent(ticker)}/realtime`, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'nairobi-stock-exchange-nse.p.rapidapi.com'
      }
    });
    const data = await res.json();
    return data?.price || null;
  } catch { return null; }
}

async function fetchGold(): Promise<number | null> {
  if (!process.env.GOLD_API_KEY) return null;
  try {
    const res = await fetch('https://www.goldapi.io/api/XAU/USD', {
      headers: { 'x-access-token': process.env.GOLD_API_KEY }
    });
    const data = await res.json();
    return data?.price || null;
  } catch { return null; }
}

// --- FUNCTION 1: ADD (AND CONSOLIDATE) ASSET ---
export async function addAsset(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  // Validate input
  const rawGrowthRate = formData.get('growthRate');
  const assetClassRaw = formData.get('assetClass') as string;

  const raw = {
    name: (formData.get('name') as string || '').trim(),
    assetClass: assetClassRaw,
    ticker: ((formData.get('ticker') as string) || '').toUpperCase().trim(),
    shares: Number(formData.get('shares')) || 0,
    balance: Number(formData.get('balance')) || 0,
    growthRate: rawGrowthRate !== null && rawGrowthRate !== ''
      ? Number(rawGrowthRate)
      : (DEFAULT_DEPRECIATION[assetClassRaw] ?? 0),
    yieldRate: Number(formData.get('yieldRate')) || 0,
    targetAllocation: Number(formData.get('targetAllocation')) || 0,
  };

  const parsed = AddAssetSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'validation_failed' };
  }

  const { name, assetClass, ticker, shares: incomingShares, balance: manualBalance, growthRate, yieldRate, targetAllocation } = parsed.data;

  let balance = 0;
  let ticker_symbol: string | null = ticker || null;
  let shares = incomingShares || 0;
  let autoYield = yieldRate || 0;

  if (assetClass === 'Securities' || assetClass === 'Crypto' || assetClass === 'NSE Equities') {
    if (!ticker_symbol) return { error: 'Ticker symbol required for market assets' };

    // SCAN THE VAULT: Do we already own this?
    const { data: existingAssets } = await supabase
      .from('assets')
      .select('id, shares')
      .eq('ticker_symbol', ticker_symbol)
      .eq('user_id', user.id);

    const existingAsset = existingAssets && existingAssets.length > 0 ? existingAssets[0] : null;
    shares = existingAsset ? existingAsset.shares + (incomingShares || 0) : (incomingShares || 0);

    // AUTO-PRICE + AUTO-YIELD (Securities)
    if (assetClass === 'Securities') {
      const { price, dividendYield } = await fetchFinnhub(ticker_symbol);
      if (price && shares > 0) balance = price * shares;
      if (dividendYield && !autoYield) autoYield = dividendYield;
    } else if (assetClass === 'Crypto') {
      const price = await fetchCrypto(ticker_symbol);
      if (price && shares > 0) balance = price * shares;
    } else if (assetClass === 'NSE Equities') {
      const price = await fetchNSE(ticker_symbol);
      if (price && shares > 0) balance = price * shares;
    }

    if (existingAsset) {
      const updateFields: Record<string, number> = { shares, balance };
      if (autoYield) updateFields.annual_yield = autoYield;
      const { error } = await supabase.from('assets').update(updateFields).eq('id', existingAsset.id);
      if (error) return { error: 'update_failed' };
    } else {
      const { error } = await supabase.from('assets').insert([{
        user_id: user.id, name, asset_class: assetClass, balance, ticker_symbol, shares,
        target_allocation: targetAllocation, annual_growth_rate: growthRate, annual_yield: autoYield
      }]);
      if (error) return { error: 'insert_failed' };
    }

  } else if (assetClass === 'Gold') {
    ticker_symbol = 'XAU';
    const price = await fetchGold();
    if (price && shares > 0) balance = price * shares;
    if (balance === 0) balance = manualBalance || 0;

    const { error } = await supabase.from('assets').insert([{
      user_id: user.id, name, asset_class: assetClass, balance, ticker_symbol, shares,
      target_allocation: targetAllocation, annual_growth_rate: growthRate, annual_yield: autoYield
    }]);
    if (error) return { error: 'insert_failed' };

  } else {
    // Manual entry: Real Estate, Farms, Bonds, Cash, Vehicle, Equipment, etc.
    balance = manualBalance || 0;
    const { error } = await supabase.from('assets').insert([{
      user_id: user.id, name, asset_class: assetClass, balance, ticker_symbol, shares,
      target_allocation: targetAllocation, annual_growth_rate: growthRate ?? 0, annual_yield: autoYield
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

  const parsed = DeleteSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: 'invalid_id' };

  const { error } = await supabase.from('assets').delete().eq('id', parsed.data.id).eq('user_id', user.id);
  if (error) return { error: 'delete_failed' };
  revalidatePath('/');
  return { success: true };
}

// --- FUNCTION 3: UPDATE ASSET ---
export async function updateAsset(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const raw = {
    id: formData.get('id') as string,
    shares: formData.get('shares') ? Number(formData.get('shares')) : undefined,
    balance: formData.get('balance') ? Number(formData.get('balance')) : undefined,
    ticker: (formData.get('ticker') as string) || '',
    assetClass: (formData.get('assetClass') as string) || '',
  };

  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'validation_failed' };

  const { id, shares, balance, ticker, assetClass } = parsed.data;
  const updateData: Record<string, number> = {};

  if (ticker && ticker !== 'undefined' && ticker !== 'null' && shares !== undefined) {
    updateData.shares = shares;

    if (assetClass === 'Securities') {
      const { price } = await fetchFinnhub(ticker.toUpperCase());
      if (price) updateData.balance = price * shares;
    } else if (assetClass === 'Crypto') {
      const price = await fetchCrypto(ticker.toUpperCase());
      if (price) updateData.balance = price * shares;
    } else if (assetClass === 'NSE Equities') {
      const price = await fetchNSE(ticker.toUpperCase());
      if (price) updateData.balance = price * shares;
    } else if (assetClass === 'Gold') {
      const price = await fetchGold();
      if (price) updateData.balance = price * shares;
    }
  } else if (balance !== undefined) {
    updateData.balance = balance;
  }

  const { error } = await supabase.from('assets').update(updateData).eq('id', id).eq('user_id', user.id);
  if (error) return { error: 'update_failed' };
  revalidatePath('/');
  return { success: true };
}
