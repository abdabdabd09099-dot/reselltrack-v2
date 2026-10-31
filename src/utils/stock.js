// ─── stock.js ─────────────────────────────────────────────────────────────────
// The ONE place that changes stock. Sales, restocks, deletes and adjustments
// all go through applyStockChanges(), so that:
//   • a product's stock always equals the sum of its types (when it has types)
//   • every change is written to the stock movement log
//   • changes made offline are queued and applied when the phone reconnects
// The read helpers at the top are pure functions used by every page.
// ─────────────────────────────────────────────────────────────────────────────
import { apiProducts, apiStock } from './supabase.js'
import { saveOffline } from './offlineQueue.js'

export const MOVEMENT_LABELS = {
  sale:        'Sale',
  sale_edit:   'Sale edited',
  sale_delete: 'Sale deleted',
  restock:     'Restock',
  adjustment:  'Adjustment',
  initial:     'Opening stock',
}

export const ADJUST_REASONS = [
  'Damaged',
  'Lost / stolen',
  'Stock count correction',
  'Found extra',
  'Returned by customer',
  'Other',
]

// ── Read helpers (pure) ───────────────────────────────────────────────────────
export const variantsOf = (variants, productId) =>
  (variants || []).filter(v => v.productId === productId)

export const hasTypes = (variants, productId) =>
  (variants || []).some(v => v.productId === productId)

/** Units on hand: the sum of the types when the product has types. */
export const stockOf = (product, variants) => {
  if (!product) return 0
  const vs = variantsOf(variants, product.id)
  return vs.length ? vs.reduce((a, v) => a + v.stock, 0) : (product.stock || 0)
}

/** Buy / sell price for a product or one of its types (type price is optional). */
export const pricesFor = (product, variant) => ({
  buy:  variant && variant.buyPrice  != null ? variant.buyPrice  : (product?.buyPrice  || 0),
  sell: variant && variant.sellPrice != null ? variant.sellPrice : (product?.sellPrice || 0),
})

export const levelFor = (product, variant) =>
  variant ? variant.reorderLevel : (product?.reorderLevel ?? 3)

/** 'out' | 'low' | 'ok' */
export const statusOf = (stock, level) =>
  stock <= 0 ? 'out' : stock <= level ? 'low' : 'ok'

/** Status of a whole product: out if nothing is left, low if any type is low. */
export const productStatus = (product, variants) => {
  const vs = variantsOf(variants, product.id)
  if (!vs.length) return statusOf(product.stock || 0, levelFor(product))
  const total = vs.reduce((a, v) => a + v.stock, 0)
  if (total <= 0) return 'out'
  return vs.some(v => statusOf(v.stock, v.reorderLevel) !== 'ok') ? 'low' : 'ok'
}

/**
 * Everything that needs restocking, one row per product or per type:
 * [{ key, name, stock, level, status: 'low' | 'out' }]
 */
export const attentionList = (products, variants) => {
  const out = []
  for (const p of products || []) {
    const vs = variantsOf(variants, p.id)
    if (vs.length) {
      for (const v of vs) {
        const status = statusOf(v.stock, v.reorderLevel)
        if (status !== 'ok') out.push({ key: v.id, name: `${p.name} · ${v.name}`, stock: v.stock, level: v.reorderLevel, status })
      }
    } else {
      const status = statusOf(p.stock || 0, levelFor(p))
      if (status !== 'ok') out.push({ key: p.id, name: p.name, stock: p.stock || 0, level: levelFor(p), status })
    }
  }
  return out
}

/**
 * Net stock change when a sale's items are replaced (edit): the old items are
 * returned and the new items taken in one step, so history shows one line per item.
 */
export const netSaleChanges = (oldItems, newItems) => {
  const map = new Map()
  const add = (i, sign) => {
    if (!i.productId) return
    const k = `${i.productId}|${i.variantId || ''}`
    const cur = map.get(k) || { productId: i.productId, variantId: i.variantId || null, delta: 0 }
    cur.delta += sign * (Number(i.qty) || 0)
    map.set(k, cur)
  }
  ;(oldItems || []).forEach(i => add(i, +1))
  ;(newItems || []).forEach(i => add(i, -1))
  return [...map.values()].filter(c => c.delta !== 0)
}

// ── Write: apply a batch of stock changes ─────────────────────────────────────
/**
 * changes: [{ productId, variantId|null, delta, type, reason?, refId?, unitCost? }]
 * ctx:     { products, variants, userId, isDemo, offline, stockReady,
 *            setProducts, setVariants, setMovements }
 * returns: { movements, skipped }
 *   skipped = changes that could not be applied (e.g. the type no longer exists).
 *
 * All changes are applied to a working copy first, then written once, so two
 * items of the same product in one sale can never overwrite each other.
 */
export async function applyStockChanges(changes, ctx) {
  const { products, variants, userId, isDemo, offline, stockReady,
          setProducts, setVariants, setMovements } = ctx

  const pMap = new Map((products || []).map(p => [p.id, { ...p }]))
  const vMap = new Map((variants || []).map(v => [v.id, { ...v }]))
  const touchedP = new Set()
  const touchedV = new Set()
  const movements = []
  const queue     = []
  const skipped   = []
  const now       = new Date().toISOString()

  for (const c of changes || []) {
    const delta = Math.trunc(Number(c.delta) || 0)
    const p = pMap.get(c.productId)
    if (!p || delta === 0) continue

    const v = c.variantId ? vMap.get(c.variantId) : null
    const productHasTypes = [...vMap.values()].some(x => x.productId === p.id)
    // The type was deleted, or the product has types but this change names none
    if ((c.variantId && !v) || (!v && productHasTypes)) { skipped.push(c); continue }

    let balance, applied
    if (v) {
      const next = Math.max(0, v.stock + delta)
      applied = next - v.stock
      v.stock = next
      balance = next
      touchedV.add(v.id)
      p.stock = [...vMap.values()].filter(x => x.productId === p.id).reduce((a, x) => a + x.stock, 0)
    } else {
      const next = Math.max(0, (p.stock || 0) + delta)
      applied = next - (p.stock || 0)
      p.stock = next
      balance = next
    }
    touchedP.add(p.id)

    const row = {
      productId:   p.id,
      variantId:   v ? v.id : null,
      productName: p.name,
      variantName: v ? v.name : null,
      type:        c.type,
      qty:         applied,
      balanceAfter: balance,
      unitCost:    c.unitCost ?? null,
      reason:      c.reason || null,
      refId:       c.refId || null,
      createdAt:   now,
    }
    movements.push(row)
    queue.push(row)
  }

  if (!touchedP.size) return { movements: [], skipped }

  // ── Persist ─────────────────────────────────────────────────────────────────
  if (!isDemo) {
    if (offline) {
      // Saved on the phone; applied to the database when back online
      for (const q of queue) await saveOffline('stock', { ...q, delta: q.qty, userId })
    } else {
      for (const id of touchedV) await apiStock.setVariantStock(id, vMap.get(id).stock)
      for (const id of touchedP) await apiProducts.setStock(id, pMap.get(id).stock)
      if (stockReady) await apiStock.logMovements(movements, userId)
    }
  }

  // ── Update the screen ───────────────────────────────────────────────────────
  setProducts(ps => ps.map(p => touchedP.has(p.id) ? { ...p, stock: pMap.get(p.id).stock } : p))
  if (touchedV.size) {
    setVariants(vs => vs.map(v => touchedV.has(v.id) ? { ...v, stock: vMap.get(v.id).stock } : v))
  }
  pushMovements(setMovements, movements)

  return { movements, skipped }
}

/** Record history rows without changing any stock (opening stock, type conversions). */
export async function recordMovements(rows, ctx) {
  const { userId, isDemo, offline, stockReady, setMovements } = ctx
  const now = new Date().toISOString()
  const list = (rows || []).map(r => ({ ...r, createdAt: r.createdAt || now }))
  if (!list.length) return
  if (!isDemo && !offline && stockReady) await apiStock.logMovements(list, userId)
  pushMovements(setMovements, list)
}

function pushMovements(setMovements, rows) {
  if (!setMovements || !rows.length) return
  const stamp = Date.now()
  setMovements(ms => [
    ...rows.map((m, i) => ({ ...m, id: `local-${stamp}-${i}` })),
    ...(ms || []),
  ].slice(0, 500))
}
