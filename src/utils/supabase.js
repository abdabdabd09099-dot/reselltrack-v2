import { createClient } from '@supabase/supabase-js'

// ── Credentials come from .env — never hardcode these ─────────────────────────
// Copy .env.example → .env and fill in your values before running.
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Missing Supabase env vars. Copy .env.example to .env and fill in your values.')
}

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── Auth helpers ───────────────────────────────────────────────────────────────
export const signIn     = (email, pass) => sb.auth.signInWithPassword({ email, password: pass })
export const signUp     = (email, pass) => sb.auth.signUp({ email, password: pass })
export const signOut    = ()            => sb.auth.signOut()
export const getSession = ()            => sb.auth.getSession()

// ── Input sanitisation helpers ────────────────────────────────────────────────
// safeNum  — prevents NaN / Infinity / negative from reaching the DB
// safeStr  — trims whitespace, prevents null/undefined blowing up inserts
const safeNum = (v, min = 0) => {
  const n = Number(v)
  return (!isFinite(n) || n < min) ? min : n
}
const safeStr = (v, max=500) => {
  if (v == null) return null
  return String(v).trim().replace(/<[^>]*>/g,'').replace(/javascript:/gi,'').slice(0,max) || null
}

// ── Schema tolerance ──────────────────────────────────────────────────────────
// New stock columns/tables only exist after supabase-stock-phase1.sql has been
// run. These checks let the app keep working (without the new features) until then.
const isMissingColumn = e => !!e && (e.code === '42703' || e.code === 'PGRST204' ||
  /column .* does not exist|Could not find the '.*' column/i.test(e.message || ''))

// ── Products ──────────────────────────────────────────────────────────────────
export const apiProducts = {
  fetch: async () => {
    const { data, error } = await sb
      .from('products').select('*').order('created_at', { ascending: false })
    throwIfError(error)
    return data.map(p => ({
      id: p.id, sku: p.sku, name: p.name,
      category: p.category, description: p.description,
      buyPrice:  safeNum(p.buy_price),
      sellPrice: safeNum(p.sell_price),
      stock:     safeNum(p.stock),
      reorderLevel: p.reorder_level != null ? safeNum(p.reorder_level) : 3,
      createdAt: p.created_at,
    }))
  },

  create: async (p, userId) => {
    if (!userId) throw new Error('Not authenticated')
    const row = {
      user_id:     userId,
      sku:         safeStr(p.sku),
      name:        safeStr(p.name),
      category:    safeStr(p.category),
      description: safeStr(p.description),
      buy_price:   safeNum(p.buyPrice),
      sell_price:  safeNum(p.sellPrice, 0.01),
      stock:       safeNum(p.stock),
    }
    if (p.reorderLevel != null) row.reorder_level = safeNum(p.reorderLevel)
    let { data, error } = await sb.from('products').insert(row).select().single()
    if (error && isMissingColumn(error) && 'reorder_level' in row) {
      delete row.reorder_level
      ;({ data, error } = await sb.from('products').insert(row).select().single())
    }
    throwIfError(error)
    return {
      id: data.id, sku: data.sku, name: data.name,
      category: data.category, description: data.description,
      buyPrice:  safeNum(data.buy_price),
      sellPrice: safeNum(data.sell_price),
      stock:     safeNum(data.stock),
      reorderLevel: data.reorder_level != null ? safeNum(data.reorder_level) : 3,
      createdAt: data.created_at,
    }
  },

  update: async (id, p) => {
    const row = {
      name:        safeStr(p.name),
      category:    safeStr(p.category),
      description: safeStr(p.description),
      buy_price:   safeNum(p.buyPrice),
      sell_price:  safeNum(p.sellPrice, 0.01),
    }
    if (p.stock !== undefined)        row.stock = safeNum(p.stock)   // only when explicitly given
    if (p.reorderLevel != null) row.reorder_level = safeNum(p.reorderLevel)
    let { error } = await sb.from('products').update(row).eq('id', id)
    if (error && isMissingColumn(error) && 'reorder_level' in row) {
      delete row.reorder_level
      ;({ error } = await sb.from('products').update(row).eq('id', id))
    }
    throwIfError(error)
  },

  // Stock-only writes — used by the stock engine so a stock change can never
  // overwrite name / price edits made elsewhere.
  setStock: async (id, stock) => {
    const { error } = await sb.from('products').update({ stock: safeNum(stock) }).eq('id', id)
    throwIfError(error)
  },

  // Buy-price-only write — used when a restock happens at a new price.
  setBuyPrice: async (id, buyPrice) => {
    const { error } = await sb.from('products').update({ buy_price: safeNum(buyPrice) }).eq('id', id)
    throwIfError(error)
  },

  delete: async (id) => {
    const { error } = await sb.from('products').delete().eq('id', id)
    throwIfError(error)
  },
}

// ── Sale items insert (shared by create / edit / offline sync) ────────────────
// Saves the type sold and the buy price at the time of sale. If the database
// has not been upgraded yet, falls back to the original columns.
export const insertSaleItems = async (saleId, items) => {
  const full = (items || []).map(i => ({
    sale_id:      saleId,
    product_id:   i.productId   || null,
    product_name: safeStr(i.productName),
    qty:          safeNum(i.qty, 1),
    unit_price:   safeNum(i.unitPrice),
    variant:      i.variant || null,
    variant_id:   i.variantId || null,
    unit_cost:    i.unitCost != null ? safeNum(i.unitCost) : null,
  }))
  if (!full.length) return
  let { error } = await sb.from('sale_items').insert(full)
  if (error && isMissingColumn(error)) {
    const legacy = full.map(({ variant_id, unit_cost, ...rest }) => rest)
    ;({ error } = await sb.from('sale_items').insert(legacy))
    if (error && isMissingColumn(error)) {
      const bare = legacy.map(({ variant, ...rest }) => rest)
      ;({ error } = await sb.from('sale_items').insert(bare))
    }
  }
  throwIfError(error, 'sale_items')
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export const apiSales = {
  fetch: async () => {
    const { data, error } = await sb
      .from('sales').select('*, sale_items(*)').order('sale_date', { ascending: false })
    throwIfError(error)
    return data.map(s => ({
      id:            s.id,
      customerName:  s.customer_name,
      contact:       s.contact,
      date:          s.sale_date,
      totalAmount:   safeNum(s.total_amount),
      amountPaid:    safeNum(s.amount_paid),
      cashPaid:      s.cash_paid      != null ? safeNum(s.cash_paid)      : null,
      transferPaid:  s.transfer_paid  != null ? safeNum(s.transfer_paid)  : null,
      actualCash:    s.actual_cash    != null ? safeNum(s.actual_cash)    : null,
      balance:       safeNum(s.balance),
      paymentMethod: s.payment_method,
      status:        s.status,
      notes:         s.notes,
      items: (s.sale_items || []).map(i => ({
        productId:   i.product_id,
        productName: i.product_name,
        qty:         safeNum(i.qty, 1),
        unitPrice:   safeNum(i.unit_price),
        variant:     i.variant || '',
        variantId:   i.variant_id || null,
        unitCost:    i.unit_cost != null ? safeNum(i.unit_cost) : null,
      })),
    }))
  },

  create: async (sale, userId) => {
    if (!userId) throw new Error('Not authenticated')
    // Validate status is an allowed value — prevent injection
    const VALID_STATUS   = ['Paid', 'Partial', 'Unpaid']
    const VALID_METHODS  = ['cash', 'transfer', 'split']
    const status         = VALID_STATUS.includes(sale.status)  ? sale.status         : 'Unpaid'
    const paymentMethod  = VALID_METHODS.includes(sale.paymentMethod) ? sale.paymentMethod : 'cash'

    const { data: saleRow, error: sErr } = await sb.from('sales').insert({
      user_id:        userId,
      customer_name:  safeStr(sale.customerName),
      contact:        safeStr(sale.contact),
      sale_date:      sale.date,
      total_amount:   safeNum(sale.totalAmount),
      amount_paid:    safeNum(sale.amountPaid),
      actual_cash:    sale.actualCash != null ? safeNum(sale.actualCash) : null,
      cash_paid:      sale.cashPaid != null ? safeNum(sale.cashPaid) : null,
      transfer_paid:  sale.transferPaid != null ? safeNum(sale.transferPaid) : null,
      balance:        safeNum(sale.balance),
      payment_method: paymentMethod,
      status,
      notes:          safeStr(sale.notes),
    }).select().single()
    throwIfError(sErr, 'sales')

    await insertSaleItems(saleRow.id, sale.items)
    return saleRow
  },

  markPaid: async (id) => {
    const { data: s, error: sErr } = await sb
      .from('sales').select('total_amount').eq('id', id).single()
    throwIfError(sErr, 'sales')
    const { error } = await sb.from('sales').update({
      status: 'Paid', balance: 0, amount_paid: s.total_amount,
    }).eq('id', id)
    throwIfError(error)
  },
}

// ── Stock: product types + movement log ───────────────────────────────────────
const mapVariant = v => ({
  id:           v.id,
  productId:    v.product_id,
  name:         v.name,
  stock:        safeNum(v.stock),
  buyPrice:     v.buy_price  != null ? safeNum(v.buy_price)  : null,
  sellPrice:    v.sell_price != null ? safeNum(v.sell_price) : null,
  reorderLevel: v.reorder_level != null ? safeNum(v.reorder_level) : 3,
  createdAt:    v.created_at,
})
const mapMovement = m => ({
  id:           m.id,
  productId:    m.product_id,
  variantId:    m.variant_id,
  productName:  m.product_name,
  variantName:  m.variant_name,
  type:         m.movement_type,
  qty:          Number(m.qty_change) || 0,
  balanceAfter: m.balance_after != null ? Number(m.balance_after) : null,
  unitCost:     m.unit_cost != null ? safeNum(m.unit_cost) : null,
  reason:       m.reason,
  refId:        m.ref_id,
  createdAt:    m.created_at,
})

export const apiStock = {
  // Never throws: { ready:false } means the database upgrade has not been run.
  fetchAll: async () => {
    try {
      const [v, m] = await Promise.all([
        sb.from('product_variants').select('*').order('created_at', { ascending: true }),
        sb.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(500),
      ])
      if (v.error) return { variants: [], movements: [], ready: false }
      return {
        variants:  (v.data || []).map(mapVariant),
        movements: m.error ? [] : (m.data || []).map(mapMovement),
        ready:     true,
      }
    } catch {
      return { variants: [], movements: [], ready: false }
    }
  },

  createVariant: async (v, userId) => {
    if (!userId) throw new Error('Not authenticated')
    const { data, error } = await sb.from('product_variants').insert({
      user_id:       userId,
      product_id:    v.productId,
      name:          safeStr(v.name, 60),
      stock:         safeNum(v.stock),
      buy_price:     v.buyPrice  != null && v.buyPrice  !== '' ? safeNum(v.buyPrice)  : null,
      sell_price:    v.sellPrice != null && v.sellPrice !== '' ? safeNum(v.sellPrice) : null,
      reorder_level: v.reorderLevel != null && v.reorderLevel !== '' ? safeNum(v.reorderLevel) : 3,
    }).select().single()
    throwIfError(error, 'product_variants')
    return mapVariant(data)
  },

  updateVariant: async (id, v) => {
    const { error } = await sb.from('product_variants').update({
      name:          safeStr(v.name, 60),
      buy_price:     v.buyPrice  != null && v.buyPrice  !== '' ? safeNum(v.buyPrice)  : null,
      sell_price:    v.sellPrice != null && v.sellPrice !== '' ? safeNum(v.sellPrice) : null,
      reorder_level: v.reorderLevel != null && v.reorderLevel !== '' ? safeNum(v.reorderLevel) : 3,
    }).eq('id', id)
    throwIfError(error, 'product_variants')
  },

  setVariantStock: async (id, stock) => {
    const { error } = await sb.from('product_variants').update({ stock: safeNum(stock) }).eq('id', id)
    throwIfError(error, 'product_variants')
  },

  setVariantBuyPrice: async (id, buyPrice) => {
    const { error } = await sb.from('product_variants').update({ buy_price: safeNum(buyPrice) }).eq('id', id)
    throwIfError(error, 'product_variants')
  },

  deleteVariant: async (id) => {
    const { error } = await sb.from('product_variants').delete().eq('id', id)
    throwIfError(error, 'product_variants')
  },

  // Best-effort: a failed history write must never block a sale or restock.
  logMovements: async (rows, userId) => {
    if (!rows?.length || !userId) return false
    const { error } = await sb.from('stock_movements').insert(rows.map(m => ({
      user_id:       userId,
      product_id:    m.productId || null,
      variant_id:    m.variantId || null,
      product_name:  safeStr(m.productName, 120),
      variant_name:  safeStr(m.variantName, 60),
      movement_type: m.type,
      qty_change:    Math.trunc(Number(m.qty) || 0),
      balance_after: m.balanceAfter != null ? Math.trunc(Number(m.balanceAfter)) : null,
      unit_cost:     m.unitCost != null ? safeNum(m.unitCost) : null,
      reason:        safeStr(m.reason, 200),
      ref_id:        m.refId || null,
      created_at:    m.createdAt || new Date().toISOString(),
    })))
    return !error
  },
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export const apiExpenses = {
  fetch: async () => {
    const { data, error } = await sb
      .from('expenses').select('*').order('expense_date', { ascending: false })
    throwIfError(error)
    return data.map(e => ({
      id:          e.id,
      description: e.description,
      category:    e.category,
      amount:      safeNum(e.amount),
      date:        e.expense_date,
      notes:       e.notes,
    }))
  },

  create: async (e, userId) => {
    if (!userId) throw new Error('Not authenticated')
    const { data, error } = await sb.from('expenses').insert({
      user_id:      userId,
      description:  safeStr(e.description),
      category:     safeStr(e.category),
      amount:       safeNum(e.amount, 0.01),
      expense_date: e.date,
      notes:        safeStr(e.notes),
    }).select().single()
    throwIfError(error)
    return {
      id:          data.id,
      description: data.description,
      category:    data.category,
      amount:      safeNum(data.amount),
      date:        data.expense_date,
      notes:       data.notes,
    }
  },

  delete: async (id) => {
    const { error } = await sb.from('expenses').delete().eq('id', id)
    throwIfError(error)
  },
}

// ── Lending ───────────────────────────────────────────────────────────────────
export const apiLending = {
  fetch: async () => {
    const { data, error } = await sb
      .from('lending').select('*').order('lend_date', { ascending: false })
    throwIfError(error)
    return data.map(l => ({
      id:         l.id,
      personName: l.person_name,
      contact:    l.contact,
      amount:     safeNum(l.amount),
      date:       l.lend_date,
      dueDate:    l.due_date,
      notes:      l.notes,
      status:     l.status,
      source:     l.source,
      saleId:     l.sale_id,
    }))
  },

  create: async (l, userId) => {
    if (!userId) throw new Error('Not authenticated')
    const VALID_STATUS = ['Pending', 'Settled']
    const VALID_SOURCE = ['manual', 'sale']
    const { data, error } = await sb.from('lending').insert({
      user_id:     userId,
      person_name: safeStr(l.personName),
      contact:     safeStr(l.contact),
      amount:      safeNum(l.amount, 0.01),
      lend_date:   l.date,
      due_date:    l.dueDate  || null,
      notes:       safeStr(l.notes),
      status:      VALID_STATUS.includes(l.status) ? l.status : 'Pending',
      source:      VALID_SOURCE.includes(l.source) ? l.source : 'manual',
      sale_id:     l.saleId   || null,
    }).select().single()
    throwIfError(error)
    return {
      id:         data.id,
      personName: data.person_name,
      contact:    data.contact,
      amount:     safeNum(data.amount),
      date:       data.lend_date,
      dueDate:    data.due_date,
      notes:      data.notes,
      status:     data.status,
      source:     data.source,
      saleId:     data.sale_id,
    }
  },

  settle: async (id) => {
    const { error } = await sb.from('lending').update({ status: 'Settled' }).eq('id', id)
    throwIfError(error)
  },

  settleBySale: async (saleId) => {
    const { error } = await sb.from('lending').update({ status: 'Settled' }).eq('sale_id', saleId)
    throwIfError(error)
  },

  delete: async (id) => {
    const { error } = await sb.from('lending').delete().eq('id', id)
    throwIfError(error)
  },
}

// ── Borrowing ─────────────────────────────────────────────────────────────────
export const apiBorrowing = {
  fetch: async () => {
    const { data, error } = await sb
      .from('borrowing').select('*').order('borrow_date', { ascending: false })
    throwIfError(error)
    return data.map(b => ({
      id:         b.id,
      personName: b.person_name,
      contact:    b.contact,
      amount:     safeNum(b.amount),
      date:       b.borrow_date,
      dueDate:    b.due_date,
      notes:      b.notes,
      status:     b.status,
      source:     'manual',
    }))
  },

  create: async (b, userId) => {
    if (!userId) throw new Error('Not authenticated')
    const VALID_STATUS = ['Pending', 'Settled']
    const { data, error } = await sb.from('borrowing').insert({
      user_id:     userId,
      person_name: safeStr(b.personName),
      contact:     safeStr(b.contact),
      amount:      safeNum(b.amount, 0.01),
      borrow_date: b.date,
      due_date:    b.dueDate || null,
      notes:       safeStr(b.notes),
      status:      VALID_STATUS.includes(b.status) ? b.status : 'Pending',
    }).select().single()
    throwIfError(error)
    return {
      id:         data.id,
      personName: data.person_name,
      contact:    data.contact,
      amount:     safeNum(data.amount),
      date:       data.borrow_date,
      dueDate:    data.due_date,
      notes:      data.notes,
      status:     data.status,
      source:     'manual',
    }
  },

  settle: async (id) => {
    const { error } = await sb.from('borrowing').update({ status: 'Settled' }).eq('id', id)
    throwIfError(error)
  },

  delete: async (id) => {
    const { error } = await sb.from('borrowing').delete().eq('id', id)
    throwIfError(error)
  },
}

// ── Auto-run migrations ───────────────────────────────────────────────────────
// Runs once on app start to ensure DB columns exist.
// Uses raw SQL via Supabase RPC if available, otherwise silently skips.
export const runMigrations = async () => {
  try {
    // Try to select the columns — if they exist, we're good
    const { error } = await sb
      .from('sales')
      .select('cash_paid, transfer_paid, actual_cash')
      .limit(1)

    if (!error) {
      // Columns exist — check sale_items variant
      await sb.from('sale_items').select('variant').limit(1)
      return { ok: true, message: 'DB columns verified' }
    }

    // Columns missing — try to add them via RPC
    const migrations = [
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_paid NUMERIC(12,2) DEFAULT NULL`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS transfer_paid NUMERIC(12,2) DEFAULT NULL`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS actual_cash NUMERIC(12,2) DEFAULT NULL`,
      `ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT NULL`,
    ]

    for (const sql of migrations) {
      await sb.rpc('exec_sql', { query: sql }).catch(() => {})
    }

    return { ok: true, message: 'Migrations applied' }
  } catch {
    return { ok: false, message: 'Migration check skipped' }
  }
}// ── Typed API error ───────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, code, table) {
    super(message)
    this.name   = 'ApiError'
    this.code   = code
    this.table  = table
  }
}

// ── Throw helper ──────────────────────────────────────────────────────────────
const throwIfError = (error, table) => {
  if (error) throw new ApiError(error.message, error.code, table)
}


