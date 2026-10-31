// ─── Products.jsx ─────────────────────────────────────────────────────────────
// Product catalog + stock management:
//   • products with optional TYPES (sizes / colours), each with its own stock
//   • "Stock" screen: adjust stock (damage, loss, correction), manage types
//   • reorder level per product / type
//   • stock history (every sale, restock, adjustment)
// Stock is never typed in directly after a product exists — it changes through
// utils/stock.js so every change is logged.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { apiProducts, apiStock } from '../utils/supabase.js'
import { GRN, RED, AMB, BLU, PUR } from '../data/constants.js'
import { fmtDT } from '../utils/helpers.js'
import { Badge, Btn, Modal, Field, Stat, Tbl } from '../components/UI.jsx'
import { toast } from '../utils/toast.jsx'
import {
  applyStockChanges, recordMovements, variantsOf, hasTypes, stockOf, pricesFor,
  productStatus, statusOf, MOVEMENT_LABELS, ADJUST_REASONS,
} from '../utils/stock.js'

const Lbl = Field
const toNum    = v => (v === '' || v == null ? null : Number(v))
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine

const MOVE_COLOR = { sale: BLU, sale_edit: BLU, sale_delete: PUR, restock: GRN, adjustment: AMB, initial: GRN }

// ── Stock history table (used on the page and inside the Stock screen) ────────
const MovementTable = ({ rows, T }) => (
  <Tbl T={T} empty="No stock movements yet."
    cols={['When', 'Item', 'Change', 'Balance', 'Reason']}
    rows={rows.map(m => [
      <span style={{ fontSize: 11, color: T.textSecondary, whiteSpace: 'nowrap' }}>{fmtDT(m.createdAt)}</span>,
      <div>
        <div style={{ fontWeight: 500, color: T.textPrimary, fontSize: 12 }}>{m.productName || '—'}</div>
        {m.variantName && <div style={{ fontSize: 11, color: T.textSecondary }}>{m.variantName}</div>}
      </div>,
      <span className="mono" style={{ fontWeight: 700, color: m.qty >= 0 ? GRN : RED }}>{m.qty >= 0 ? '+' : ''}{m.qty}</span>,
      <span className="mono" style={{ color: T.textSecondary }}>{m.balanceAfter ?? '—'}</span>,
      <div>
        <Badge color={MOVE_COLOR[m.type] || BLU}>{MOVEMENT_LABELS[m.type] || m.type}</Badge>
        {m.reason && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{m.reason}</div>}
      </div>,
    ])}
  />
)

export default function Products({
  products, setProducts, variants, setVariants, movements, setMovements, stockReady,
  userId, T, L, cur, isDemo, demoApi, onDemoLimit,
}) {
  // ── Product add / edit ─────────────────────────────────────────────────────
  const [show,   setShow]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [srch,   setSrch]   = useState('')

  const blank = { name: '', category: '', buyPrice: '', sellPrice: '', stock: '', description: '', reorderLevel: '3' }
  const [form, setForm] = useState(blank)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Stock screen (types) ───────────────────────────────────────────────────
  const [stockPid, setStockPid] = useState(null)
  const blankType = { id: null, name: '', stock: '', buyPrice: '', sellPrice: '', reorderLevel: '3' }
  const [typeForm, setTypeForm] = useState(null)               // null = closed
  const stf = (k, v) => setTypeForm(f => ({ ...f, [k]: v }))

  // ── Adjust stock ───────────────────────────────────────────────────────────
  const [adjust, setAdjust] = useState(null)                   // null = closed
  const af = (k, v) => setAdjust(a => ({ ...a, [k]: v }))

  // ── History filter ─────────────────────────────────────────────────────────
  const [histPid,   setHistPid]   = useState('')
  const [histLimit, setHistLimit] = useState(15)

  const stockCtx = () => ({
    products, variants, userId, isDemo, stockReady,
    offline: !isOnline(),
    setProducts, setVariants, setMovements,
  })
  const stockPrd = products.find(p => p.id === stockPid) || null

  // ── Open add / edit modal ──────────────────────────────────────────────────
  const openAdd  = () => { setEditId(null); setForm(blank); setShow(true) }
  const openEdit = p  => {
    setEditId(p.id)
    setForm({
      name: p.name, category: p.category || '', buyPrice: p.buyPrice, sellPrice: p.sellPrice,
      stock: stockOf(p, variants), description: p.description || '',
      reorderLevel: String(p.reorderLevel ?? 3),
    })
    setShow(true)
  }

  // ── Save product (create or update) ────────────────────────────────────────
  const saveProd = async () => {
    if (!form.name || !form.sellPrice) return toast.error('Product name and sell price are required.')
    if (!isDemo && !isOnline()) return toast.error('Go online to add or edit products.')
    setSaving(true)
    try {
      const payload = {
        name: form.name, category: form.category, description: form.description,
        buyPrice: +form.buyPrice || 0, sellPrice: +form.sellPrice,
        reorderLevel: Math.max(0, Math.trunc(+form.reorderLevel || 0)),
      }
      if (editId) {
        // Stock is deliberately NOT part of an edit — use Stock → Adjust
        isDemo ? demoApi.products.update(editId, payload) : await apiProducts.update(editId, payload)
        setProducts(ps => ps.map(p => p.id === editId ? { ...p, ...payload } : p))
        toast.success('Product updated.')
      } else {
        const opening = Math.max(0, Math.trunc(+form.stock || 0))
        const sku     = 'RSL-' + String(products.length + 1).padStart(4, '0')
        const data    = { ...payload, stock: opening, sku }
        const created = isDemo ? demoApi.products.create(data) : await apiProducts.create(data, userId)
        if (!created) { onDemoLimit?.(); setSaving(false); return }
        setProducts(ps => [created, ...ps])
        if (opening > 0) {
          await recordMovements([{
            productId: created.id, productName: created.name, variantId: null, variantName: null,
            type: 'initial', qty: opening, balanceAfter: opening, unitCost: payload.buyPrice, reason: 'Opening stock',
          }], stockCtx())
        }
        toast.success('Product added.')
      }
      setShow(false)
    } catch (e) { toast.error('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Delete product ─────────────────────────────────────────────────────────
  const delProd = async id => {
    const ok = await toast.confirm('Delete this product and all its types?')
    if (!ok) return
    try {
      isDemo ? demoApi.products.delete(id) : await apiProducts.delete(id)
      setProducts(ps => ps.filter(p => p.id !== id))
      setVariants(vs => vs.filter(v => v.productId !== id))
    } catch (e) { toast.error('Delete failed: ' + e.message) }
  }

  // ── Types: add / edit ──────────────────────────────────────────────────────
  const saveType = async () => {
    const product = stockPrd
    if (!product || !typeForm) return
    const name = typeForm.name.trim()
    if (!name) return toast.error('Type name is required (for example "Red" or "42").')
    const siblings = variantsOf(variants, product.id)
    if (siblings.some(v => v.name.toLowerCase() === name.toLowerCase() && v.id !== typeForm.id)) {
      return toast.error(`"${name}" already exists for this product.`)
    }
    if (!isDemo && !isOnline()) return toast.error('Go online to change types.')
    if (!isDemo && !stockReady) return toast.error('Run the one-time database setup first (see the notice on this page).')

    setSaving(true)
    try {
      const fields = {
        name,
        buyPrice:     toNum(typeForm.buyPrice),
        sellPrice:    toNum(typeForm.sellPrice),
        reorderLevel: Math.max(0, Math.trunc(+typeForm.reorderLevel || 0)),
      }
      if (typeForm.id) {
        // Edit name / prices / reorder level — stock changes only through Adjust
        if (!isDemo) await apiStock.updateVariant(typeForm.id, fields)
        setVariants(vs => vs.map(v => v.id === typeForm.id ? { ...v, ...fields } : v))
        toast.success('Type updated.')
      } else {
        const opening = Math.max(0, Math.trunc(+typeForm.stock || 0))
        const data    = { productId: product.id, ...fields, stock: opening }
        const created = isDemo
          ? { id: 'demo-v-' + Date.now(), createdAt: new Date().toISOString(), ...data }
          : await apiStock.createVariant(data, userId)

        const wasPlain = !hasTypes(variants, product.id)
        const newTotal = siblings.reduce((a, v) => a + v.stock, 0) + created.stock
        if (!isDemo) await apiProducts.setStock(product.id, newTotal)
        setVariants(vs => [...vs, created])
        setProducts(ps => ps.map(p => p.id === product.id ? { ...p, stock: newTotal } : p))

        const rows = []
        if (wasPlain && product.stock > 0) {
          rows.push({ productId: product.id, productName: product.name, variantId: null, variantName: null,
            type: 'adjustment', qty: -product.stock, balanceAfter: 0, reason: 'Moved into types' })
        }
        if (created.stock > 0) {
          rows.push({ productId: product.id, productName: product.name, variantId: created.id, variantName: created.name,
            type: 'initial', qty: created.stock, balanceAfter: created.stock,
            unitCost: pricesFor(product, created).buy, reason: 'Opening stock' })
        }
        await recordMovements(rows, stockCtx())
        toast.success(`Type "${name}" added.`)
      }
      setTypeForm(null)
    } catch (e) { toast.error('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Types: remove ──────────────────────────────────────────────────────────
  const removeType = async v => {
    const product = products.find(p => p.id === v.productId)
    if (!product) return
    if (!isDemo && !isOnline()) return toast.error('Go online to change types.')
    const ok = await toast.confirm(`Remove type "${v.name}"${v.stock > 0 ? ` and its ${v.stock} units` : ''}?`)
    if (!ok) return
    try {
      const remaining = variantsOf(variants, v.productId).filter(x => x.id !== v.id)
      const newTotal  = remaining.reduce((a, x) => a + x.stock, 0)
      if (!isDemo) {
        await apiStock.deleteVariant(v.id)
        await apiProducts.setStock(product.id, newTotal)
      }
      setVariants(vs => vs.filter(x => x.id !== v.id))
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, stock: newTotal } : p))
      if (v.stock > 0) {
        await recordMovements([{
          productId: product.id, productName: product.name, variantId: null, variantName: v.name,
          type: 'adjustment', qty: -v.stock, balanceAfter: 0, reason: 'Type removed',
        }], stockCtx())
      }
      toast.success(`Type "${v.name}" removed.`)
    } catch (e) { toast.error('Remove failed: ' + e.message) }
  }

  // ── Adjust stock ───────────────────────────────────────────────────────────
  const openAdjust = (product, variant) => setAdjust({
    productId: product.id, variantId: variant ? variant.id : null,
    dir: 'remove', qty: '', reason: ADJUST_REASONS[0], note: '',
  })
  const pickReason = reason => {
    // Sensible default direction; the user can still flip it
    const add = reason === 'Found extra' || reason === 'Returned by customer'
    const rem = reason === 'Damaged' || reason === 'Lost / stolen'
    setAdjust(a => ({ ...a, reason, dir: add ? 'add' : rem ? 'remove' : a.dir }))
  }
  const adjTarget = adjust ? {
    product: products.find(p => p.id === adjust.productId),
    variant: adjust.variantId ? variants.find(v => v.id === adjust.variantId) : null,
  } : null
  const adjCurrent = adjTarget?.product
    ? (adjTarget.variant ? adjTarget.variant.stock : adjTarget.product.stock)
    : 0

  const saveAdjust = async () => {
    if (!adjust || !adjTarget?.product) return
    const qty = Math.trunc(+adjust.qty || 0)
    if (qty <= 0) return toast.error('Enter how many units (1 or more).')
    if (adjust.dir === 'remove' && qty > adjCurrent) return toast.error(`Only ${adjCurrent} units in stock.`)
    setSaving(true)
    try {
      const reason = adjust.note.trim() ? `${adjust.reason} – ${adjust.note.trim()}` : adjust.reason
      const res = await applyStockChanges([{
        productId: adjust.productId, variantId: adjust.variantId,
        delta: adjust.dir === 'add' ? qty : -qty, type: 'adjustment', reason,
      }], stockCtx())
      if (res.skipped.length) toast.error('Could not adjust — this type no longer exists.')
      else {
        toast.success(`${adjust.dir === 'add' ? '+' : '−'}${qty} units recorded.`)
        setAdjust(null)
      }
    } catch (e) { toast.error('Adjust failed: ' + e.message) }
    setSaving(false)
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const list = useMemo(() => products.filter(p =>
    p.name.toLowerCase().includes(srch.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(srch.toLowerCase())
  ), [products, srch])

  const { totalVal, lowCount, outCount } = useMemo(() => {
    let val = 0, low = 0, out = 0
    for (const p of products) {
      const vs = variantsOf(variants, p.id)
      val += vs.length
        ? vs.reduce((a, v) => a + pricesFor(p, v).buy * v.stock, 0)
        : (p.buyPrice || 0) * (p.stock || 0)
      const st = productStatus(p, variants)
      if (st === 'low') low++
      if (st === 'out') out++
    }
    return { totalVal: val, lowCount: low, outCount: out }
  }, [products, variants])

  const STATUS    = { out: [RED, L.outOfStock], low: [AMB, L.lowStock], ok: [GRN, L.inStock] }
  const histRows  = (movements || []).filter(m => !histPid || m.productId === histPid)
  const needsSetup = !isDemo && !stockReady

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary }}>{L.products}</h1>
        <Btn onClick={openAdd}>{L.addProduct}</Btn>
      </div>

      {/* ── One-time setup notice ── */}
      {needsSetup && (
        <div style={{ background: AMB + '14', border: `1px solid ${AMB}55`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>
          <strong style={{ color: AMB }}>⚙️ One-time setup needed</strong> for product types and stock history.
          Open Supabase → SQL Editor, paste the file <code>supabase-stock-phase1.sql</code> and press Run, then reload the app.
          Everything else keeps working until then.
        </div>
      )}

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.totalProducts} value={products.length} color={T.accent} icon="📦" T={T} />
        <Stat label={L.stockValue}    value={cur(totalVal)}   color={BLU}      icon="💼" T={T} />
        <Stat label={L.lowStock}      value={lowCount}        color={AMB}      icon="⚠️" T={T} />
        <Stat label={L.outOfStock}    value={outCount}        color={RED}      icon="❌" T={T} />
      </div>

      {/* ── Table ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <input
          placeholder={L.searchProducts} value={srch}
          onChange={e => setSrch(e.target.value)}
          style={{ marginBottom: 14, maxWidth: 320 }}
        />
        <Tbl T={T} empty={L.noRecords}
          cols={[L.sku, L.productName, L.category, L.buy, L.sell, L.stock, L.status, L.actions]}
          rows={list.map(p => {
            const vs = variantsOf(variants, p.id)
            const [stColor, stLabel] = STATUS[productStatus(p, variants)]
            return [
              <span className="mono" style={{ color: T.textMuted, fontSize: 11 }}>{p.sku}</span>,
              <div>
                <div style={{ fontWeight: 500, color: T.textPrimary }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 11, color: T.textSecondary }}>{p.description}</div>}
                {vs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                    {vs.slice(0, 4).map(v => {
                      const c = { out: RED, low: AMB, ok: GRN }[statusOf(v.stock, v.reorderLevel)]
                      return (
                        <span key={v.id} style={{ fontSize: 10, background: c + '18', color: c, border: `1px solid ${c}44`, borderRadius: 5, padding: '1px 6px', fontWeight: 600 }}>
                          {v.name} · {v.stock}
                        </span>
                      )
                    })}
                    {vs.length > 4 && <span style={{ fontSize: 10, color: T.textMuted }}>+{vs.length - 4} more</span>}
                  </div>
                )}
              </div>,
              p.category ? <Badge color={PUR}>{p.category}</Badge> : <span style={{ color: T.textMuted }}>—</span>,
              <span className="mono" style={{ fontSize: 12, color: T.textPrimary }}>{cur(p.buyPrice)}</span>,
              <span className="mono" style={{ color: GRN, fontWeight: 600 }}>{cur(p.sellPrice)}</span>,
              <span className="mono" style={{ fontWeight: 600, color: T.textPrimary }}>{stockOf(p, variants)}</span>,
              <Badge color={stColor}>{stLabel}</Badge>,
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn small outline color={GRN} onClick={() => { setStockPid(p.id); setTypeForm(null) }}>Stock</Btn>
                <Btn small outline color={BLU} onClick={() => openEdit(p)}>{L.edit}</Btn>
                <Btn small outline color={RED} onClick={() => delProd(p.id)}>{L.delete}</Btn>
              </div>,
            ]
          })}
        />
      </div>

      {/* ── Stock history ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <span className="dm" style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Stock history</span>
          <select value={histPid} onChange={e => { setHistPid(e.target.value); setHistLimit(15) }} style={{ maxWidth: 220, fontSize: 13 }}>
            <option value="">All products</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <MovementTable rows={histRows.slice(0, histLimit)} T={T} />
        {histRows.length > histLimit && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Btn small outline color={T.textSecondary} onClick={() => setHistLimit(n => n + 20)}>
              Show more ({histRows.length - histLimit} left)
            </Btn>
          </div>
        )}
      </div>

      {/* ── Add / Edit product modal ── */}
      {show && (
        <Modal title={editId ? L.editProduct : L.addNewProduct} onClose={() => setShow(false)} T={T}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="g2">
            <Lbl label={L.productName + ' *'} col="1/-1" T={T}>
              <input value={form.name} onChange={e => sf('name', e.target.value)} />
            </Lbl>
            <Lbl label={L.category} T={T}>
              <input value={form.category} onChange={e => sf('category', e.target.value)} />
            </Lbl>
            <Lbl label={L.description} T={T}>
              <input value={form.description} onChange={e => sf('description', e.target.value)} />
            </Lbl>
            <Lbl label={L.buyPrice} T={T}>
              <input type="number" value={form.buyPrice} onChange={e => sf('buyPrice', e.target.value)} />
            </Lbl>
            <Lbl label={L.sellPrice + ' *'} T={T}>
              <input type="number" value={form.sellPrice} onChange={e => sf('sellPrice', e.target.value)} />
            </Lbl>
            <Lbl label={editId ? 'Units in stock' : (L.stockQty || 'Opening stock')} T={T}>
              <input type="number" value={form.stock} onChange={e => sf('stock', e.target.value)} disabled={!!editId} />
            </Lbl>
            <Lbl label="Reorder level" T={T}>
              <input type="number" min="0" value={form.reorderLevel} onChange={e => sf('reorderLevel', e.target.value)} />
            </Lbl>
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 10, lineHeight: 1.6 }}>
            {editId
              ? 'To change stock, close this and tap Stock → Adjust, so the change is recorded in the history.'
              : 'Selling sizes or colours? Save the product first, then tap Stock → Add type.'}
            {' '}Reorder level: the "low stock" warning shows when units fall to this number.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn outline color={T.textSecondary} onClick={() => setShow(false)}>{L.cancel}</Btn>
            <Btn onClick={saveProd} disabled={saving}>
              {saving ? 'Saving…' : editId ? L.saveChanges : L.addProduct}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── Stock screen: types + adjust + this product's history ── */}
      {stockPrd && (
        <Modal title={`Stock — ${stockPrd.name}`} onClose={() => { setStockPid(null); setTypeForm(null); setAdjust(null) }} T={T}>
          {(() => {
            const vs    = variantsOf(variants, stockPrd.id)
            const total = stockOf(stockPrd, variants)
            return (
              <>
                {/* Summary */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Total units</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{total}</div>
                  </div>
                  <div style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Types</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{vs.length || '—'}</div>
                  </div>
                </div>

                {/* Plain stock (no types yet) */}
                {vs.length === 0 && (
                  <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>No types — {stockPrd.stock} units</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>Reorder level: {stockPrd.reorderLevel ?? 3}</div>
                    </div>
                    <Btn small outline color={AMB} onClick={() => openAdjust(stockPrd, null)}>Adjust</Btn>
                  </div>
                )}

                {/* Types list */}
                {vs.map(v => {
                  const st = statusOf(v.stock, v.reorderLevel)
                  const [c, label] = STATUS[st]
                  const pr = pricesFor(stockPrd, v)
                  return (
                    <div key={v.id} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{v.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge color={c}>{label}</Badge>
                          <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: c }}>{v.stock}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>
                        Buy {cur(pr.buy)}{v.buyPrice == null ? ' (product)' : ''} · Sell {cur(pr.sell)}{v.sellPrice == null ? ' (product)' : ''} · Reorder at {v.reorderLevel}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Btn small outline color={AMB} onClick={() => openAdjust(stockPrd, v)}>Adjust</Btn>
                        <Btn small outline color={BLU} onClick={() => setTypeForm({ id: v.id, name: v.name, stock: '', buyPrice: v.buyPrice ?? '', sellPrice: v.sellPrice ?? '', reorderLevel: String(v.reorderLevel) })}>Edit</Btn>
                        <Btn small outline color={RED} onClick={() => removeType(v)}>Remove</Btn>
                      </div>
                    </div>
                  )
                })}

                {/* Add / edit type form */}
                {typeForm ? (
                  <div style={{ background: T.accent + '0c', border: `1px solid ${T.accent}44`, borderRadius: 10, padding: 14, marginTop: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 10 }}>
                      {typeForm.id ? 'Edit type' : 'Add type'}
                    </div>
                    {!typeForm.id && vs.length === 0 && stockPrd.stock > 0 && (
                      <div style={{ fontSize: 11, color: AMB, marginBottom: 10, lineHeight: 1.6 }}>
                        This product has {stockPrd.stock} units with no type. Once types exist, stock is counted per type —
                        enter the units for each type you add.
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="g2">
                      <Lbl label="Type name *" col="1/-1" T={T}>
                        <input value={typeForm.name} onChange={e => stf('name', e.target.value)} placeholder="e.g. Red, 42, Large" />
                      </Lbl>
                      {!typeForm.id && (
                        <Lbl label="Units in stock" T={T}>
                          <input type="number" min="0" value={typeForm.stock} onChange={e => stf('stock', e.target.value)} />
                        </Lbl>
                      )}
                      <Lbl label="Reorder level" T={T}>
                        <input type="number" min="0" value={typeForm.reorderLevel} onChange={e => stf('reorderLevel', e.target.value)} />
                      </Lbl>
                      <Lbl label="Buy price (optional)" T={T}>
                        <input type="number" min="0" value={typeForm.buyPrice} onChange={e => stf('buyPrice', e.target.value)} placeholder={String(stockPrd.buyPrice)} />
                      </Lbl>
                      <Lbl label="Sell price (optional)" T={T}>
                        <input type="number" min="0" value={typeForm.sellPrice} onChange={e => stf('sellPrice', e.target.value)} placeholder={String(stockPrd.sellPrice)} />
                      </Lbl>
                    </div>
                    <div style={{ fontSize: 10, color: T.textMuted, margin: '8px 0 12px' }}>
                      Leave a price empty to use the product's price.
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Btn small outline color={T.textSecondary} onClick={() => setTypeForm(null)}>{L.cancel}</Btn>
                      <Btn small onClick={saveType} disabled={saving}>{saving ? 'Saving…' : 'Save type'}</Btn>
                    </div>
                  </div>
                ) : (
                  <Btn full outline color={T.accent} onClick={() => setTypeForm({ ...blankType })} disabled={needsSetup} style={{ marginTop: 6 }}>
                    + Add type
                  </Btn>
                )}
                {needsSetup && <div style={{ fontSize: 11, color: AMB, marginTop: 6 }}>Types need the one-time database setup (notice on the Products page).</div>}

                {/* This product's history */}
                <div style={{ marginTop: 18, marginBottom: 6, fontSize: 12, fontWeight: 700, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Recent movements
                </div>
                <MovementTable rows={(movements || []).filter(m => m.productId === stockPrd.id).slice(0, 8)} T={T} />
              </>
            )
          })()}
        </Modal>
      )}

      {/* ── Adjust stock modal (opens above the Stock screen) ── */}
      {adjust && adjTarget?.product && (
        <Modal title="Adjust stock" onClose={() => setAdjust(null)} T={T}>
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>
              {adjTarget.product.name}{adjTarget.variant ? ` · ${adjTarget.variant.name}` : ''}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted }}>
              Now in stock: <strong className="mono" style={{ color: T.textPrimary }}>{adjCurrent}</strong>
            </div>
          </div>

          <Lbl label="Reason" T={T}>
            <select value={adjust.reason} onChange={e => pickReason(e.target.value)}>
              {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Lbl>

          <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
            {[['remove', '− Remove units', RED], ['add', '+ Add units', GRN]].map(([d, label, c]) => (
              <button key={d} onClick={() => af('dir', d)}
                style={{ flex: 1, padding: '10px 6px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  border: `2px solid ${adjust.dir === d ? c : T.border}`,
                  background: adjust.dir === d ? c + '18' : 'transparent',
                  color: adjust.dir === d ? c : T.textSecondary }}>
                {label}
              </button>
            ))}
          </div>

          <Lbl label="How many units?" T={T}>
            <input type="number" min="1" value={adjust.qty} onChange={e => af('qty', e.target.value)} placeholder="0" />
          </Lbl>
          <div style={{ height: 12 }} />
          <Lbl label="Note (optional)" T={T}>
            <input value={adjust.note} onChange={e => af('note', e.target.value)} placeholder="e.g. water damage" />
          </Lbl>

          {+adjust.qty > 0 && (
            <div style={{ marginTop: 14, fontSize: 13, color: T.textSecondary, textAlign: 'center' }}>
              {adjCurrent} → <strong className="mono" style={{ color: adjust.dir === 'add' ? GRN : RED }}>
                {Math.max(0, adjCurrent + (adjust.dir === 'add' ? 1 : -1) * Math.trunc(+adjust.qty))}
              </strong> units
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn outline color={T.textSecondary} onClick={() => setAdjust(null)}>{L.cancel}</Btn>
            <Btn onClick={saveAdjust} disabled={saving}>{saving ? 'Saving…' : 'Save adjustment'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
