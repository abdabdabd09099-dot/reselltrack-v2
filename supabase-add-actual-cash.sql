-- Run this once in Supabase SQL Editor
-- Adds actual_cash_collected column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS actual_cash NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN sales.actual_cash IS 
'Actual physical cash handed to seller. May differ from amount_paid if overpaid or underpaid.';
