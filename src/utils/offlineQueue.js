// ─── offlineQueue.js ──────────────────────────────────────────────────────────
// Offline-first data layer using IndexedDB.
// When offline: saves records locally with status='pending'
// When online:  auto-syncs pending records to Supabase
// Shows sync badge when pending records exist.
// ─────────────────────────────────────────────────────────────────────────────
import { sb, apiSales } from './supabase.js'

const DB_NAME    = 'reselltrack_offline'
const DB_VERSION = 2   // v2 adds the 'stock' store (queued stock changes)
const STORES     = ['sales', 'products', 'expenses', 'lending', 'borrowing', 'stock']

// ── Open IndexedDB ────────────────────────────────────────────────────────────
let _db = null
export const openDB = () => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) return reject(new Error('IndexedDB not supported'))
  if (_db) return resolve(_db)
  const req = indexedDB.open(DB_NAME, DB_VERSION)
  req.onupgradeneeded = e => {
    const db = e.target.result
    STORES.forEach(store => {
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store, { keyPath: 'local_id' })
      }
    })
  }
  req.onsuccess = e => { _db = e.target.result; resolve(_db) }
  req.onerror   = e => reject(e.target.error)
})

// ── Save a pending record locally ─────────────────────────────────────────────
export const saveOffline = async (store, record) => {
  const db    = await openDB()
  const entry = {
    ...record,
    local_id:   'local_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    sync_status: 'pending',
    created_offline_at: new Date().toISOString(),
  }
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).add(entry)
    req.onsuccess = () => resolve(entry)
    req.onerror   = e => reject(e.target.error)
  })
}

// ── Get all pending records for a store ───────────────────────────────────────
export const getPending = async (store) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(store, 'readonly')
    const req     = tx.objectStore(store).getAll()
    req.onsuccess = e => resolve(e.target.result.filter(r => r.sync_status === 'pending'))
    req.onerror   = e => reject(e.target.error)
  })
}

// ── Mark a local record as synced ─────────────────────────────────────────────
export const markSynced = async (store, local_id) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(store, 'readwrite')
    const objStore = tx.objectStore(store)
    const getReq  = objStore.get(local_id)
    getReq.onsuccess = e => {
      const record = e.target.result
      if (record) {
        record.sync_status = 'synced'
        const putReq = objStore.put(record)
        putReq.onsuccess = () => resolve()
        putReq.onerror   = e => reject(e.target.error)
      } else resolve()
    }
    getReq.onerror = e => reject(e.target.error)
  })
}

// ── Delete a local record ─────────────────────────────────────────────────────
export const deleteLocal = async (store, local_id) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(local_id)
    req.onsuccess = () => resolve()
    req.onerror   = e => reject(e.target.error)
  })
}

// ── Count all pending records ─────────────────────────────────────────────────
export const countPending = async () => {
  let total = 0
  for (const store of STORES) {
    const pending = await getPending(store)
    total += pending.length
  }
  return total
}

// ── Sync pending records to Supabase ─────────────────────────────────────────
// Returns { synced, failed } counts
export const syncToSupabase = async (userId, callbacks = {}) => {
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  let synced = 0, failed = 0

  // ── Sync sales ──────────────────────────────────────────────────────────────
  const pendingSales = await getPending('sales')
  for (const record of pendingSales) {
    try {
      const { local_id, sync_status, created_offline_at, items = [], ...sale } = record
      // Same code path as an online sale: keeps split payments, type and cost
      const saleRow = await apiSales.create({ ...sale, items }, userId)
      await markSynced('sales', local_id)
      synced++
      callbacks.onProgress?.('sale', saleRow.id)
    } catch { failed++ }
  }

  // ── Sync stock changes (made while offline) ─────────────────────────────────
  // Applied as +/- amounts on top of whatever the database holds now.
  const pendingStock = await getPending('stock')
  for (const record of pendingStock) {
    try {
      const { local_id, productId, variantId, delta = 0, type, reason, unitCost, productName, variantName } = record
      let balance
      if (variantId) {
        const { data: v, error: vErr } = await sb.from('product_variants').select('stock').eq('id', variantId).single()
        if (vErr) throw vErr
        balance = Math.max(0, (v.stock || 0) + delta)
        const { error: uErr } = await sb.from('product_variants').update({ stock: balance }).eq('id', variantId)
        if (uErr) throw uErr
        // A product with types always holds the total of its types
        const { data: all, error: aErr } = await sb.from('product_variants').select('stock').eq('product_id', productId)
        if (aErr) throw aErr
        const sum = (all || []).reduce((a, x) => a + (x.stock || 0), 0)
        const { error: pErr } = await sb.from('products').update({ stock: sum }).eq('id', productId)
        if (pErr) throw pErr
      } else {
        const { data: p, error: pErr } = await sb.from('products').select('stock').eq('id', productId).single()
        if (pErr) throw pErr
        balance = Math.max(0, (p.stock || 0) + delta)
        const { error: uErr } = await sb.from('products').update({ stock: balance }).eq('id', productId)
        if (uErr) throw uErr
      }
      // History is best-effort — never fail the sync because of it
      try {
        await sb.from('stock_movements').insert({
          user_id: userId, product_id: productId, variant_id: variantId || null,
          product_name: productName || null, variant_name: variantName || null,
          movement_type: type, qty_change: delta, balance_after: balance,
          unit_cost: unitCost ?? null, reason: reason || null,
          created_at: record.createdAt || new Date().toISOString(),
        })
      } catch { /* history table not created yet */ }
      await markSynced('stock', local_id)
      synced++
    } catch { failed++ }
  }

  // ── Sync products ───────────────────────────────────────────────────────────
  const pendingProducts = await getPending('products')
  for (const record of pendingProducts) {
    try {
      const { local_id, sync_status, created_offline_at, ...product } = record
      const { error } = await sb.from('products').insert({
        user_id:     userId,
        sku:         product.sku,
        name:        product.name,
        category:    product.category || null,
        description: product.description || null,
        buy_price:   product.buyPrice,
        sell_price:  product.sellPrice,
        stock:       product.stock,
      })
      if (error) throw error
      await markSynced('products', local_id)
      synced++
    } catch { failed++ }
  }

  // ── Sync expenses ───────────────────────────────────────────────────────────
  const pendingExpenses = await getPending('expenses')
  for (const record of pendingExpenses) {
    try {
      const { local_id, sync_status, created_offline_at, ...expense } = record
      const { error } = await sb.from('expenses').insert({
        user_id:      userId,
        description:  expense.description,
        category:     expense.category || null,
        amount:       expense.amount,
        expense_date: expense.date,
        notes:        expense.notes || null,
      })
      if (error) throw error
      await markSynced('expenses', local_id)
      synced++
    } catch { failed++ }
  }

  // ── Sync lending ────────────────────────────────────────────────────────────
  const pendingLending = await getPending('lending')
  for (const record of pendingLending) {
    try {
      const { local_id, sync_status, created_offline_at, ...lend } = record
      const { error } = await sb.from('lending').insert({
        user_id:     userId,
        person_name: lend.personName,
        contact:     lend.contact || null,
        amount:      lend.amount,
        lend_date:   lend.date,
        due_date:    lend.dueDate || null,
        notes:       lend.notes || null,
        status:      lend.status || 'Pending',
        source:      lend.source || 'manual',
        sale_id:     lend.saleId || null,
      })
      if (error) throw error
      await markSynced('lending', local_id)
      synced++
    } catch { failed++ }
  }

  callbacks.onComplete?.({ synced, failed })
  return { synced, failed }
}

// ── Listen for online event and auto-sync ─────────────────────────────────────
export const startAutoSync = (userId, onSync) => {
  let isSyncing = false
  const handler = async () => {
    if (!userId || isSyncing) return
    isSyncing = true
    try {
      const result = await syncToSupabase(userId)
      if (result.synced > 0) onSync?.(result)
    } finally {
      isSyncing = false
    }
  }
  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}
