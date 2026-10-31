-- ═══════════════════════════════════════════════════════════════════════════
-- ResellTrack — Stock management Phase 1
-- Run ONCE in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again: every statement uses IF NOT EXISTS / DROP IF EXISTS.
-- Existing products and sales are not changed or deleted.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Product types (sizes / colours), each with its own stock ───────────────
CREATE TABLE IF NOT EXISTS public.product_variants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  stock          INT  NOT NULL DEFAULT 0 CHECK (stock >= 0),
  buy_price      NUMERIC(14,2),            -- NULL = use the product's buy price
  sell_price     NUMERIC(14,2),            -- NULL = use the product's sell price
  reorder_level  INT  NOT NULL DEFAULT 3,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, name)
);
CREATE INDEX IF NOT EXISTS idx_variants_user    ON public.product_variants(user_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own variants" ON public.product_variants;
CREATE POLICY "Users manage own variants" ON public.product_variants
  FOR ALL USING (user_id = auth.uid());

-- 2. Stock movement log — one row for every change in stock ──────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id     UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name   TEXT,                     -- copied so history survives deletes
  variant_name   TEXT,
  movement_type  TEXT NOT NULL
                 CHECK (movement_type IN ('sale','sale_edit','sale_delete','restock','adjustment','initial')),
  qty_change     INT  NOT NULL,            -- +5 added, -2 removed
  balance_after  INT,
  unit_cost      NUMERIC(14,2),
  reason         TEXT,
  ref_id         UUID,                     -- the sale this movement belongs to
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movements_user_date ON public.stock_movements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_product   ON public.stock_movements(product_id);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own movements" ON public.stock_movements;
CREATE POLICY "Users manage own movements" ON public.stock_movements
  FOR ALL USING (user_id = auth.uid());

-- 3. Per-product reorder level (default 3, same as the old fixed rule) ───────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reorder_level INT NOT NULL DEFAULT 3;

-- 4. Sale items remember the type sold and the buy price at the time of sale ─
--    (this is what makes real profit possible)
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS variant     TEXT,
  ADD COLUMN IF NOT EXISTS variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost   NUMERIC(14,2);

-- 5. Check — should return 4 rows ────────────────────────────────────────────
SELECT table_name, column_name
FROM information_schema.columns
WHERE (table_name = 'product_variants' AND column_name = 'stock')
   OR (table_name = 'stock_movements'  AND column_name = 'qty_change')
   OR (table_name = 'products'         AND column_name = 'reorder_level')
   OR (table_name = 'sale_items'       AND column_name = 'unit_cost');
