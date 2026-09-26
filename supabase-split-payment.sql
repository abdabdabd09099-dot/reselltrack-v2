-- Run once in Supabase SQL Editor
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS cash_paid     NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transfer_paid NUMERIC(12,2) DEFAULT NULL;

-- Update payment_method check to allow 'split'
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash','transfer','split'));
