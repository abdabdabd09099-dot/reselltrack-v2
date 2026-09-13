// ─── offlineQueue.js ──────────────────────────────────────────────────────────
// Offline-first data layer using IndexedDB.
// When offline: saves records locally with status='pending'
// When online:  auto-syncs pending records to Supabase
// Shows sync badge when pending records exist.
// ─────────────────────────────────────────────────────────────────────────────
import { sb } from './supabase.js'

const DB_NAME    = 'reselltrack_offline'
const DB_VERSION = 1
const STORES     = ['sales', 'products', 'expenses', 'lending', 'borrowing']

// ── Open IndexedDB ────────────────────────────────────────────────────────────
let _db = null
export const openDB = () => new Promise((resolve, reject) => {
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
      const { data: saleRow, error: sErr } = await sb.from('sales').insert({
        user_id:        userId,
        customer_name:  sale.customerName,
        contact:        sale.contact || null,
        sale_date:      sale.date,
        total_amount:   sale.totalAmount,
        amount_paid:    sale.amountPaid,
        balance:        sale.balance,
        payment_method: sale.paymentMethod,
        status:         sale.status,
        notes:          sale.notes || null,
      }).select().single()
      if (sErr) throw sErr
      if (items.length) {
        await sb.from('sale_items').insert(
          items.map(i => ({
            sale_id: saleRow.id, product_id: i.productId || null,
            product_name: i.productName, qty: i.qty, unit_price: i.unitPrice,
          }))
        )
      }
      await markSynced('sales', local_id)
      synced++
      callbacks.onProgress?.('sale', saleRow.id)
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
  const handler = async () => {
    if (!userId) return
    const result = await syncToSupabase(userId)
    if (result.synced > 0) onSync?.(result)
  }
  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}
