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
const safeStr = (v) => (v == null ? null : String(v).trim() || null)

// ── Products ──────────────────────────────────────────────────────────────────
export const apiProducts = {
  fetch: async () => {
    const { data, error } = await sb
      .from('products').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data.map(p => ({
      id: p.id, sku: p.sku, name: p.name,
      category: p.category, description: p.description,
      buyPrice:  safeNum(p.buy_price),
      sellPrice: safeNum(p.sell_price),
      stock:     safeNum(p.stock),
      createdAt: p.created_at,
    }))
  },

  create: async (p, userId) => {
    if (!userId) throw new Error('Not authenticated')
    const { data, error } = await sb.from('products').insert({
      user_id:     userId,
      sku:         safeStr(p.sku),
      name:        safeStr(p.name),
      category:    safeStr(p.category),
      description: safeStr(p.description),
      buy_price:   safeNum(p.buyPrice),
      sell_price:  safeNum(p.sellPrice, 0.01),
      stock:       safeNum(p.stock),
    }).select().single()
    if (error) throw error
    return {
      id: data.id, sku: data.sku, name: data.name,
      category: data.category, description: data.description,
      buyPrice:  safeNum(data.buy_price),
      sellPrice: safeNum(data.sell_price),
      stock:     safeNum(data.stock),
      createdAt: data.created_at,
    }
  },

  update: async (id, p) => {
    const { error } = await sb.from('products').update({
      name:        safeStr(p.name),
      category:    safeStr(p.category),
      description: safeStr(p.description),
      buy_price:   safeNum(p.buyPrice),
      sell_price:  safeNum(p.sellPrice, 0.01),
      stock:       safeNum(p.stock),
    }).eq('id', id)
    if (error) throw error
  },

  delete: async (id) => {
    const { error } = await sb.from('products').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export const apiSales = {
  fetch: async () => {
    const { data, error } = await sb
      .from('sales').select('*, sale_items(*)').order('sale_date', { ascending: false })
    if (error) throw error
    return data.map(s => ({
      id:            s.id,
      customerName:  s.customer_name,
      contact:       s.contact,
      date:          s.sale_date,
      totalAmount:   safeNum(s.total_amount),
      amountPaid:    safeNum(s.amount_paid),
      balance:       safeNum(s.balance),
      paymentMethod: s.payment_method,
      status:        s.status,
      notes:         s.notes,
      items: (s.sale_items || []).map(i => ({
        productId:   i.product_id,
        productName: i.product_name,
        qty:         safeNum(i.qty, 1),
        unitPrice:   safeNum(i.unit_price),
      })),
    }))
  },

  create: async (sale, userId) => {
    if (!userId) throw new Error('Not authenticated')
    // Validate status is an allowed value — prevent injection
    const VALID_STATUS   = ['Paid', 'Partial', 'Unpaid']
    const VALID_METHODS  = ['cash', 'transfer']
    const status         = VALID_STATUS.includes(sale.status)  ? sale.status         : 'Unpaid'
    const paymentMethod  = VALID_METHODS.includes(sale.paymentMethod) ? sale.paymentMethod : 'cash'

    const { data: saleRow, error: sErr } = await sb.from('sales').insert({
      user_id:        userId,
      customer_name:  safeStr(sale.customerName),
      contact:        safeStr(sale.contact),
      sale_date:      sale.date,
      total_amount:   safeNum(sale.totalAmount),
      amount_paid:    safeNum(sale.amountPaid),
      balance:        safeNum(sale.balance),
      payment_method: paymentMethod,
      status,
      notes:          safeStr(sale.notes),
    }).select().single()
    if (sErr) throw sErr

    const items = sale.items.map(i => ({
      sale_id:      saleRow.id,
      product_id:   i.productId   || null,
      product_name: safeStr(i.productName),
      qty:          safeNum(i.qty, 1),
      unit_price:   safeNum(i.unitPrice),
    }))
    const { error: iErr } = await sb.from('sale_items').insert(items)
    if (iErr) throw iErr
    return saleRow
  },

  markPaid: async (id) => {
    const { data: s, error: sErr } = await sb
      .from('sales').select('total_amount').eq('id', id).single()
    if (sErr) throw sErr
    const { error } = await sb.from('sales').update({
      status: 'Paid', balance: 0, amount_paid: s.total_amount,
    }).eq('id', id)
    if (error) throw error
  },
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export const apiExpenses = {
  fetch: async () => {
    const { data, error } = await sb
      .from('expenses').select('*').order('expense_date', { ascending: false })
    if (error) throw error
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
    if (error) throw error
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
    if (error) throw error
  },
}

// ── Lending ───────────────────────────────────────────────────────────────────
export const apiLending = {
  fetch: async () => {
    const { data, error } = await sb
      .from('lending').select('*').order('lend_date', { ascending: false })
    if (error) throw error
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
    if (error) throw error
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
    if (error) throw error
  },

  settleBySale: async (saleId) => {
    const { error } = await sb.from('lending').update({ status: 'Settled' }).eq('sale_id', saleId)
    if (error) throw error
  },

  delete: async (id) => {
    const { error } = await sb.from('lending').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Borrowing ─────────────────────────────────────────────────────────────────
export const apiBorrowing = {
  fetch: async () => {
    const { data, error } = await sb
      .from('borrowing').select('*').order('borrow_date', { ascending: false })
    if (error) throw error
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
    if (error) throw error
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
    if (error) throw error
  },

  delete: async (id) => {
    const { error } = await sb.from('borrowing').delete().eq('id', id)
    if (error) throw error
  },
}
