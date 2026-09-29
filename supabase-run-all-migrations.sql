-- ═══════════════════════════════════════════════════════════════════
-- ResellTrack — Run ALL pending migrations in Supabase SQL Editor
-- Copy this entire file, paste into:
-- https://app.supabase.com/project/devqrpcxaxjcxdixwitw/sql/new
-- ═══════════════════════════════════════════════════════════════════

-- 1. Split payment columns
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS cash_paid     NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transfer_paid NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_cash   NUMERIC(12,2) DEFAULT NULL;

-- 2. Allow 'split' as payment_method
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash','transfer','split'));

-- 3. Add variant column to sale_items (for product size/colour variants)
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT NULL;

-- 4. Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sales'
  AND column_name IN ('cash_paid','transfer_paid','actual_cash','payment_method')
ORDER BY column_name;
