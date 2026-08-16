// ─── Products.jsx ─────────────────────────────────────────────────────────────
// Product catalog — add, edit, delete products. Tracks stock, buy/sell price.
// To modify: add more fields, change SKU format, add image upload.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { apiProducts } from '../utils/supabase.js'
import { GRN, RED, AMB, BLU, PUR } from '../data/constants.js'
import { Badge, Btn, Modal, Field, Stat, Tbl } from '../components/UI.jsx'

const Lbl = Field

export default function Products({ products, setProducts, userId, T, L, cur }) {
  const [show,   setShow]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [srch,   setSrch]   = useState('')

  const blank = { name: '', category: '', buyPrice: '', sellPrice: '', stock: '', description: '' }
  const [form, setForm] = useState(blank)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Open add / edit modal ──────────────────────────────────────────────────
  const openAdd  = () => { setEditId(null); setForm(blank); setShow(true) }
  const openEdit = p  => {
    setEditId(p.id)
    setForm({ name: p.name, category: p.category || '', buyPrice: p.buyPrice, sellPrice: p.sellPrice, stock: p.stock, description: p.description || '' })
    setShow(true)
  }

  // ── Save (create or update) ────────────────────────────────────────────────
  const saveProd = async () => {
    if (!form.name || !form.sellPrice) return
    setSaving(true)
    try {
      const payload = {
        name: form.name, category: form.category, description: form.description,
        buyPrice: +form.buyPrice, sellPrice: +form.sellPrice, stock: +form.stock,
      }
      if (editId) {
        await apiProducts.update(editId, payload)
        setProducts(ps => ps.map(p => p.id === editId ? { ...p, ...payload } : p))
      } else {
        const sku     = 'RSL-' + String(products.length + 1).padStart(4, '0')
        const created = await apiProducts.create({ ...payload, sku }, userId)
        setProducts(ps => [created, ...ps])
      }
      setShow(false)
    } catch (e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const delProd = async id => {
    if (!confirm('Delete this product?')) return
    try { await apiProducts.delete(id); setProducts(ps => ps.filter(p => p.id !== id)) }
    catch (e) { alert('Delete failed: ' + e.message) }
  }

  const list     = products.filter(p =>
    p.name.toLowerCase().includes(srch.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(srch.toLowerCase())
  )
  const totalVal = products.reduce((a, p) => a + (p.buyPrice * p.stock), 0)

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary }}>{L.products}</h1>
        <Btn onClick={openAdd}>{L.addProduct}</Btn>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.totalProducts} value={products.length}                                     color={T.accent} icon="📦" T={T} />
        <Stat label={L.stockValue}    value={cur(totalVal)}                                       color={BLU}      icon="💼" T={T} />
        <Stat label={L.lowStock}      value={products.filter(p => p.stock <= 3 && p.stock > 0).length} color={AMB} icon="⚠️" T={T} />
        <Stat label={L.outOfStock}    value={products.filter(p => p.stock === 0).length}          color={RED}      icon="❌" T={T} />
      </div>

      {/* ── Table ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <input
          placeholder={L.searchProducts} value={srch}
          onChange={e => setSrch(e.target.value)}
          style={{ marginBottom: 14, maxWidth: 320 }}
        />
        <Tbl T={T} empty={L.noRecords}
          cols={[L.sku, L.productName, L.category, L.buy, L.sell, L.stock, L.status, L.actions]}
          rows={list.map(p => [
            <span className="mono" style={{ color: T.textMuted, fontSize: 11 }}>{p.sku}</span>,
            <div>
              <div style={{ fontWeight: 500, color: T.textPrimary }}>{p.name}</div>
              {p.description && <div style={{ fontSize: 11, color: T.textSecondary }}>{p.description}</div>}
            </div>,
            p.category ? <Badge color={PUR}>{p.category}</Badge> : <span style={{ color: T.textMuted }}>—</span>,
            <span className="mono" style={{ fontSize: 12, color: T.textPrimary }}>{cur(p.buyPrice)}</span>,
            <span className="mono" style={{ color: GRN, fontWeight: 600 }}>{cur(p.sellPrice)}</span>,
            <span className="mono" style={{ fontWeight: 600, color: T.textPrimary }}>{p.stock}</span>,
            p.stock === 0
              ? <Badge color={RED}>{L.outOfStock}</Badge>
              : p.stock <= 3
                ? <Badge color={AMB}>{L.lowStock}</Badge>
                : <Badge color={GRN}>{L.inStock}</Badge>,
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn small outline color={BLU} onClick={() => openEdit(p)}>{L.edit}</Btn>
              <Btn small outline color={RED} onClick={() => delProd(p.id)}>{L.delete}</Btn>
            </div>,
          ])}
        />
      </div>

      {/* ── Add / Edit modal ── */}
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
            <Lbl label={L.stockQty} col="1/-1" T={T}>
              <input type="number" value={form.stock} onChange={e => sf('stock', e.target.value)} />
            </Lbl>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn outline color={T.textSecondary} onClick={() => setShow(false)}>{L.cancel}</Btn>
            <Btn onClick={saveProd} disabled={saving}>
              {saving ? 'Saving…' : editId ? L.saveChanges : L.addProduct}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
