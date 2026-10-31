// ─── Expenses.jsx ─────────────────────────────────────────────────────────────
// Clean modal layout — restocking panel shows:
//   In Stock · Single Price · Total Expenses inputs + auto-calc total
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { apiExpenses, apiProducts, apiStock } from '../utils/supabase.js'
import { saveOffline } from '../utils/offlineQueue.js'
import { RED, AMB, BLU, PUR, GRN, EXP_CATS } from '../data/constants.js'
import { todayStr, fmtD, thisMonthRange, inRange } from '../utils/helpers.js'
import { Badge, Btn, Modal, Field, Stat, Tbl, Icon } from '../components/UI.jsx'
import { toast } from '../utils/toast.jsx'
import { applyStockChanges, hasTypes, variantsOf, stockOf, pricesFor } from '../utils/stock.js'

const Lbl = Field

// ── Divider with label ────────────────────────────────────────────────────────
const Divider = ({ label, T }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, margin:'4px 0 2px' }}>
    <div style={{ flex:1, height:1, background:T.border }} />
    <span style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:.6 }}>{label}</span>
    <div style={{ flex:1, height:1, background:T.border }} />
  </div>
)

// ── Mini info tile ────────────────────────────────────────────────────────────
const InfoTile = ({ label, value, color, T }) => (
  <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:9, padding:'8px 12px', flex:1, minWidth:80 }}>
    <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>{label}</div>
    <div className="mono" style={{ fontSize:15, fontWeight:800, color:color||T.textPrimary }}>{value}</div>
  </div>
)

export default function Expenses({ expenses, setExpenses, products, setProducts, variants, setVariants, setMovements, stockReady, userId, T, L, cur, isDemo, demoApi }) {
  const [show,   setShow]   = useState(false)
  const [saving, setSaving] = useState(false)

  const blank = { desc:'', category:'', amount:'', date:todayStr(), notes:'', restockProductId:'', restockVariantId:'', restockQty:1, restockUnitPrice:0 }
  const [form, setForm] = useState(blank)
  const sf = (k,v) => setForm(f => ({ ...f, [k]:v }))

  const isRestocking        = form.category === 'Restocking'
  const selectedProduct     = products.find(p => p.id === form.restockProductId)
  const typed               = selectedProduct ? hasTypes(variants, selectedProduct.id) : false
  const selectedVariant     = form.restockVariantId ? variants.find(v => v.id === form.restockVariantId) : null
  const ready               = !!selectedProduct && (!typed || !!selectedVariant)   // typed products need a type first
  const prices              = selectedProduct ? pricesFor(selectedProduct, selectedVariant) : { buy: 0, sell: 0 }
  const currentStock        = selectedProduct ? (selectedVariant ? selectedVariant.stock : stockOf(selectedProduct, variants)) : 0
  const restockTotal        = +form.restockQty * +form.restockUnitPrice
  const newStockAfterRestock = selectedProduct ? currentStock + (+form.restockQty || 0) : 0

  // ── Select restocking product — auto-fill fields ──────────────────────────
  const selectRestockProduct = productId => {
    const p = products.find(p => p.id === productId)
    setForm(f => ({
      ...f,
      restockProductId: productId,
      restockVariantId: '',
      desc:             p ? `Restocking: ${p.name}` : f.desc,
      // Products with types wait for a type; their price is filled in once chosen
      restockUnitPrice: p && !hasTypes(variants, p.id) ? (p.buyPrice || 0) : 0,
      amount:           p && !hasTypes(variants, p.id) ? String(f.restockQty * (p.buyPrice || 0)) : f.amount,
    }))
  }

  const selectRestockVariant = variantId => {
    const p = products.find(x => x.id === form.restockProductId)
    const v = variants.find(x => x.id === variantId)
    setForm(f => {
      const price = p ? pricesFor(p, v).buy : 0
      return {
        ...f,
        restockVariantId: variantId,
        desc:             p && v ? `Restocking: ${p.name} · ${v.name}` : f.desc,
        restockUnitPrice: price,
        amount:           String((+f.restockQty || 0) * price),
      }
    })
  }

  // ── Restock qty/price change → recalc total ───────────────────────────────
  const updateRestock = (field, val) => {
    setForm(f => {
      const qty   = field === 'restockQty'       ? +val : +f.restockQty
      const price = field === 'restockUnitPrice' ? +val : +f.restockUnitPrice
      return { ...f, [field]: +val, amount: String(qty * price) }
    })
  }

  // ── Allow manual total edit ───────────────────────────────────────────────
  const handleTotalEdit = val => {
    setForm(f => ({ ...f, amount: val }))
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveExp = async () => {
    if (!form.desc)   return toast.error('Description is required.')
    if (!form.amount) return toast.error('Amount is required.')
    if (isRestocking && !form.restockProductId) return toast.error('Select a product to restock.')
    if (isRestocking && typed && !form.restockVariantId) return toast.error('Choose which type you are restocking.')
    setSaving(true)
    try {
      const payload = { description: form.desc, category: form.category, amount: +form.amount, date: form.date, notes: form.notes }
      let created
      if (isDemo) {
        created = demoApi.expenses.create(payload)
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        created = await saveOffline('expenses', { ...payload, userId })
        toast.info('📡 Offline — expense saved on this phone and will sync when reconnected.')
      } else {
        created = await apiExpenses.create(payload, userId)
      }
      // Restock: add the units to the exact product / type, log it, keep the latest buy price
      const qty = Math.trunc(+form.restockQty || 0)
      if (isRestocking && form.restockProductId && qty > 0) {
        const prod     = products.find(p => p.id === form.restockProductId)
        const variant  = form.restockVariantId ? variants.find(v => v.id === form.restockVariantId) : null
        const unitCost = +form.restockUnitPrice || 0
        const offline  = !isDemo && typeof navigator !== 'undefined' && !navigator.onLine
        try {
          await applyStockChanges([{
            productId: form.restockProductId, variantId: form.restockVariantId || null,
            delta: qty, type: 'restock', unitCost: unitCost || null, reason: form.desc,
          }], { products, variants, userId, isDemo, offline, stockReady, setProducts, setVariants, setMovements })

          // Latest buy price → future sales calculate profit from it
          if (prod && unitCost > 0 && unitCost !== pricesFor(prod, variant).buy && !offline) {
            if (variant) {
              if (!isDemo) await apiStock.setVariantBuyPrice(variant.id, unitCost)
              setVariants(vs => vs.map(v => v.id === variant.id ? { ...v, buyPrice: unitCost } : v))
            } else {
              if (!isDemo) await apiProducts.setBuyPrice(prod.id, unitCost)
              setProducts(ps => ps.map(p => p.id === prod.id ? { ...p, buyPrice: unitCost } : p))
            }
          }
        } catch (e) {
          toast.warn('Expense saved, but stock was not updated (' + e.message + '). Use Products → Stock → Adjust.')
        }
      }
      setExpenses(es => [created, ...es])
      setShow(false); setForm(blank)
    } catch(e) { toast.error('Save failed: ' + e.message) }
    setSaving(false)
  }

  const del = async id => {
    const _ok = await toast.confirm('Delete this expense?')
    if (!_ok) return
    try {
      isDemo ? demoApi.expenses.delete(id) : await apiExpenses.delete(id)
      setExpenses(es => es.filter(e => e.id !== id))
    } catch(e) { toast.error('Delete failed: ' + e.message) }
  }

  const todayTot = expenses.filter(e => e.date === todayStr()).reduce((a,e) => a + e.amount, 0)
  const monthTot = expenses.filter(e => inRange(e.date, thisMonthRange())).reduce((a,e) => a + e.amount, 0)

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 className="dm" style={{ fontSize:24, fontWeight:700, color:T.textPrimary }}>{L.expenses}</h1>
        <Btn onClick={() => setShow(true)} icon="plus">{L.addExpense}</Btn>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.today}        value={cur(todayTot)}   color={RED} icon="trending-down" T={T} />
        <Stat label={L.thisMonth}    value={cur(monthTot)}   color={AMB} icon="clock"         T={T} />
        <Stat label={L.transactions} value={expenses.length} color={BLU} icon="file"          T={T} />
      </div>

      {/* ── Expenses table ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:16 }}>
        <Tbl T={T} empty={L.noRecords}
          cols={[L.date, L.expDescription, L.expCategory, L.expenseAmount, L.notes, '']}
          rows={expenses.map(e => [
            <span style={{ fontSize:12, color:T.textSecondary, whiteSpace:'nowrap' }}>{fmtD(e.date)}</span>,
            <span style={{ fontWeight:500, color:T.textPrimary }}>{e.description}</span>,
            e.category ? <Badge color={e.category==='Restocking' ? GRN : PUR}>{e.category}</Badge> : <span style={{ color:T.textMuted }}>—</span>,
            <span className="mono" style={{ color:RED, fontWeight:600 }}>{cur(e.amount)}</span>,
            <span style={{ fontSize:12, color:T.textSecondary }}>{e.notes || '—'}</span>,
            <Btn small outline color={RED} icon="trash" onClick={() => del(e.id)}>{L.delete}</Btn>,
          ])}
        />
      </div>

      {/* ── Add Expense Modal ── */}
      {show && (
        <Modal title={L.addExpenseTitle || 'Add Expense'} onClose={() => { setShow(false); setForm(blank) }} T={T}>

          {/* ── Category (always first) ── */}
          <Lbl label={L.expCategory} T={T}>
            <select value={form.category} onChange={e => { sf('category', e.target.value); if (e.target.value !== 'Restocking') sf('restockProductId','') }} style={{ fontSize:13 }}>
              <option value="">{L.selectCategory || 'Select category...'}</option>
              {EXP_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Lbl>

          {/* ══ RESTOCKING PANEL ══════════════════════════════════════════ */}
          {isRestocking && (
            <div style={{ background:GRN+'0a', border:`1.5px solid ${GRN}44`, borderRadius:14, padding:14, marginTop:10 }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:GRN+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="package" size={14} color={GRN} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:GRN }}>Restocking</div>
                  <div style={{ fontSize:10, color:T.textMuted }}>Auto-updates product stock on save</div>
                </div>
              </div>

              {/* Product select */}
              <Lbl label={L.restockingProduct || 'Product'} T={T}>
                <select value={form.restockProductId} onChange={e => selectRestockProduct(e.target.value)} style={{ fontSize:13 }}>
                  <option value="">-- Choose product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Lbl>

              {/* Product info tiles — In Stock, Buy Price, Sell Price */}
              {selectedProduct && (
                <>
                  {typed && (
                    <div style={{ marginTop:12 }}>
                      <Lbl label="Type *" T={T}>
                        <select value={form.restockVariantId} onChange={e => selectRestockVariant(e.target.value)} style={{ fontSize:13 }}>
                          <option value="">-- Choose type --</option>
                          {variantsOf(variants, selectedProduct.id).map(v => (
                            <option key={v.id} value={v.id}>{v.name} — {v.stock} in stock</option>
                          ))}
                        </select>
                      </Lbl>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, marginTop:12, marginBottom:14 }}>
                    <InfoTile label="In Stock"   value={currentStock}      color={currentStock > 5 ? GRN : currentStock > 0 ? AMB : RED} T={T} />
                    <InfoTile label="Buy Price"  value={cur(prices.buy)}   color={AMB} T={T} />
                    <InfoTile label="Sell Price" value={cur(prices.sell)}  color={GRN} T={T} />
                  </div>

                  {!ready && (
                    <div style={{ fontSize:12, color:T.textMuted, textAlign:'center', padding:'4px 0 6px' }}>
                      Choose a type to continue.
                    </div>
                  )}
                  {ready && (<>
                  <Divider label="Restock details" T={T} />

                  {/* Qty + Unit Price side by side */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10, marginBottom:10 }}>
                    <Lbl label={L.restockingQty || 'Qty to Add'} T={T}>
                      <input type="number" min="1" value={form.restockQty}
                        onChange={e => updateRestock('restockQty', e.target.value)}
                        style={{ fontSize:15, fontWeight:700 }} />
                    </Lbl>
                    <Lbl label={L.restockingPrice || 'Unit Price'} T={T}>
                      <input type="number" min="0" value={form.restockUnitPrice}
                        onChange={e => updateRestock('restockUnitPrice', e.target.value)}
                        style={{ fontSize:15 }} />
                    </Lbl>
                  </div>

                  <Divider label="Total expense" T={T} />

                  {/* Total Expenses — editable, auto-calc from qty × price */}
                  <div style={{ marginTop:10 }}>
                    <Lbl label="Total Expenses (auto-calculated)" T={T}>
                      <div style={{ position:'relative' }}>
                        <input type="number" value={form.amount}
                          onChange={e => handleTotalEdit(e.target.value)}
                          style={{ fontSize:20, fontWeight:800, color:T.accent, paddingRight:80 }} />
                        <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:11, color:T.textMuted, fontWeight:600 }}>
                          {form.restockQty} × {cur(form.restockUnitPrice)}
                        </span>
                      </div>
                    </Lbl>
                  </div>

                  {+form.restockUnitPrice > 0 && +form.restockUnitPrice !== prices.buy && (
                    <div style={{ fontSize:11, color:AMB, marginTop:10, lineHeight:1.5 }}>
                      Buy price{selectedVariant ? ` for ${selectedVariant.name}` : ''} will update from {cur(prices.buy)} to {cur(+form.restockUnitPrice)} —
                      new sales use it to work out profit.
                    </div>
                  )}

                  {/* After-restock preview */}
                  <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:9, padding:'8px 12px' }}>
                      <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Current Stock</div>
                      <div className="mono" style={{ fontSize:16, fontWeight:800, color:T.textPrimary }}>{currentStock}</div>
                    </div>
                    <div style={{ background:GRN+'18', border:`1px solid ${GRN}44`, borderRadius:9, padding:'8px 12px' }}>
                      <div style={{ fontSize:9, color:GRN, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>After Restock</div>
                      <div className="mono" style={{ fontSize:16, fontWeight:800, color:GRN }}>+{form.restockQty} → {newStockAfterRestock}</div>
                    </div>
                  </div>
                  </>)}
                </>
              )}
            </div>
          )}

          {/* ── Non-restocking fields ── */}
          <div style={{ marginTop:12, display:'grid', gap:10 }}>

            {/* Description */}
            <Lbl label={L.expDescription + ' *'} T={T}>
              <input value={form.desc} onChange={e => sf('desc', e.target.value)}
                placeholder={isRestocking ? 'Auto-filled from product name' : 'e.g. Packaging materials'}
                style={{ fontSize:13 }} />
            </Lbl>

            {/* Amount (only shown standalone if NOT restocking) + Date */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }} className="g2">
              {!isRestocking && (
                <Lbl label={L.expenseAmount + ' *'} T={T}>
                  <input type="number" value={form.amount} onChange={e => sf('amount', e.target.value)}
                    placeholder="0.00" style={{ fontSize:14 }} />
                </Lbl>
              )}
              <Lbl label={L.date} T={T} col={isRestocking ? '1 / -1' : undefined}>
                <input type="date" value={form.date} onChange={e => sf('date', e.target.value)} style={{ fontSize:13 }} />
              </Lbl>
            </div>

            {/* Notes */}
            <Lbl label={L.notes + ' (optional)'} T={T}>
              <textarea value={form.notes} onChange={e => sf('notes', e.target.value)}
                rows={2} style={{ resize:'none', fontSize:13 }} />
            </Lbl>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <Btn outline color={T.textSecondary} onClick={() => { setShow(false); setForm(blank) }} style={{ flex:1, justifyContent:'center' }}>
              {L.cancel}
            </Btn>
            <Btn onClick={saveExp} disabled={saving} icon={isRestocking ? 'package' : 'download'} style={{ flex:2, justifyContent:'center' }}>
              {saving ? 'Saving…' : isRestocking && form.restockProductId ? '✅ Save & Update Stock' : L.save}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
