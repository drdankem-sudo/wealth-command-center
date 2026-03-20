-- ═══════════════════════════════════════════════════════
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard → SQL Editor)
-- Creates the liabilities table + RLS policies
-- ═══════════════════════════════════════════════════════

-- 1. Create liabilities table
CREATE TABLE IF NOT EXISTS liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  liability_type TEXT NOT NULL, -- 'Mortgage', 'Car Loan', 'Credit Card', 'Student Loan', 'Personal Loan', 'Other'
  balance NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0, -- Annual APR (e.g. 6.5 for 6.5%)
  monthly_payment NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Users can only see/manage their own liabilities
CREATE POLICY "Users can view own liabilities"
  ON liabilities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own liabilities"
  ON liabilities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own liabilities"
  ON liabilities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own liabilities"
  ON liabilities FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Add index for fast user lookups
CREATE INDEX idx_liabilities_user_id ON liabilities(user_id);

-- ═══════════════════════════════════════════════════════
-- ALSO: Add missing columns to assets table if not present
-- (safe to run even if columns already exist)
-- ═══════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'annual_growth_rate') THEN
    ALTER TABLE assets ADD COLUMN annual_growth_rate NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'annual_yield') THEN
    ALTER TABLE assets ADD COLUMN annual_yield NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'pending_yield_cash') THEN
    ALTER TABLE assets ADD COLUMN pending_yield_cash NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'target_allocation') THEN
    ALTER TABLE assets ADD COLUMN target_allocation NUMERIC DEFAULT 0;
  END IF;
END $$;
