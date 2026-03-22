-- ═══════════════════════════════════════════════════════
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard → SQL Editor)
-- Run Part 1 first, then Part 2
-- ═══════════════════════════════════════════════════════

-- ═══ PART 1: Create liabilities table ═══

CREATE TABLE IF NOT EXISTS public.liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  liability_type TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  monthly_payment NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own liabilities"
  ON public.liabilities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own liabilities"
  ON public.liabilities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own liabilities"
  ON public.liabilities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own liabilities"
  ON public.liabilities FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON public.liabilities(user_id);


-- ═══ PART 2: Add columns to assets table ═══
-- Run these one at a time. Ignore "already exists" errors.

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS annual_growth_rate NUMERIC DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS annual_yield NUMERIC DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS pending_yield_cash NUMERIC DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS target_allocation NUMERIC DEFAULT 0;
