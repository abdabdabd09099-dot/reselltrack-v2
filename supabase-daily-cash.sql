-- Run once in Supabase SQL Editor
-- Creates daily_cash table for recording actual cash collected per day
CREATE TABLE IF NOT EXISTS daily_cash (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cash_date    DATE NOT NULL,
  actual_cash  NUMERIC(12,2) NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cash_date)
);

ALTER TABLE daily_cash ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own daily_cash" ON daily_cash
  FOR ALL USING (auth.uid() = user_id);
