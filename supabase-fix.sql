-- ResellTrack — Database Fix Script
-- Run this in: Supabase Dashboard → SQL Editor
-- URL: https://app.supabase.com/project/devqrpcxaxjcxdixwitw/sql/new
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_daily_summary;
DROP VIEW IF EXISTS public.v_product_sales;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.lending CASCADE;
DROP TABLE IF EXISTS public.borrowing CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at CASCADE;

-- Products
CREATE TABLE public.products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku         TEXT,
  name        TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  buy_price   NUMERIC(14,2) NOT NULL DEFAULT 0,
  sell_price  NUMERIC(14,2) NOT NULL,
  stock       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_user ON public.products(user_id);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own products" ON public.products
  FOR ALL USING (user_id = auth.uid());

-- Sales
CREATE TABLE public.sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  contact         TEXT,
  sale_date       TIMESTAMPTZ NOT NULL,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','transfer')),
  status          TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid','Partial','Unpaid')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sales_user   ON public.sales(user_id);
CREATE INDEX idx_sales_date   ON public.sales(sale_date);
CREATE INDEX idx_sales_status ON public.sales(status);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sales" ON public.sales
  FOR ALL USING (user_id = auth.uid());

-- Sale items
CREATE TABLE public.sale_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  qty           INT NOT NULL DEFAULT 1,
  unit_price    NUMERIC(14,2) NOT NULL,
  subtotal      NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED
);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sale items" ON public.sale_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND s.user_id = auth.uid())
  );

-- Expenses
CREATE TABLE public.expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  category     TEXT,
  amount       NUMERIC(14,2) NOT NULL,
  expense_date DATE NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_user ON public.expenses(user_id);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expenses" ON public.expenses
  FOR ALL USING (user_id = auth.uid());

-- Lending
CREATE TABLE public.lending (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  contact     TEXT,
  amount      NUMERIC(14,2) NOT NULL,
  lend_date   TIMESTAMPTZ NOT NULL,
  due_date    DATE,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Settled')),
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','sale')),
  sale_id     UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lending_user ON public.lending(user_id);
ALTER TABLE public.lending ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lending" ON public.lending
  FOR ALL USING (user_id = auth.uid());

-- Borrowing
CREATE TABLE public.borrowing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  contact     TEXT,
  amount      NUMERIC(14,2) NOT NULL,
  borrow_date TIMESTAMPTZ NOT NULL,
  due_date    DATE,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Settled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_borrowing_user ON public.borrowing(user_id);
ALTER TABLE public.borrowing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own borrowing" ON public.borrowing
  FOR ALL USING (user_id = auth.uid());

-- Auto updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Report views
CREATE VIEW public.v_daily_summary WITH (security_invoker = true) AS
SELECT user_id, sale_date::date AS day,
  COUNT(DISTINCT id) AS total_sales,
  COALESCE(SUM(amount_paid),0) AS total_revenue,
  COALESCE(SUM(balance),0) AS total_uncollected
FROM public.sales GROUP BY user_id, sale_date::date;

CREATE VIEW public.v_product_sales WITH (security_invoker = true) AS
SELECT s.user_id, si.product_name, si.product_id,
  SUM(si.qty) AS total_qty, SUM(si.subtotal) AS total_revenue,
  COUNT(DISTINCT s.id) AS total_orders
FROM public.sale_items si JOIN public.sales s ON s.id = si.sale_id
GROUP BY s.user_id, si.product_name, si.product_id;

SELECT 'Database ready ✅' AS status;
